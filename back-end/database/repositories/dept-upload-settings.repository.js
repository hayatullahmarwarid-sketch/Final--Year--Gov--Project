import { DeptUploadSettingsModel } from '../models/dept-upload-settings.model.js';
import { BaseRepository } from './base.repository.js';

const KEY = 'dept_upload';

/** @returns {Record<string, unknown>} */
export function defaultDeptUploadSettings() {
  return {
    docKey: KEY,
    schemaVersion: 1,
    department: {
      deptName: 'Decree Upload Department',
      deptCode: 'DUD',
      refPrefix: 'SHD',
      contactEmail: 'admin@decrees.gov.af',
    },
    system: {
      sessionTimeoutMinutes: 30,
      sequenceYearlyReset: true,
      interfaceLanguage: 'en',
      timezone: 'Asia/Kabul',
      dateFormat: 'DD/MM/YYYY',
    },
    notifications: {
      push: {
        enabled: true,
        newUploads: true,
        statusChanges: true,
        systemAlerts: false,
      },
    },
    storage: {
      autoBackup: true,
      backupFreq: 'daily',
      retentionDays: 90,
      destination: 'local',
      autoDeleteRejected: true,
      deleteAfterDays: 30,
    },
  };
}

export class DeptUploadSettingsRepository extends BaseRepository {
  constructor() {
    super(DeptUploadSettingsModel);
  }

  async findSingletonLean() {
    const existing = await this.model.findOne({ docKey: KEY }).lean();
    if (existing) return existing;
    const created = await this.model.create(defaultDeptUploadSettings());
    return created.toObject();
  }

  /**
   * Read-modify-write helper that preserves `_id`.
   * @param {(current: Record<string, unknown>) => Record<string, unknown>} mergeFn
   */
  async upsertMergeSingleton(mergeFn) {
    let doc = await this.model.findOne({ docKey: KEY });
    if (!doc) {
      await this.model.create(defaultDeptUploadSettings());
      doc = await this.model.findOne({ docKey: KEY });
    }
    const plain = /** @type {Record<string, unknown>} */ (doc.toObject());
    const next = mergeFn(plain);
    doc.set(next);
    await doc.save();
    return /** @type {Record<string, unknown>} */ (doc.toObject({ flattenMaps: true }));
  }
}

export const deptUploadSettingsRepository = new DeptUploadSettingsRepository();

