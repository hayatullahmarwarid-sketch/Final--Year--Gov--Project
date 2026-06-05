import IORedis from 'ioredis';
import { getEnv } from './env.js';
import { getLogger } from './logger.js';

/** @type {import('ioredis').Redis | null} */
let cached = null;
let warnedNoRedis = false;

/**
 * Returns a singleton ioredis client, or `null` when `REDIS_URL` is unset.
 * Callers must tolerate `null` and fall back to in-memory behavior.
 * @returns {import('ioredis').Redis | null}
 */
export function getRedis() {
  if (cached) return cached;
  const env = getEnv();
  if (!env.REDIS_URL) {
    if (!warnedNoRedis && env.NODE_ENV !== 'test') {
      warnedNoRedis = true;
      getLogger().info('REDIS_URL not set — using in-memory fallbacks (rate-limit, queue).');
    }
    return null;
  }

  cached = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  cached.on('error', (err) => {
    getLogger().warn({ err }, 'redis.client_error');
  });
  cached.on('connect', () => {
    getLogger().info('Redis connected');
  });
  cached.on('end', () => {
    getLogger().warn('Redis connection ended');
  });

  return cached;
}

/** Force-disconnect (used by graceful shutdown). */
export async function disconnectRedis() {
  if (!cached) return;
  try {
    await cached.quit();
  } catch {
    cached.disconnect();
  }
  cached = null;
}
