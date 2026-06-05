import { Queue, Worker } from 'bullmq';
import { getRedis } from '../config/redis.js';
import { getLogger } from '../config/logger.js';
import { QUEUE_NAMES } from './queue-names.js';
import { InProcessQueue } from './fallback/in-process-queue.js';

/**
 * Job queue abstraction. Both the API and the worker entrypoint use `getQueue(name)` to enqueue.
 * The worker additionally uses `startWorker(name, handler)` to consume.
 *
 * When `REDIS_URL` is set → BullMQ (durable, retries, DLQ via `failed` events).
 * When `REDIS_URL` is unset → InProcessQueue (immediate, non-durable, dev-only).
 */

/** @type {Map<string, Queue | InProcessQueue>} */
const queueCache = new Map();
/** @type {Map<string, Worker>} */
const workerCache = new Map();

/**
 * @param {string} name
 * @returns {Queue | InProcessQueue}
 */
export function getQueue(name) {
  if (!QUEUE_NAMES.includes(name)) {
    throw new Error(`Unknown queue: ${name}`);
  }
  const existing = queueCache.get(name);
  if (existing) return existing;

  const redis = getRedis();
  if (!redis) {
    const q = new InProcessQueue(name);
    queueCache.set(name, q);
    return q;
  }

  const bullQueue = new Queue(name, {
    connection: redis,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: { age: 24 * 3600, count: 5_000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });
  queueCache.set(name, bullQueue);
  return bullQueue;
}

/**
 * Enqueue a job on a named queue. Abstracted so domain code doesn't branch on BullMQ vs fallback.
 *
 * @param {string} queueName
 * @param {string} jobName
 * @param {unknown} data
 * @param {{ delay?: number, attempts?: number, jobId?: string }} [options]
 * @returns {Promise<{ id: string | undefined }>}
 */
export async function enqueue(queueName, jobName, data, options = {}) {
  const q = getQueue(queueName);
  if (q instanceof InProcessQueue) {
    return q.add(jobName, data, options);
  }
  const job = await q.add(jobName, data, {
    delay: options.delay,
    attempts: options.attempts,
    jobId: options.jobId,
  });
  return { id: job.id };
}

/**
 * Register a worker for a queue. ONLY called from the worker entrypoint (`npm run worker`).
 * The API process MUST NOT call this — otherwise it would share CPU/memory with handler code.
 *
 * @param {string} name
 * @param {(job: { id: string | undefined, name: string, data: unknown }) => Promise<unknown>} handler
 * @param {{ concurrency?: number, maxAttempts?: number }} [options]
 */
export function startWorker(name, handler, options = {}) {
  if (!QUEUE_NAMES.includes(name)) {
    throw new Error(`Unknown queue: ${name}`);
  }
  if (workerCache.has(name)) return workerCache.get(name);

  const redis = getRedis();
  if (!redis) {
    // Reuse the InProcessQueue's process() hook so dev still "runs" jobs.
    const q = /** @type {InProcessQueue} */ (getQueue(name));
    q.process(async (job) => handler(job), { maxAttempts: options.maxAttempts ?? 1 });
    getLogger().info({ queue: name }, 'worker.in_process_attached');
    return q;
  }

  const worker = new Worker(
    name,
    async (job) => handler({ id: job.id, name: job.name, data: job.data }),
    {
      connection: redis,
      concurrency: options.concurrency ?? 5,
    },
  );

  worker.on('completed', (job) =>
    getLogger().debug({ queue: name, jobId: job.id, jobName: job.name }, 'worker.completed'),
  );
  worker.on('failed', (job, err) =>
    getLogger().warn(
      { queue: name, jobId: job?.id, jobName: job?.name, err: { message: err?.message } },
      'worker.failed',
    ),
  );
  worker.on('error', (err) => getLogger().error({ queue: name, err }, 'worker.error'));

  workerCache.set(name, worker);
  return worker;
}

/** Graceful shutdown of every queue + worker created in this process. */
export async function shutdownQueues() {
  for (const worker of workerCache.values()) {
    await worker.close().catch(() => undefined);
  }
  workerCache.clear();
  for (const q of queueCache.values()) {
    if (q instanceof InProcessQueue) continue;
    await q.close().catch(() => undefined);
  }
  queueCache.clear();
}
