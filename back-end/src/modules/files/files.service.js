import mongoose from 'mongoose';
import { withMongoTransaction } from '../../core/database/mongo-session.js';
import { NotFoundError, ValidationError } from '../../core/errors/app-error.js';
import { InspectionEvidenceFileModel } from '../../../database/models/inspection-evidence-file.model.js';
import { CertificateModel } from '../../../database/models/certificate.model.js';
import { StoredFileModel } from '../../../database/models/stored-file.model.js';
import { excludeDeleted } from '../shared/constants/query-filters.js';
import { StoredEntityType, STORED_ENTITY_TYPE_KEYS } from '../shared/constants/stored-entity-type.js';
import { getEnv } from '../../config/env.js';

function toOid(id) {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

export class FilesService {
  getUploadLimits() {
    const env = getEnv();
    return {
      module: 'files',
      maxUploadBytes: env.MAX_UPLOAD_BYTES,
    };
  }

  /**
   * Binds a `stored_files` row to a domain aggregate for orphan control and ACL.
   * Use the same Mongo session when participating in a larger transaction.
   *
   * @param {{
   *   fileId: string;
   *   entityType: string;
   *   entityId: string;
   *   tenantId?: string | null;
   *   session?: import('mongoose').ClientSession | null;
   * }} input
   */
  async linkStoredFileToPrimaryEntity(input) {
    const { fileId, entityType, entityId, tenantId, session } = input;
    if (!STORED_ENTITY_TYPE_KEYS.includes(entityType)) {
      throw new ValidationError('Unknown stored entity type', { entityType });
    }

    const res = await StoredFileModel.updateOne(
      { _id: toOid(fileId), ...excludeDeleted },
      {
        $set: {
          linkedEntityType: entityType,
          linkedEntityId: toOid(entityId),
          tenantId: tenantId ?? null,
        },
      },
      { session: session ?? undefined },
    );

    if (res.matchedCount === 0) {
      throw new NotFoundError('Stored file not found or deleted');
    }
    return { ok: true };
  }

  /**
   * Connects a stored file to an **inspection** as evidence (`inspection_evidence_files`).
   */
  async attachEvidenceToInspection(input) {
    const { assignmentId, submissionId, fileId, caption, itemKey, tenantId, actorUserId } = input;

    return withMongoTransaction(async (session) => {
      const rows = await InspectionEvidenceFileModel.create(
        [
          {
            assignmentId: toOid(assignmentId),
            submissionId: submissionId ? toOid(submissionId) : null,
            fileId: toOid(fileId),
            caption: caption ?? null,
            itemKey: itemKey ?? null,
            tenantId: tenantId ?? null,
            createdByUserId: toOid(actorUserId),
            updatedByUserId: actorUserId ? toOid(actorUserId) : null,
          },
        ],
        { session },
      );

      const ev = rows[0];
      await this.linkStoredFileToPrimaryEntity({
        fileId,
        entityType: StoredEntityType.INSPECTION_EVIDENCE,
        entityId: String(ev._id),
        tenantId,
        session,
      });

      return { evidenceId: String(ev._id) };
    });
  }

  /**
   * Associates the certificate PDF with `stored_files` and the **certificate** document.
   */
  async linkCertificatePdf(input) {
    const { certificateId, fileId, tenantId, actorUserId } = input;

    return withMongoTransaction(async (session) => {
      const cert = await CertificateModel.findOneAndUpdate(
        { _id: toOid(certificateId), ...excludeDeleted },
        {
          $set: {
            pdfFileId: toOid(fileId),
            tenantId: tenantId ?? null,
            ...(actorUserId ? { updatedByUserId: toOid(actorUserId) } : {}),
          },
        },
        { new: true, session },
      ).lean();

      if (!cert) {
        throw new NotFoundError('Certificate not found or deleted');
      }

      await this.linkStoredFileToPrimaryEntity({
        fileId,
        entityType: StoredEntityType.CERTIFICATE,
        entityId: certificateId,
        tenantId,
        session,
      });

      return { ok: true };
    });
  }
}

export const filesService = new FilesService();
