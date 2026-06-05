import mongoose from 'mongoose';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const templateItemSchema = new Schema(
  {
    itemKey: { type: String, trim: true, required: true },
    type: {
      type: String,
      enum: [
        'checklist',
        'text',
        'number',
        'date',
        'photo_required',
        'signature',
        'dropdown',
        'checkbox',
        'rating',
        'gps',
      ],
      required: true,
    },
    label: { type: String, trim: true, required: true },
    helperText: { type: String, trim: true, default: null },
    required: { type: Boolean, default: false },
    options: {
      type: [
        new Schema(
          {
            optionKey: { type: String, trim: true, required: true },
            label: { type: String, trim: true, required: true },
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },
    validation: {
      type: new Schema(
        {
          min: { type: Number, default: null },
          max: { type: Number, default: null },
          pattern: { type: String, default: null },
        },
        { _id: false },
      ),
      default: undefined,
    },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const templateSectionSchema = new Schema(
  {
    sectionKey: { type: String, trim: true, required: true },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: null },
    sortOrder: { type: Number, default: 0 },
    items: { type: [templateItemSchema], default: [] },
  },
  { _id: false },
);

const inspectionTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },

    /** Human-readable inspection location (province/district/address/free text). */
    location: { type: String, trim: true, default: null },

    revision: { type: Number, required: true, default: 1, min: 1, index: true },
    isActive: { type: Boolean, default: true, index: true },

    sections: { type: [templateSectionSchema], default: [] },

    tenantId: { type: String, trim: true, default: null, index: true, sparse: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'inspection_templates' },
);

inspectionTemplateSchema.plugin(standardDomainPlugin, { withTenant: false });

inspectionTemplateSchema.index({ isActive: 1, updatedAt: -1 });
inspectionTemplateSchema.index({ tenantId: 1, isDeleted: 1, isActive: 1 });
inspectionTemplateSchema.index({ name: 'text', description: 'text' });

export const InspectionTemplateModel =
  mongoose.models.InspectionTemplate ?? mongoose.model('InspectionTemplate', inspectionTemplateSchema);
