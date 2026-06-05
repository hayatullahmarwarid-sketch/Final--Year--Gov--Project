import { randomUUID } from 'node:crypto';
import { getLogger } from '../../config/logger.js';

/**
 * In-process fallback queue. Runs handlers immediately inside a `setImmediate` so callers don't
 * block and errors become warnings — same observable behavior as BullMQ for simple jobs, minus
 * Redis-backed durability and retries. Useful for `REDIS_URL`-less dev.
 */
export class InProcessQueue {
  /**
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
    /** @type {null | ((job: { id: string, name: string, data: unknown }) => Promise<unknown>)} */
    this.handler = null;
    this.handlerOptions = /** @type {{ maxAttempts: number }} */ ({ maxAttempts: 1 });
  }

  /**
   * Register the worker body. Matches BullMQ's `new Worker(name, fn)` semantics.
   * @param {(job: { id: string, name: string, data: unknown }) => Promise<unknown>} fn
   * @param {{ maxAttempts?: number }} [options]
   */
  process(fn, options = {}) {
    this.handler = fn;
    this.handlerOptions = { maxAttempts: options.maxAttempts ?? 1 };
  }

  /**
   * @param {string} jobName
   * @param {unknown} data
   * @param {{ delay?: number, attempts?: number }} [options]
   */
  async add(jobName, data, options = {}) {
    const id = randomUUID();
    const job = { id, name: jobName, data };
    const run = async () => {
      if (!this.handler) {
        getLogger().debug({ queue: this.name, jobName }, 'in_process_queue.no_handler');
        return;
      }
      const attempts = Math.max(1, options.attempts ?? this.handlerOptions.maxAttempts);
      let lastErr;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          await this.handler(job);
          return;
        } catch (err) {
          lastErr = err;
          getLogger().warn({ err, queue: this.name, jobName, attempt }, 'in_process_queue.attempt_failed');
        }
      }
      getLogger().error({ err: lastErr, queue: this.name, jobName }, 'in_process_queue.exhausted');
    };

    if (options.delay && options.delay > 0) {
      setTimeout(() => {
        void run();
      }, options.delay).unref?.();
    } else {
      setImmediate(() => {
        void run();
      });
    }
    return { id };
  }

  async close() {
    // no-op
  }

  async getJobCounts() {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  }
}
