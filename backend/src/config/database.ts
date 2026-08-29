import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple Prisma clients in development hot-reload
const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

prisma.$connect().then(() => {
  console.log('✅  PostgreSQL connected via Prisma');
}).catch((err) => {
  console.error('❌  Prisma connection error:', err.message);
  process.exit(1);
});

export default prisma;
