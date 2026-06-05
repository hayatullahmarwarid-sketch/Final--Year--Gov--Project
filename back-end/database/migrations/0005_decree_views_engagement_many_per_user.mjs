/**
 * Replace unique (decreeId, viewerUserId) on decree_views with a non-unique index so each qualified
 * read session can insert a row. Run after updating `decree-view.model.js`.
 */
import { DecreeViewModel } from '../models/decree-view.model.js';

export const name = '0005_decree_views_engagement_many_per_user';

export async function up({ logger }) {
  try {
    await DecreeViewModel.syncIndexes();
  } catch (err) {
    logger?.warn?.({ err, model: DecreeViewModel.modelName }, 'migration.sync_indexes_failed');
    throw err;
  }
}

export async function down() {
  // Non-destructive.
}
