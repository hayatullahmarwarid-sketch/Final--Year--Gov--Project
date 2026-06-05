import { getRedis } from '../../config/redis.js';
import { InMemoryLruCacheProvider } from './InMemoryLruCacheProvider.js';
import { RedisCacheProvider } from './RedisCacheProvider.js';

/** @type {import('./CacheProvider.js').CacheProvider | null} */
let cached = null;

/**
 * Returns the configured cache implementation (singleton per process).
 * Prefers Redis when `REDIS_URL` is set; falls back to in-memory LRU for dev.
 *
 * @returns {import('./CacheProvider.js').CacheProvider}
 */
export function getCacheProvider() {
  if (cached) return cached;
  const redis = getRedis();
  cached = redis
    ? new RedisCacheProvider({ redis, prefix: 'app:cache:' })
    : new InMemoryLruCacheProvider({ max: 5_000, defaultTtlSeconds: 300 });
  return cached;
}

/** Reset the singleton (tests / hot-reload). */
export function resetCacheProviderForTests() {
  cached = null;
}
