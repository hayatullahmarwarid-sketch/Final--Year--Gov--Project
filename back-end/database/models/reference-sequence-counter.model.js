import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Atomic per-scope sequence rows for official document references (decrees, certificates, reports).
 * `_id` is a stable key such as `dept_upload:decree`.
 */
const referenceSequenceCounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    year: { type: Number, required: true, index: true },
    seq: { type: Number, required: true, default: 0, min: 0 },
  },
  { collection: 'reference_sequence_counters' },
);

export const ReferenceSequenceCounterModel =
  mongoose.models.ReferenceSequenceCounter ??
  mongoose.model('ReferenceSequenceCounter', referenceSequenceCounterSchema);
