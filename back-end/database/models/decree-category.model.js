import mongoose from 'mongoose';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const decreeCategorySchema = new Schema(
  {
    slug: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    namePs: { type: String, trim: true, default: null },
    /** Dari / Farsi display label (optional). */
    nameFa: { type: String, trim: true, default: null },
    description: { type: String, trim: true, default: null },

    parentCategoryId: { type: Schema.Types.ObjectId, ref: 'DecreeCategory', default: null, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },

    tenantId: { type: String, trim: true, default: null, index: true, sparse: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'decree_categories' },
);

decreeCategorySchema.plugin(standardDomainPlugin, { withTenant: false });

decreeCategorySchema.index({ parentCategoryId: 1, sortOrder: 1, name: 1 });
decreeCategorySchema.index({ tenantId: 1, slug: 1 }, { unique: true });
decreeCategorySchema.index({ tenantId: 1, isActive: 1, isDeleted: 1 });

export const DecreeCategoryModel =
  mongoose.models.DecreeCategory ?? mongoose.model('DecreeCategory', decreeCategorySchema);
