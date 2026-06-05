import mongoose from 'mongoose';
import { STATIC_PAGE_STATUS_KEYS } from '../../src/modules/shared/enums/static-page-status.js';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const staticContentPageSchema = new Schema(
  {
    slug: { type: String, required: true, trim: true, lowercase: true },
    locale: { type: String, required: true, trim: true, lowercase: true, default: 'ps' },

    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },

    status: {
      type: String,
      required: true,
      enum: [...STATIC_PAGE_STATUS_KEYS],
      default: 'draft',
      index: true,
    },

    publishedAt: { type: Date, default: null, index: true },

    sortOrder: { type: Number, default: 0, index: true },
    tags: [{ type: String, trim: true, lowercase: true }],

    tenantId: { type: String, trim: true, default: null, index: true, sparse: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'static_content_pages' },
);

staticContentPageSchema.plugin(standardDomainPlugin, { withTenant: false });

staticContentPageSchema.index({ tenantId: 1, slug: 1, locale: 1 }, { unique: true });
staticContentPageSchema.index({ status: 1, locale: 1, sortOrder: 1 });
staticContentPageSchema.index({ tags: 1, status: 1 });
staticContentPageSchema.index({ tenantId: 1, isDeleted: 1, status: 1 });

export const StaticContentPageModel =
  mongoose.models.StaticContentPage ?? mongoose.model('StaticContentPage', staticContentPageSchema);
