import prisma from '../config/database';
import { getEmailQueue, scheduleEmailJob } from '../queues/emailQueue';

/**
 * On server startup, reconcile DB scheduled jobs with BullMQ.
 *
 * How it works:
 * 1. Query DB for all SCHEDULED jobs with scheduledAt in the future.
 * 2. For each, check if BullMQ still has the job (it survives restarts via Redis).
 * 3. If the BullMQ job is missing (e.g., Redis was flushed), re-add it.
 *
 * Since we use the DB ID as the BullMQ jobId, re-adding is idempotent — BullMQ
 * deduplicates, so jobs are never double-scheduled.
 */
export async function reconcileScheduledJobs(): Promise<void> {
  console.log('🔄  Reconciling scheduled jobs from DB...');

  const queue = getEmailQueue();

  const pendingJobs = await prisma.emailJob.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { gt: new Date() },
    },
  });

  console.log(`   Found ${pendingJobs.length} pending jobs in DB`);

  let requeued = 0;
  let alreadyQueued = 0;

  for (const job of pendingJobs) {
    // Check if BullMQ already has this job
    const bullJob = await queue.getJob(job.id);

    if (!bullJob) {
      // BullMQ job missing — re-add it (safe to do, jobId deduplicates)
      await scheduleEmailJob(
        {
          emailJobId:    job.id,
          fromEmail:     job.fromEmail,
          toEmail:       job.toEmail,
          subject:       job.subject,
          body:          job.body,
          userId:        job.userId,
          delayBetweenMs: job.delayBetweenMs,
          hourlyLimit:   job.hourlyLimit,
          batchId:       job.batchId ?? undefined,
        },
        job.scheduledAt
      );
      requeued++;
      console.log(`   ↻  Re-queued job ${job.id} → ${job.toEmail} at ${job.scheduledAt.toISOString()}`);
    } else {
      alreadyQueued++;
    }
  }

  console.log(
    `✅  Reconciliation complete: ${alreadyQueued} already in queue, ${requeued} re-queued`
  );
}
