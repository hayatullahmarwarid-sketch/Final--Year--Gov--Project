import { InspectionAssignmentModel } from '../models/inspection-assignment.model.js';

export const name = '0003_inspection_deadline_reminder';

export async function up({ logger }) {
  try {
    await InspectionAssignmentModel.syncIndexes();
  } catch (err) {
    logger?.warn?.({ err }, 'migration.sync_indexes_failed');
    throw err;
  }
}

export async function down() {
  // Non-destructive.
}
