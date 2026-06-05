import { toPlain } from '../../../core/dto/to-plain.js';

/**
 * Standard serializer pattern: normalize Mongoose docs / lean objects with `toPlain`,
 * then map fields to a stable API DTO. Prefer one serializer per aggregate (entity + joins).
 *
 * @template T
 * @param {(plain: Record<string, unknown>) => T} map
 * @param {{ strip?: string[] }} [toPlainOptions] forwarded to `toPlain` (e.g. strip internal keys)
 * @returns {(doc: unknown) => T}
 */
export function createSerializer(map, toPlainOptions = {}) {
  return (doc) => {
    const plain = /** @type {Record<string, unknown>} */ (toPlain(doc, toPlainOptions));
    return map(plain);
  };
}
