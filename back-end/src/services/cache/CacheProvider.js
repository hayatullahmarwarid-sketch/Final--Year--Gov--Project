/**
 * Tiny provider-agnostic cache contract. Values are serialized as JSON on the wire
 * (for Redis) and kept as-is in memory. `ttlSeconds` is REQUIRED by all callers.
 * Missing keys resolve to `null` (never throw).
 */
export class CacheProvider {
  /**
   * @param {string} _key
   * @returns {Promise<unknown | null>}
   */
  async get(_key) {
    throw new Error('CacheProvider.get() must be implemented');
  }

  /**
   * @param {string} _key
   * @param {unknown} _value
   * @param {{ ttlSeconds: number }} _options
   * @returns {Promise<void>}
   */
  async set(_key, _value, _options) {
    throw new Error('CacheProvider.set() must be implemented');
  }

  /**
   * @param {string} _key
   * @returns {Promise<void>}
   */
  async delete(_key) {
    throw new Error('CacheProvider.delete() must be implemented');
  }

  /**
   * Invalidate all keys with a shared prefix (soft pattern delete).
   * @param {string} _prefix
   * @returns {Promise<number>} best-effort count.
   */
  async deleteByPrefix(_prefix) {
    throw new Error('CacheProvider.deleteByPrefix() must be implemented');
  }

  /**
   * Convenience: `get` and, on miss, call `loader`, `set`, return the fresh value.
   * Single-flight deduping is NOT guaranteed here (keep loaders fast).
   *
   * @template T
   * @param {string} key
   * @param {number} ttlSeconds
   * @param {() => Promise<T>} loader
   * @returns {Promise<T>}
   */
  async wrap(key, ttlSeconds, loader) {
    const hit = /** @type {T | null} */ (await this.get(key));
    if (hit !== null && hit !== undefined) return hit;
    const fresh = await loader();
    await this.set(key, fresh, { ttlSeconds });
    return fresh;
  }

  /** Human-readable provider name for logs / metrics. */
  get providerName() {
    return 'abstract';
  }
}
