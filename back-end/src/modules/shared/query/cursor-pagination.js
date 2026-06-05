import mongoose from 'mongoose';
import { z } from 'zod';

/**
 * Cursor-based pagination helpers. Preferred over offset on very large collections (e.g.
 * notifications, assignments, audit log) because `$skip` scales as O(skip).
 *
 * Cursor contract (opaque to clients):
 *   - base64url-encoded JSON `{ t: <ms epoch>, i: <hex ObjectId>, d?: 'f'|'b' }`.
 *   - `t` is the primary sort key (e.g. `createdAt`), `i` is the tie-breaker (row `_id`).
 *   - `d` is reserved for future bi-directional cursors (`f` = forward; default).
 */

/**
 * @typedef {object} DecodedCursor
 * @property {Date} primaryAt     Primary sort value (Date).
 * @property {mongoose.Types.ObjectId} tieBreakerId Secondary sort ObjectId for stable ordering.
 */

/**
 * Encode a cursor from a row's sort-bearing fields. `primaryAt` should match the list's
 * primary sort (descending `createdAt` is typical). Returns a URL-safe opaque string.
 *
 * @param {{ primaryAt: Date | string | number, tieBreakerId: string | mongoose.Types.ObjectId }} row
 * @returns {string}
 */
export function encodeCursor(row) {
  const tMs = row.primaryAt instanceof Date ? row.primaryAt.getTime() : new Date(row.primaryAt).getTime();
  const idHex = String(row.tieBreakerId);
  const raw = JSON.stringify({ t: tMs, i: idHex });
  return Buffer.from(raw, 'utf8').toString('base64url');
}

/**
 * Decode a cursor. Returns `null` on any malformed input — callers must treat `null` as "first page".
 * @param {string | undefined | null} cursor
 * @returns {DecodedCursor | null}
 */
export function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') return null;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const obj = JSON.parse(raw);
    if (typeof obj?.t !== 'number' || typeof obj?.i !== 'string') return null;
    if (!mongoose.Types.ObjectId.isValid(obj.i)) return null;
    return {
      primaryAt: new Date(obj.t),
      tieBreakerId: new mongoose.Types.ObjectId(obj.i),
    };
  } catch {
    return null;
  }
}

/** Zod schema for the cursor query param (opaque string). */
export const cursorQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(400).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Build a Mongo filter clause that selects rows strictly after a decoded cursor, assuming
 * the list is sorted by `{ primaryField: -1, _id: -1 }` (newest-first).
 *
 * @param {DecodedCursor | null} decoded
 * @param {string} [primaryField] Defaults to `createdAt`.
 * @returns {import('mongoose').FilterQuery<unknown>}
 */
export function cursorFilter(decoded, primaryField = 'createdAt') {
  if (!decoded) return {};
  return {
    $or: [
      { [primaryField]: { $lt: decoded.primaryAt } },
      { [primaryField]: decoded.primaryAt, _id: { $lt: decoded.tieBreakerId } },
    ],
  };
}

/**
 * Build the next-cursor for a page result. Pass the LAST item of the returned page.
 * @param {{ createdAt?: Date | string, [k: string]: unknown, _id: unknown } | undefined} last
 * @param {string} [primaryField]
 */
export function nextCursorFrom(last, primaryField = 'createdAt') {
  if (!last) return null;
  const primaryAt = /** @type {Date | string} */ (last[primaryField]);
  if (!primaryAt) return null;
  return encodeCursor({ primaryAt, tieBreakerId: String(last._id) });
}
