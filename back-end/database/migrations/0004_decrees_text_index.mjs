import { DecreeModel } from '../models/decree.model.js';

export const name = '0004_decrees_text_index';

export async function up({ logger }) {
  try {
    await DecreeModel.syncIndexes();
  } catch (err) {
    logger?.warn?.({ err }, 'migration.sync_indexes_failed');
    throw err;
  }
}

export async function down() {
  // Non-destructive.
}
