import './config/env'; // Validate env vars first — exits if invalid
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env';
import { ensureESIndex } from './config/elasticsearch';

import authRouter   from './routes/auth';
import emailsRouter from './routes/emails';
import slackRouter  from './routes/slack';

import { getEmailQueue } from './queues/emailQueue';
import { startEmailWorker, stopEmailWorker } from './workers/emailWorker';
import { reconcileScheduledJobs } from './services/reconcileService';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ── Security & Parsing Middleware ────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Needed for Bull Board
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin:      env.frontendUrl,
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// ── Bull Board Dashboard ─────────────────────────────────────────────────────
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues:  [new BullMQAdapter(getEmailQueue())],
  serverAdapter,
});

// Basic HTTP auth for the Bull Board
app.use(
  '/admin/queues',
  (req, res, next) => {
    const b64 = (req.headers.authorization ?? '').replace('Basic ', '');
    const [user, pass] = Buffer.from(b64, 'base64').toString().split(':');
    if (user === env.bullBoard.username && pass === env.bullBoard.password) {
      return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
    res.status(401).send('Authentication required');
  },
  serverAdapter.getRouter()
);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth',       authRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/slack',  slackRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    service: 'email-scheduler',
    time:    new Date().toISOString(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

// ── Startup ──────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    // Ensure Elasticsearch index exists
    await ensureESIndex();

    // Start BullMQ worker
    startEmailWorker();

    // Re-enqueue any jobs that were in the DB but lost from Redis
    await reconcileScheduledJobs();

    // Start HTTP server
    app.listen(env.port, () => {
      console.log(`\n🚀  Server running on http://localhost:${env.port}`);
      console.log(`📊  Bull Board  → http://localhost:${env.port}/admin/queues`);
      console.log(`🏥  Health      → http://localhost:${env.port}/health`);
      console.log(`🌍  CORS origin → ${env.frontendUrl}\n`);
    });
  } catch (err) {
    console.error('❌  Bootstrap failed:', err);
    process.exit(1);
  }
}

// ── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('\n🛑  SIGTERM received — shutting down gracefully...');
  await stopEmailWorker();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑  SIGINT received — shutting down gracefully...');
  await stopEmailWorker();
  process.exit(0);
});

bootstrap();
