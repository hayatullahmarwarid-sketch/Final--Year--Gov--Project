import mongoose from 'mongoose';
import { InspectionEvidenceFileModel } from '../models/inspection-evidence-file.model.js';
import { BaseRepository } from './base.repository.js';

export class InspectionEvidenceFileRepository extends BaseRepository {
  constructor() {
    super(InspectionEvidenceFileModel);
  }

  /**
   * @param {string} assignmentId
   */
  async listByAssignmentLean(assignmentId) {
    return this.model
      .find({
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
        isDeleted: { $ne: true },
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * @param {string} assignmentId
   */
  async countByAssignment(assignmentId) {
    return this.model.countDocuments({
      assignmentId: new mongoose.Types.ObjectId(assignmentId),
      isDeleted: { $ne: true },
    });
  }

  /**
   * @param {string} assignmentId
   * @param {string[]} fileIds
   */
  async countRegisteredFiles(assignmentId, fileIds) {
    if (!fileIds.length) return 0;
    const oids = fileIds.map((id) => new mongoose.Types.ObjectId(id));
    return this.model.countDocuments({
      assignmentId: new mongoose.Types.ObjectId(assignmentId),
      fileId: { $in: oids },
      isDeleted: { $ne: true },
    });
  }

  /**
   * @param {Record<string, unknown>} doc
   * @param {import('mongoose').ClientSession} [session]
   */
  async createWithSession(doc, session) {
    const [created] = await this.model.create([doc], session ? { session } : {});
    return created.toObject();
  }
}

export const inspectionEvidenceFileRepository = new InspectionEvidenceFileRepository();
