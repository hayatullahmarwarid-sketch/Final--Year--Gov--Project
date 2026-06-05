/**
 * Worker entrypoint. Run with `npm run worker`.
 *
 * Responsibilities:
 *   - Open a single Mongo connection shared by every handler.
 *   - Register all job handlers against their queues.
 *   - Graceful shutdown on SIGINT / SIGTERM (drain active jobs, flush Redis, close Mongo).
 *
 * Keep this file small — it's a wiring file, not a logic file.
 */
import 'dotenv/config';
import cron from 'node-cron';
import { getEnv } from './config/env.js';
import { getLogger } from './config/logger.js';
import { connectMongo, disconnectMongo } from '../database/connection/mongoose.js';
import { disconnectRedis } from './config/redis.js';
import { enqueue, shutdownQueues, startWorker } from './jobs/queue-registry.js';
import { QUEUE } from './jobs/queue-names.js';
import { emailSendHandler } from './jobs/handlers/email-send.handler.js';
import { dashboardsSnapshotHandler } from './jobs/handlers/dashboards-snapshot.handler.js';
import { notificationsFanoutHandler } from './jobs/handlers/notifications-fanout.handler.js';
import { certificateIssueHandler } from './jobs/handlers/certificate-issue.handler.js';
import { runAssignmentDeadlineReminderTick } from './jobs/cron/assignment-deadline-reminders.js';
import { runAuditLogPruneTick } from './jobs/cron/audit-log-prune.js';

async function main() {
  const log = getLogger();
  await connectMongo();

  // Register handlers. New queues add a single line here.
  startWorker(QUEUE.EMAIL_SEND, emailSendHandler, { concurrency: 4, maxAttempts: 5 });
  startWorker(QUEUE.DASHBOARDS_SNAPSHOT, dashboardsSnapshotHandler, { concurrency: 1 });
  startWorker(QUEUE.NOTIFICATIONS_FANOUT, notificationsFanoutHandler, { concurrency: 8, maxAttempts: 3 });
  startWorker(QUEUE.CERTIFICATES_ISSUE, certificateIssueHandler, { concurrency: 2, maxAttempts: 5 });

  // Schedule a refresh every 5 minutes. `jobId` makes the enqueue idempotent so repeated
  // worker restarts don't stack duplicate repeatables.
  await enqueue(
    QUEUE.DASHBOARDS_SNAPSHOT,
    'refresh-shared',
    { roles: ['system_admin', 'inspector_admin'] },
    { jobId: 'dashboards.snapshot.boot' },
  );

  const env = getEnv();
  if (env.WORKER_CRON_ENABLED) {
    cron.schedule(
      '5 * * * *',
      () => {
        runAssignmentDeadlineReminderTick().catch((err) =>
          log.warn({ err }, 'worker.cron.assignment_deadline_reminder_failed'),
        );
      },
      { timezone: 'UTC' },
    );
    cron.schedule(
      '20 4 * * *',
      () => {
        runAuditLogPruneTick().catch((err) => log.warn({ err }, 'worker.cron.audit_prune_failed'));
      },
      { timezone: 'UTC' },
    );
    log.info('Worker cron schedules registered (UTC).');
  } else {
    log.info('Worker cron schedules disabled (WORKER_CRON_ENABLED=false).');
  }

  log.info('Worker started (queues registered).');

  const shutdown = async (signal) => {
    log.info({ signal }, 'worker.shutting_down');
    await shutdownQueues().catch((err) => log.warn({ err }, 'worker.shutdown_queues_failed'));
    await disconnectRedis().catch(() => undefined);
    await disconnectMongo().catch(() => undefined);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  getLogger().fatal({ err }, 'worker.fatal_boot');
  process.exit(1);
});
