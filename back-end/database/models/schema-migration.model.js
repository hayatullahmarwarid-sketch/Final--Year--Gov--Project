import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Records which migrations have been applied. Single row per migration `name`.
 * The migration runner is forward-only; a manual `down` entrypoint is provided for
 * recovery but is opt-in.
 */
const schemaMigrationSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    appliedAt: { type: Date, default: () => new Date() },
    durationMs: { type: Number, default: 0 },
    appliedByHost: { type: String, default: null },
  },
  { collection: 'schema_migrations' },
);

export const SchemaMigrationModel =
  mongoose.models.SchemaMigration ?? mongoose.model('SchemaMigration', schemaMigrationSchema);
