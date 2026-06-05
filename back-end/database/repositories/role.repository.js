import { RoleModel } from '../models/role.model.js';
import { BaseRepository } from './base.repository.js';

export class RoleRepository extends BaseRepository {
  constructor() {
    super(RoleModel);
  }

  async findAllSorted() {
    return this.model.find().sort({ key: 1 }).lean();
  }

  /**
   * Idempotent seed upserts by unique `key`.
   * @param {Array<{ key: string, label: string, permissions: string[] }>} roles
   */
  async upsertMany(roles) {
    const ops = roles.map((r) => ({
      updateOne: {
        filter: { key: r.key },
        update: { $set: { label: r.label, permissions: r.permissions } },
        upsert: true,
      },
    }));
    if (ops.length === 0) return { matched: 0, modified: 0, upserted: 0 };
    const res = await this.model.bulkWrite(ops, { ordered: false });
    return {
      matched: res.matchedCount,
      modified: res.modifiedCount,
      upserted: res.upsertedCount,
    };
  }
}

export const roleRepository = new RoleRepository();
