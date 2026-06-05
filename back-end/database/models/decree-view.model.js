import mongoose from 'mongoose';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const decreeViewSchema = new Schema(
  {
    decreeId: { type: Schema.Types.ObjectId, ref: 'Decree', required: true, index: true },
    viewerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    viewedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true, collection: 'decree_views' },
);

decreeViewSchema.plugin(standardDomainPlugin, { withTenant: false });

/** One row per qualified read session (same user may have many per decree). */
decreeViewSchema.index(
  { decreeId: 1, viewerUserId: 1, viewedAt: -1 },
  { partialFilterExpression: { isDeleted: false } },
);

export const DecreeViewModel = mongoose.models.DecreeView ?? mongoose.model('DecreeView', decreeViewSchema);
