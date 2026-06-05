import mongoose from 'mongoose';

/**
 * @param {unknown} err
 */
function isNonReplicaSetTransactionError(err) {
  if (!err || typeof err !== 'object') return false;
  const o = /** @type {{ code?: number; message?: string }} */ (err);
  if (o.code === 20) return true;
  const msg = String(o.message ?? '');
  return /replica set|mongos|Transaction numbers/i.test(msg);
}

/**
 * Runs `fn` inside a MongoDB transaction when the deployment supports it (replica set / sharded cluster).
 * On a standalone `mongod`, automatically retries the same work **without** a transaction so local dev works.
 *
 * @template T
 * @param {(session: import('mongoose').ClientSession | undefined) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withMongoTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    if (isNonReplicaSetTransactionError(err)) {
      return await fn(undefined);
    }
    throw err;
  } finally {
    await session.endSession().catch(() => {});
  }
}
