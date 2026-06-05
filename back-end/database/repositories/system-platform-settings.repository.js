import { SystemPlatformSettingsModel } from '../models/system-platform-settings.model.js';
import { BaseRepository } from './base.repository.js';

const GLOBAL_KEY = 'global';

/** @returns {Record<string, unknown>} */
export function defaultGlobalPlatformSettings() {
  return {
    docKey: GLOBAL_KEY,
    schemaVersion: 1,
    portal: {
      defaultLocale: 'ps',
      supportedLocales: ['ps', 'en', 'fa'],
      publicSiteName: 'Sharia Decrees',
      /** Featured decree ids for the public home surface (Mongo ObjectId strings). */
      featuredDecreeIds: [],
      /** Static content tag used to pick announcement cards on `/public/home`. */
      homeAnnouncementTag: 'announcement',
    },
    security: {
      /** Hint for future auth middleware; not enforced by API today. */
      recommendedSessionTtlMinutes: 60,
    },
    integrations: {},
    features: {
      publicRegistrationEnabled: true,
      inspectionsEnabled: true,
      examsEnabled: true,
      decreePublishingEnabled: true,
    },
    maintenance: {
      enabled: false,
      message: null,
      scheduledUntil: null,
      flags: {
        readOnlyApi: false,
        disablePublicLogin: false,
        disableBackgroundJobs: false,
      },
    },
    extensions: {},
  };
}

export class SystemPlatformSettingsRepository extends BaseRepository {
  constructor() {
    super(SystemPlatformSettingsModel);
  }

  async findGlobalLean() {
    const existing = await this.model.findOne({ docKey: GLOBAL_KEY }).lean();
    if (existing) return existing;
    const created = await this.model.create(defaultGlobalPlatformSettings());
    return created.toObject();
  }

  /**
   * Read-modify-write helper that preserves document identity (`_id`).
   *
   * @param {(current: Record<string, unknown>) => Record<string, unknown>} mergeFn
   */
  async upsertMergeGlobal(mergeFn) {
    let doc = await this.model.findOne({ docKey: GLOBAL_KEY });
    if (!doc) {
      await this.model.create(defaultGlobalPlatformSettings());
      doc = await this.model.findOne({ docKey: GLOBAL_KEY });
    }
    const plain = /** @type {Record<string, unknown>} */ (doc.toObject());
    const next = mergeFn(plain);
    doc.set(next);
    await doc.save();
    return /** @type {Record<string, unknown>} */ (doc.toObject({ flattenMaps: true }));
  }
}

export const systemPlatformSettingsRepository = new SystemPlatformSettingsRepository();
