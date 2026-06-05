import mongoose from 'mongoose';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const decreeBookmarkSchema = new Schema(
  {
    /** Future: real authenticated public user id; today resolved from `X-Public-User-Id` / env fallback. */
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    decreeId: { type: Schema.Types.ObjectId, ref: 'Decree', required: true, index: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'decree_bookmarks' },
);

decreeBookmarkSchema.plugin(standardDomainPlugin);

decreeBookmarkSchema.index(
  { ownerUserId: 1, decreeId: 1 },
  {
    unique: true,
    // MongoDB 8+ partial indexes disallow `$ne`, `$not`, and `$exists: false`; equality on the soft-delete flag is valid.
    partialFilterExpression: { isDeleted: false },
  },
);
decreeBookmarkSchema.index({ tenantId: 1, ownerUserId: 1, isDeleted: 1, updatedAt: -1 });

export const DecreeBookmarkModel =
  mongoose.models.DecreeBookmark ?? mongoose.model('DecreeBookmark', decreeBookmarkSchema);
