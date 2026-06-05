import mongoose from 'mongoose';
import { ROLE_KEYS } from '../../src/modules/shared/enums/roles.js';

const { Schema } = mongoose;

const roleSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, enum: [...ROLE_KEYS], index: true },
    label: { type: String, required: true, trim: true },
    permissions: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'roles' },
);

export const RoleModel = mongoose.models.Role ?? mongoose.model('Role', roleSchema);
