import { getRedis } from '../config/redis.js';
import { getLogger } from '../config/logger.js';
import { startWorker } from './queue-registry.js';
import { QUEUE } from './queue-names.js';
import { emailSendHandler } from './handlers/email-send.handler.js';
import { notificationsFanoutHandler } from './handlers/notifications-fanout.handler.js';
import { certificateIssueHandler } from './handlers/certificate-issue.handler.js';

let registered = false;

/**
 * When Redis is NOT configured (dev mode), the API process runs job handlers in-process so the
 * developer gets a working end-to-end flow without spinning up a worker.
 *
 * In production (`REDIS_URL` set) this is a no-op — handlers MUST live in the worker process.
 */
export function registerInProcessHandlersIfNeeded() {
  if (registered) return;
  if (getRedis() !== null) return;

  startWorker(QUEUE.EMAIL_SEND, emailSendHandler, { maxAttempts: 3 });
  startWorker(QUEUE.NOTIFICATIONS_FANOUT, notificationsFanoutHandler, { maxAttempts: 3 });
  startWorker(QUEUE.CERTIFICATES_ISSUE, certificateIssueHandler, { maxAttempts: 3 });

  registered = true;
  getLogger().info('jobs.in_process_handlers_registered');
}
