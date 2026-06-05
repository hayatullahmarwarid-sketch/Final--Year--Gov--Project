import mongoose from 'mongoose';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const pendingInspectionOfflineSchema = new Schema(
  {
    offlineId: { type: String, required: true, trim: true, index: true },
    inspectorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'InspectionAssignment', required: true, index: true },
    answers: { type: Schema.Types.Mixed, default: [] },
    photos: { type: Schema.Types.Mixed, default: [] },
    signature: { type: Schema.Types.Mixed, default: null },
    gps: { type: Schema.Types.Mixed, default: null },
    submittedAt: { type: Date, default: () => new Date(), index: true },
    status: {
      type: String,
      enum: ['pending', 'synced', 'failed'],
      default: 'pending',
      index: true,
    },
    lastError: { type: String, trim: true, default: null },
  },
  { timestamps: true, collection: 'pending_inspection_offline' },
);

pendingInspectionOfflineSchema.plugin(standardDomainPlugin, { withTenant: false });

pendingInspectionOfflineSchema.index({ inspectorUserId: 1, offlineId: 1 }, { unique: true });

export const PendingInspectionOfflineModel =
  mongoose.models.PendingInspectionOffline ??
  mongoose.model('PendingInspectionOffline', pendingInspectionOfflineSchema);
