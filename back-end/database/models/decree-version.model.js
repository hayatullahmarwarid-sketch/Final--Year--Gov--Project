import mongoose from 'mongoose';
import { DECREE_VERSION_PUBLICATION_KEYS } from '../../src/modules/shared/enums/decree-version-publication.js';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const localizedBlockSchema = new Schema(
  {
    locale: { type: String, trim: true, required: true },
    title: { type: String, trim: true, default: null },
    bodyRich: { type: String, default: null },
    bodyPlain: { type: String, default: null },
  },
  { _id: false },
);

const decreeVersionSchema = new Schema(
  {
    decreeId: { type: Schema.Types.ObjectId, ref: 'Decree', required: true, index: true },
    lineageRootDecreeId: { type: Schema.Types.ObjectId, ref: 'Decree', required: true, index: true },

    versionNumber: { type: Number, required: true, min: 1 },

    supersedesVersionId: { type: Schema.Types.ObjectId, ref: 'DecreeVersion', default: null, index: true },

    publicationStatus: {
      type: String,
      required: true,
      enum: [...DECREE_VERSION_PUBLICATION_KEYS],
      default: 'draft',
      index: true,
    },

    isImmutable: { type: Boolean, default: false, index: true },

    changeSummary: { type: String, trim: true, default: null },
    localizedContent: { type: [localizedBlockSchema], default: [] },

    sections: {
      type: [
        new Schema(
          {
            key: { type: String, trim: true, required: true },
            title: { type: String, trim: true, required: true },
            bodyRich: { type: String, default: null },
            sortOrder: { type: Number, default: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    publishedAt: { type: Date, default: null, index: true },
    effectiveFrom: { type: Date, default: null, index: true },
    effectiveTo: { type: Date, default: null, index: true },

    contentChecksumSha256: { type: String, trim: true, default: null, index: true },

    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    approvedAt: { type: Date, default: null, index: true },
    publishedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    attestation: {
      type: new Schema(
        {
          kind: { type: String, trim: true, default: null },
          reference: { type: String, trim: true, default: null },
          signedAt: { type: Date, default: null },
        },
        { _id: false },
      ),
      default: undefined,
    },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'decree_versions' },
);

decreeVersionSchema.plugin(standardDomainPlugin);

decreeVersionSchema.index({ decreeId: 1, versionNumber: 1 }, { unique: true });
decreeVersionSchema.index({ lineageRootDecreeId: 1, publicationStatus: 1, publishedAt: -1 });
decreeVersionSchema.index({ decreeId: 1, publicationStatus: 1, updatedAt: -1 });
decreeVersionSchema.index({ tenantId: 1, isDeleted: 1, publicationStatus: 1 });

export const DecreeVersionModel =
  mongoose.models.DecreeVersion ?? mongoose.model('DecreeVersion', decreeVersionSchema);
