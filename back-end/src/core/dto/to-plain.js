/**
 * Serialize Mongoose documents / lean objects for API output.
 * Strips internal fields commonly present on Mongoose docs.
 * @param {unknown} value
 * @param {{ strip?: string[] }} [options]
 */
export function toPlain(value, options = {}) {
  const strip = new Set(['__v', ...(options.strip ?? [])]);
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => toPlain(v, options));
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toJSON === 'function') {
    const json = /** @type {Record<string, unknown>} */ (value.toJSON());
    return scrub(json, strip);
  }
  return scrub(
    /** @type {Record<string, unknown>} */ (JSON.parse(JSON.stringify(value))),
    strip,
  );
}

/**
 * @param {Record<string, unknown>} obj
 * @param {Set<string>} strip
 */
function scrub(obj, strip) {
  const out = { ...obj };
  for (const key of strip) {
    delete out[key];
  }
  return out;
}
