/**
 * Thin list helper for Mongoose models — keeps repositories/services small.
 * @template T
 * @param {object} args
 * @param {import('mongoose').Model} args.model
 * @param {import('mongoose').FilterQuery<unknown>} args.filter
 * @param {Record<string, 1 | -1>} args.sort
 * @param {number} args.skip
 * @param {number} args.limit
 * @param {(doc: unknown) => T} [args.map]
 */
export async function findPagedLean({ model, filter, sort, skip, limit, map }) {
  const [rows, total] = await Promise.all([
    model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    model.countDocuments(filter),
  ]);
  const items = map ? rows.map((row) => map(row)) : rows;
  return { items, total };
}
