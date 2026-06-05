import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { asyncHandler, sendSuccess, validateRequest } from '../shared/http/index.js';
import { NotFoundError } from '../../core/errors/app-error.js';
import { CertificateModel } from '../../../database/models/certificate.model.js';
import { parseVerifyToken } from './certificate-verify-token.js';

export const certificatesPublicRouter = Router();

const verifyQuerySchema = z.object({
  token: z.string().trim().min(10).max(500),
});

const verifyRefParamSchema = z.object({
  certificateRef: z.string().trim().min(3).max(120),
});

/**
 * Public verify by Mongo `_id` or human-readable `certificateNumber` (no signed token).
 */
certificatesPublicRouter.get(
  '/verify/:certificateRef',
  validateRequest({ params: verifyRefParamSchema }),
  asyncHandler(async (req, res) => {
    const ref = req.validated.params.certificateRef.trim();
    /** @type {Record<string, unknown> | null} */
    let cert = null;
    if (mongoose.Types.ObjectId.isValid(ref)) {
      cert = await CertificateModel.findById(ref)
        .populate({ path: 'holderUserId', select: 'displayName' })
        .lean();
    }
    if (!cert) {
      cert = await CertificateModel.findOne({ certificateNumber: ref, isDeleted: { $ne: true } })
        .populate({ path: 'holderUserId', select: 'displayName' })
        .lean();
    }
    if (!cert || cert.isDeleted) {
      return sendSuccess(res, { valid: false });
    }
    const holderDisplayName =
      cert.holderUserId && typeof cert.holderUserId === 'object' && 'displayName' in cert.holderUserId
        ? /** @type {{ displayName: string }} */ (cert.holderUserId).displayName
        : null;
    return sendSuccess(res, {
      valid: true,
      certificateData: {
        id: String(cert._id),
        certificateNumber: cert.certificateNumber,
        kind: cert.kind,
        status: cert.status,
        issuedAt: cert.issuedAt,
        revokedAt: cert.revokedAt ?? null,
        revokeReason: cert.revokeReason ?? null,
        holderDisplayName,
        metadata: cert.metadata ?? undefined,
      },
    });
  }),
);

/**
 * Stateless public verify endpoint. No auth — anyone holding the QR can verify.
 * Returns ONLY non-sensitive fields (cert number, issued date, status, holder's display name).
 */
certificatesPublicRouter.get(
  '/verify',
  validateRequest({ query: verifyQuerySchema }),
  asyncHandler(async (req, res) => {
    const parsed = parseVerifyToken(req.validated.query.token);
    if (!parsed || !mongoose.Types.ObjectId.isValid(parsed.certificateId)) {
      throw new NotFoundError('Certificate not found');
    }

    const cert = await CertificateModel.findById(parsed.certificateId)
      .populate({ path: 'holderUserId', select: 'displayName' })
      .lean();
    if (!cert || cert.isDeleted) throw new NotFoundError('Certificate not found');

    // Reject tokens whose embedded `issuedAtMs` doesn't match the row (defense against forged tokens).
    if (cert.issuedAt && cert.issuedAt.getTime() !== parsed.issuedAtMs) {
      throw new NotFoundError('Certificate not found');
    }

    return sendSuccess(res, {
      certificateNumber: cert.certificateNumber,
      kind: cert.kind,
      status: cert.status,
      issuedAt: cert.issuedAt,
      revokedAt: cert.revokedAt ?? null,
      revokeReason: cert.revokeReason ?? null,
      holderDisplayName:
        cert.holderUserId && typeof cert.holderUserId === 'object' && 'displayName' in cert.holderUserId
          ? /** @type {{ displayName: string }} */ (cert.holderUserId).displayName
          : null,
    });
  }),
);
