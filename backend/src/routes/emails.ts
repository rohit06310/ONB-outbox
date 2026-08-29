import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth';
import prisma from '../config/database';
import { scheduleEmailJob, cancelEmailJob } from '../queues/emailQueue';
import { indexEmail } from '../services/elasticsearchService';
import { searchEmails } from '../services/elasticsearchService';

const router = Router();

// All email routes require auth
router.use(requireAuth);

// ─── POST /api/emails/schedule ───────────────────────────────────────────────
/**
 * Schedule one or more emails.
 * Body: {
 *   fromEmail: string,
 *   recipients: string[],         // array of "to" addresses (from CSV parse)
 *   subject: string,
 *   body: string,
 *   scheduledAt: string,          // ISO datetime for FIRST email
 *   delayBetweenMs?: number,      // ms between consecutive emails (default 2000)
 *   hourlyLimit?: number,         // per-sender hourly cap (default 50)
 * }
 */
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const {
      fromEmail,
      recipients,
      subject,
      body,
      scheduledAt,
      delayBetweenMs = 2000,
      hourlyLimit = 50,
    } = req.body;

    // Validation
    if (!fromEmail || !recipients?.length || !subject || !body || !scheduledAt) {
      res.status(400).json({
        error: 'fromEmail, recipients, subject, body, and scheduledAt are required',
      });
      return;
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ error: 'recipients must be a non-empty array' });
      return;
    }

    const startTime = new Date(scheduledAt);
    if (isNaN(startTime.getTime())) {
      res.status(400).json({ error: 'scheduledAt must be a valid ISO date' });
      return;
    }

    const batchId = uuidv4();
    const userId  = req.authUser!.userId;
    const jobs    = [];

    for (let i = 0; i < recipients.length; i++) {
      const toEmail       = recipients[i].trim();
      const emailScheduledAt = new Date(startTime.getTime() + i * delayBetweenMs);
      const emailJobId    = uuidv4();

      // 1. Save to DB first (source of truth)
      const dbJob = await prisma.emailJob.create({
        data: {
          id:             emailJobId,
          userId,
          fromEmail,
          toEmail,
          subject,
          body,
          scheduledAt:    emailScheduledAt,
          status:         'SCHEDULED',
          bullJobId:      emailJobId,  // Same as ID for idempotency
          delayBetweenMs,
          hourlyLimit,
          batchId,
        },
      });

      // 2. Schedule in BullMQ (idempotent via jobId)
      await scheduleEmailJob(
        {
          emailJobId,
          fromEmail,
          toEmail,
          subject,
          body,
          userId,
          delayBetweenMs,
          hourlyLimit,
          batchId,
        },
        emailScheduledAt
      );

      // 3. Index in Elasticsearch
      await indexEmail({
        id:          dbJob.id,
        userId:      dbJob.userId,
        fromEmail:   dbJob.fromEmail,
        toEmail:     dbJob.toEmail,
        subject:     dbJob.subject,
        body:        dbJob.body,
        status:      dbJob.status,
        scheduledAt: dbJob.scheduledAt.toISOString(),
        createdAt:   dbJob.createdAt.toISOString(),
        batchId:     dbJob.batchId ?? undefined,
      });

      jobs.push(dbJob);
    }

    res.status(201).json({
      message: `${jobs.length} email(s) scheduled successfully`,
      batchId,
      count:   jobs.length,
      jobs:    jobs.map((j) => ({
        id:          j.id,
        toEmail:     j.toEmail,
        scheduledAt: j.scheduledAt,
        status:      j.status,
      })),
    });
  } catch (err: any) {
    console.error('Schedule error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/emails/scheduled ───────────────────────────────────────────────
router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const page  = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip  = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      prisma.emailJob.findMany({
        where:   { userId: req.authUser!.userId, status: { in: ['SCHEDULED', 'PROCESSING'] } },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take:    limit,
      }),
      prisma.emailJob.count({
        where: { userId: req.authUser!.userId, status: { in: ['SCHEDULED', 'PROCESSING'] } },
      }),
    ]);

    res.json({
      jobs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/emails/sent ────────────────────────────────────────────────────
router.get('/sent', async (req: Request, res: Response) => {
  try {
    const page  = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip  = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      prisma.emailJob.findMany({
        where:   { userId: req.authUser!.userId, status: { in: ['SENT', 'FAILED'] } },
        orderBy: { sentAt: 'desc' },
        skip,
        take:    limit,
      }),
      prisma.emailJob.count({
        where: { userId: req.authUser!.userId, status: { in: ['SENT', 'FAILED'] } },
      }),
    ]);

    res.json({
      jobs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/emails/search ──────────────────────────────────────────────────
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query  = req.query.q as string;
    const status = req.query.status as string | undefined;
    const from   = parseInt(req.query.from as string) || 0;
    const size   = parseInt(req.query.size as string) || 20;

    if (!query) {
      res.status(400).json({ error: 'q (query) param is required' });
      return;
    }

    const result = await searchEmails(req.authUser!.userId, query, status, from, size);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/emails/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const job = await prisma.emailJob.findFirst({
      where: { id: req.params.id as string, userId: req.authUser!.userId },
    });

    if (!job) {
      res.status(404).json({ error: 'Email job not found' });
      return;
    }

    res.json({ job });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/emails/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const job = await prisma.emailJob.findFirst({
      where: { id: req.params.id as string, userId: req.authUser!.userId },
    });

    if (!job) {
      res.status(404).json({ error: 'Email job not found' });
      return;
    }

    if (job.status !== 'SCHEDULED') {
      res.status(400).json({ error: `Cannot cancel a job with status "${job.status}"` });
      return;
    }

    // Remove from BullMQ
    await cancelEmailJob(job.id);

    // Update DB
    await prisma.emailJob.update({
      where: { id: job.id },
      data:  { status: 'CANCELLED' },
    });

    res.json({ message: 'Email job cancelled' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/emails/stats/overview ─────────────────────────────────────────
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const [scheduled, sent, failed] = await Promise.all([
      prisma.emailJob.count({ where: { userId: req.authUser!.userId, status: { in: ['SCHEDULED', 'PROCESSING'] } } }),
      prisma.emailJob.count({ where: { userId: req.authUser!.userId, status: 'SENT' } }),
      prisma.emailJob.count({ where: { userId: req.authUser!.userId, status: 'FAILED' } }),
    ]);

    res.json({ scheduled, sent, failed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
