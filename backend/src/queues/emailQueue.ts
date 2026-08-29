import { Queue, QueueOptions } from 'bullmq';
import { getRedisClient } from '../config/redis';

export interface EmailJobData {
  emailJobId: string;    // Our DB primary key — used as BullMQ jobId for idempotency
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  userId: string;
  delayBetweenMs: number;
  hourlyLimit: number;
  batchId?: string;
}

const queueOptions: QueueOptions = {
  connection: getRedisClient(),
  defaultJobOptions: {
    removeOnComplete: false,   // Keep completed jobs visible in Bull Board
    removeOnFail: false,       // Keep failed jobs for debugging
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
};

// Singleton queue instance
let emailQueue: Queue<EmailJobData> | null = null;

export function getEmailQueue(): Queue<EmailJobData> {
  if (!emailQueue) {
    emailQueue = new Queue<EmailJobData>('email-jobs', queueOptions);
    console.log('✅  BullMQ email-jobs queue initialized');
  }
  return emailQueue;
}

/**
 * Schedule an email job in BullMQ.
 * Uses emailJobId as the BullMQ jobId — this ensures idempotency:
 * re-adding the same jobId is a no-op in BullMQ.
 */
export async function scheduleEmailJob(
  data: EmailJobData,
  scheduledAt: Date
): Promise<void> {
  const queue = getEmailQueue();
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());

  await queue.add('send-email', data, {
    jobId: data.emailJobId,   // Idempotent — BullMQ deduplicates by jobId
    delay,
  });
}

/**
 * Cancel a scheduled email job in BullMQ.
 */
export async function cancelEmailJob(jobId: string): Promise<void> {
  const queue = getEmailQueue();
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
  }
}

export async function closeEmailQueue(): Promise<void> {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
  }
}
