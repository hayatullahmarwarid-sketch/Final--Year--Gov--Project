import { CacheProvider } from './CacheProvider.js';

/**
 * Redis-backed cache. Keys are namespaced under the `prefix` passed at construction
 * so different concerns don't collide and pattern-invalidation stays surgical.
 */
export class RedisCacheProvider extends CacheProvider {
  /**
   * @param {{ redis: import('ioredis').Redis, prefix?: string }} options
   */
  constructor(options) {
    super();
    this.redis = options.redis;
    this.prefix = options.prefix ?? 'cache:';
  }

  get providerName() {
    return 'redis';
  }

  #k(key) {
    return `${this.prefix}${key}`;
  }

  async get(key) {
    const raw = await this.redis.get(this.#k(key));
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async set(key, value, options) {
    const raw = JSON.stringify(value);
    await this.redis.set(this.#k(key), raw, 'EX', options.ttlSeconds);
  }

  async delete(key) {
    await this.redis.del(this.#k(key));
  }

  /**
   * Prefix delete via SCAN. Avoids `KEYS` (O(N) blocking). Best-effort; count is the number
   * of keys actually deleted in this process (another instance may delete concurrently).
   *
   * @param {string} prefix
   */
  async deleteByPrefix(prefix) {
    const match = `${this.prefix}${prefix}*`;
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', match, 'COUNT', 200);
      cursor = next;
      if (keys.length > 0) {
        deleted += (await this.redis.del(...keys)) ?? 0;
      }
    } while (cursor !== '0');
    return deleted;
  }
}
