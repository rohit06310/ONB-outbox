import { Worker, Job } from 'bullmq';
import { EmailJobData } from '../queues/emailQueue';
import { getRedisClient } from '../config/redis';
import { env } from '../config/env';
import prisma from '../config/database';
import { sendEmail } from '../services/emailService';
import { indexEmail } from '../services/elasticsearchService';
import { checkAndIncrementRateLimit, nextHourStart } from '../services/rateLimitService';
import { notifyRateLimit } from '../services/slackService';

let worker: Worker<EmailJobData> | null = null;

export function startEmailWorker(): void {
  worker = new Worker<EmailJobData>(
    'email-jobs',
    async (job: Job<EmailJobData>) => {
      const { emailJobId, fromEmail, toEmail, subject, body, userId, hourlyLimit } = job.data;

      console.log(`🔄  Processing job ${job.id} → ${toEmail}`);

      // ── 1. Idempotency check ────────────────────────────────────────────────
      const dbJob = await prisma.emailJob.findUnique({ where: { id: emailJobId } });

      if (!dbJob) {
        console.warn(`⚠️   DB record not found for job ${emailJobId} — skipping`);
        return;
      }

      if (dbJob.status === 'SENT' || dbJob.status === 'CANCELLED') {
        console.log(`⏭️   Job ${emailJobId} already ${dbJob.status} — skipping`);
        return;
      }

      // ── 2. Rate limit check ─────────────────────────────────────────────────
      const { allowed, count, resetAt } = await checkAndIncrementRateLimit(
        fromEmail,
        hourlyLimit
      );

      if (!allowed) {
        const windowKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
        const delayMs   = resetAt!.getTime() - Date.now();

        console.warn(
          `🚦  Rate limit hit for ${fromEmail} (count: ${count}/${hourlyLimit}) — ` +
          `rescheduling to ${resetAt!.toISOString()}`
        );

        // Notify via Slack (no-op if not connected)
        await notifyRateLimit(userId, fromEmail, windowKey, hourlyLimit);

        // Reschedule to next hour window — job is NOT dropped
        await job.moveToDelayed(resetAt!.getTime(), job.token);
        return;
      }

      // ── 3. Mark as PROCESSING ───────────────────────────────────────────────
      await prisma.emailJob.update({
        where:  { id: emailJobId },
        data:   { status: 'PROCESSING' },
      });

      // ── 4. Send email via Ethereal ──────────────────────────────────────────
      try {
        const result = await sendEmail({ fromEmail, toEmail, subject, body });

        // ── 5. Update DB to SENT ──────────────────────────────────────────────
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status:     'SENT',
            sentAt:     new Date(),
            previewUrl: result.previewUrl,
          },
        });

        // ── 6. Index in Elasticsearch ─────────────────────────────────────────
        const updated = await prisma.emailJob.findUnique({ where: { id: emailJobId } });
        if (updated) {
          await indexEmail({
            id:          updated.id,
            userId:      updated.userId,
            fromEmail:   updated.fromEmail,
            toEmail:     updated.toEmail,
            subject:     updated.subject,
            body:        updated.body,
            status:      updated.status,
            scheduledAt: updated.scheduledAt.toISOString(),
            sentAt:      updated.sentAt?.toISOString(),
            createdAt:   updated.createdAt.toISOString(),
            batchId:     updated.batchId ?? undefined,
          });
        }

        console.log(`✅  Job ${emailJobId} sent successfully`);
      } catch (err: any) {
        // ── 7. Mark as FAILED on error ────────────────────────────────────────
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status:       'FAILED',
            errorMessage: err.message,
          },
        });

        console.error(`❌  Job ${emailJobId} failed:`, err.message);
        throw err; // Re-throw so BullMQ handles retries via backoff config
      }
    },
    {
      connection: getRedisClient(),
      concurrency: env.worker.concurrency,
      // Min 2 seconds between job starts globally
      limiter: {
        max:      1,
        duration: env.worker.minDelayMs,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅  BullMQ job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌  BullMQ job ${job?.id} failed:`, err.message);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`⚠️   BullMQ job ${jobId} stalled`);
  });

  console.log(
    `🚀  BullMQ worker started | concurrency: ${env.worker.concurrency} | ` +
    `min delay: ${env.worker.minDelayMs}ms`
  );
}

export async function stopEmailWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('🛑  BullMQ worker stopped');
  }
}
