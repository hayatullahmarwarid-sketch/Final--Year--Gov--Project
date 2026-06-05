/**
 * Indexes + schema sync for decree engagement (views, downloads, PDF metadata).
 */
import { DecreeModel } from '../models/decree.model.js';
import { DecreeViewModel } from '../models/decree-view.model.js';
import { StoredFileModel } from '../models/stored-file.model.js';

export const name = '0002_decrees_engagement';

export async function up({ logger }) {
  for (const m of [DecreeModel, DecreeViewModel, StoredFileModel]) {
    try {
      await m.syncIndexes();
    } catch (err) {
      logger?.warn?.({ err, model: m.modelName }, 'migration.sync_indexes_failed');
      throw err;
    }
  }
}

export async function down() {
  // Non-destructive.
}
