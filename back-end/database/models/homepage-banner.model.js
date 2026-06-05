import mongoose from 'mongoose';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const homepageBannerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    subtitle: { type: String, trim: true, maxlength: 300, default: '' },
    body: { type: String, trim: true, maxlength: 8000, default: '' },

    ctaLabel: { type: String, trim: true, maxlength: 120, default: '' },
    ctaHref: { type: String, trim: true, maxlength: 2000, default: '' },

    locale: { type: String, required: true, trim: true, lowercase: true, default: 'ps', index: true },

    sortOrder: { type: Number, default: 0, index: true },
    /** When false, banner is hidden from public list endpoints. */
    isActive: { type: Boolean, default: true, index: true },
    activeFrom: { type: Date, default: null, index: true },
    activeTo: { type: Date, default: null, index: true },

    imageFileId: { type: Schema.Types.ObjectId, ref: 'StoredFile', default: null, index: true },

    tenantId: { type: String, trim: true, default: null, index: true, sparse: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'homepage_banners' },
);

homepageBannerSchema.plugin(standardDomainPlugin, { withTenant: false });

homepageBannerSchema.index({ locale: 1, isActive: 1, sortOrder: 1 });
homepageBannerSchema.index({ tenantId: 1, isDeleted: 1, isActive: 1 });

export const HomepageBannerModel =
  mongoose.models.HomepageBanner ?? mongoose.model('HomepageBanner', homepageBannerSchema);
