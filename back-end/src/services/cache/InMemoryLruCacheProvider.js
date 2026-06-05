import { LRUCache } from 'lru-cache';
import { CacheProvider } from './CacheProvider.js';

/**
 * Process-local LRU cache. Good enough for single-instance dev / low-scale staging.
 * Swap to RedisCacheProvider via `REDIS_URL` for multi-instance correctness.
 */
export class InMemoryLruCacheProvider extends CacheProvider {
  /**
   * @param {{ max?: number, defaultTtlSeconds?: number }} [options]
   */
  constructor(options = {}) {
    super();
    const max = options.max ?? 5_000;
    const ttl = (options.defaultTtlSeconds ?? 300) * 1000;
    /** @type {LRUCache<string, unknown>} */
    this.lru = new LRUCache({ max, ttl });
  }

  get providerName() {
    return 'memory';
  }

  async get(key) {
    const v = this.lru.get(key);
    return v === undefined ? null : v;
  }

  async set(key, value, options) {
    this.lru.set(key, value, { ttl: options.ttlSeconds * 1000 });
  }

  async delete(key) {
    this.lru.delete(key);
  }

  async deleteByPrefix(prefix) {
    let count = 0;
    for (const key of this.lru.keys()) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        this.lru.delete(key);
        count += 1;
      }
    }
    return count;
  }
}
