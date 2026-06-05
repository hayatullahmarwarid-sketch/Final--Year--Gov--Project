import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { CertificateModel } from '../../../database/models/certificate.model.js';
import { UserModel } from '../../../database/models/user.model.js';
import { ExamModel } from '../../../database/models/exam.model.js';
import { StoredFileModel } from '../../../database/models/stored-file.model.js';
import { NotFoundError } from '../../core/errors/app-error.js';
import { getEnv } from '../../config/env.js';
import { getLogger } from '../../config/logger.js';
import { getStorageProvider } from '../../services/storage/get-storage-provider.js';
import { StoredFilePurpose } from '../shared/constants/stored-file-purpose.js';
import { StoredEntityType } from '../shared/constants/stored-entity-type.js';
import { enqueue } from '../../jobs/queue-registry.js';
import { QUEUE } from '../../jobs/queue-names.js';
import { createVerifyToken } from './certificate-verify-token.js';
import { renderCertificatePdf } from './certificate-pdf.renderer.js';
import { allocateCertificateOfficialReference } from '../../services/reference-generation/reference-generation.service.js';
import { deptUploadSettingsRepository } from '../../../database/repositories/dept-upload-settings.repository.js';
import { CERTIFICATE_VALIDITY_DAYS_MAX } from '../shared/validation/enterprise-field-limits.js';

async function departmentPdfBannerTitle() {
  const doc = await deptUploadSettingsRepository.findSingletonLean();
  const dep = doc.department && typeof doc.department === 'object' ? doc.department : {};
  const name = typeof dep.deptName === 'string' && dep.deptName.trim() ? dep.deptName.trim() : 'Government Decrees';
  return `${name} — Certificate`;
}

/**
 * Build the full public verify URL embedded in the QR code. `APP_PUBLIC_BASE_URL` (Phase 7)
 * should point at the production API (e.g. `https://api.example.com`). When unset, the URL
 * is a relative path — callers can prefix as needed.
 */
function buildVerifyUrl(certificateId, issuedAt) {
  const env = getEnv();
  const token = createVerifyToken(certificateId, issuedAt);
  const base = env.APP_PUBLIC_BASE_URL ? env.APP_PUBLIC_BASE_URL.replace(/\/$/, '') : '';
  return `${base}/api/v1/certificates/verify?token=${encodeURIComponent(token)}`;
}

/**
 * Default validity windows by certificate kind. Keep these conservative so
 * expiry is always set explicitly in the certificate metadata.
 *
 * @type {Record<string, number>}
 */
const DEFAULT_VALIDITY_DAYS_BY_KIND = {
  exam_pass: 365, // 1 year — blocks retaking the same exam until certificate expires
  decree_literacy: 1095, // 3 years
  inspection_qualification: 365, // 1 year
  other: 730,
};

/**
 * Compute the certificate expiry timestamp. Caller may pass an explicit `expiresAt`,
 * an override `validityDays`, or rely on the kind-based default.
 *
 * @param {Date} issuedAt
 * @param {string} kind
 * @param {{ validityDays?: number | null, expiresAt?: Date | string | null }} [opts]
 */
function computeExpiry(issuedAt, kind, opts = {}) {
  if (opts.expiresAt) {
    const d = opts.expiresAt instanceof Date ? opts.expiresAt : new Date(opts.expiresAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  let days =
    typeof opts.validityDays === 'number' && Number.isFinite(opts.validityDays) && opts.validityDays > 0
      ? Math.floor(opts.validityDays)
      : (DEFAULT_VALIDITY_DAYS_BY_KIND[kind] ?? DEFAULT_VALIDITY_DAYS_BY_KIND.other);
  days = Math.min(CERTIFICATE_VALIDITY_DAYS_MAX, Math.max(1, days));
  const out = new Date(issuedAt.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

/** Persisted certificate percentages must stay within a normal display range. */
function clampScorePct(raw) {
  return Math.round(Math.min(100, Math.max(0, raw)));
}

export class CertificateIssueWorkflow {
  /**
   * Idempotent issuance:
   *   - If a certificate already exists for `(holderUserId, kind, sourceExamId?)`, return it.
   *   - Otherwise allocate a number, create the Certificate doc, enqueue PDF rendering.
   *
   * Persists the following business-relevant fields into `metadata`:
   *   - `score`        : numeric percentage 0–100 (mirror of `passPct`)
   *   - `passPct`      : raw pass percentage from the grader
   *   - `level`        : 'basic' | 'intermediate' | 'advanced' (when supplied)
   *   - `validTo`      : ISO date — expiry timestamp computed from kind defaults
   *   - `validToYmd`   : `YYYY-MM-DD` calendar form for list views
   *   - `decreeIds`    : referenced decree ids (when supplied)
   *   - `verifyUrl`    : signed public verification URL
   *   - `verifyQrDataUrl` : QR data URL embedded in the PDF
   *
   * @param {{
   *   holderUserId: string,
   *   kind: string,
   *   sourceExamId?: string | null,
   *   sourceExamAttemptId?: string | null,
   *   sourceDecreeId?: string | null,
   *   passPct?: number | null,
   *   level?: 'basic' | 'intermediate' | 'advanced' | null,
   *   decreeIds?: string[] | null,
   *   actorUserId?: string | null,
   *   tenantId?: string | null,
   *   validityDays?: number | null,
   *   expiresAt?: Date | string | null,
   *   category?: string | null,
   * }} input
   */
  async issue(input) {
    if (!mongoose.Types.ObjectId.isValid(input.holderUserId)) {
      throw new NotFoundError('Holder user not found');
    }

    const existing = await CertificateModel.findOne({
      holderUserId: new mongoose.Types.ObjectId(input.holderUserId),
      kind: input.kind,
      sourceExamId: input.sourceExamId
        ? new mongoose.Types.ObjectId(input.sourceExamId)
        : null,
      isDeleted: false,
    }).lean();

    if (existing) {
      const exMeta = existing.metadata && typeof existing.metadata === 'object' ? existing.metadata : {};
      const validTo = exMeta.validTo ? new Date(String(exMeta.validTo)) : null;
      const stillValid =
        validTo && !Number.isNaN(validTo.getTime()) && validTo.getTime() > new Date().getTime();
      if (stillValid) {
        const exScore =
          typeof exMeta.score === 'number'
            ? exMeta.score
            : typeof exMeta.scorePct === 'number'
              ? exMeta.scorePct
              : typeof exMeta.passPct === 'number'
                ? exMeta.passPct
                : null;
        return {
          certificateId: String(existing._id),
          certificateNumber: existing.certificateNumber,
          alreadyIssued: true,
          issuedAt: existing.issuedAt ? new Date(existing.issuedAt).toISOString() : null,
          expiresAt: typeof exMeta.validTo === 'string' ? exMeta.validTo : null,
          score: exScore,
        };
      }
      // Previous certificate for this exam expired: re-issue the same document with new dates & attempt.
      const reNow = new Date();
      const certId = existing._id;
      const verifyUrl = buildVerifyUrl(String(certId), reNow);
      const verifyQrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 160 });
      /** @type {Record<string, unknown>} */
      const reMeta = {};
      if (typeof input.passPct === 'number' && Number.isFinite(input.passPct)) {
        const rounded = clampScorePct(input.passPct);
        reMeta.passPct = rounded;
        reMeta.score = rounded;
        reMeta.scorePct = rounded;
      }
      if (input.level === 'basic' || input.level === 'intermediate' || input.level === 'advanced') {
        reMeta.level = input.level;
      }
      if (Array.isArray(input.decreeIds) && input.decreeIds.length) {
        reMeta.decreeIds = input.decreeIds.map(String);
      }
      if (typeof input.category === 'string' && input.category.trim()) {
        reMeta.category = input.category.trim();
      }
      const reExpiresAt = computeExpiry(reNow, input.kind, {
        validityDays: input.validityDays ?? null,
        expiresAt: input.expiresAt ?? null,
      });
      reMeta.validTo = reExpiresAt.toISOString();
      reMeta.validToYmd = reExpiresAt.toISOString().slice(0, 10);
      reMeta.validityDays = Math.max(1, Math.round((reExpiresAt.getTime() - reNow.getTime()) / 86400000));
      reMeta.verifyQrDataUrl = verifyQrDataUrl;
      reMeta.verifyUrl = verifyUrl;

      await CertificateModel.findByIdAndUpdate(certId, {
        $set: {
          status: 'issued',
          issuedAt: reNow,
          sourceExamAttemptId: input.sourceExamAttemptId
            ? new mongoose.Types.ObjectId(input.sourceExamAttemptId)
            : null,
          metadata: reMeta,
          updatedByUserId: input.actorUserId ? new mongoose.Types.ObjectId(input.actorUserId) : null,
          pdfFileId: null,
        },
      });
      await enqueue(QUEUE.CERTIFICATES_ISSUE, 'render-pdf', { certificateId: String(certId) });
      return {
        certificateId: String(certId),
        certificateNumber: String(existing.certificateNumber),
        alreadyIssued: false,
        issuedAt: reNow.toISOString(),
        expiresAt: reExpiresAt.toISOString(),
        score: typeof reMeta.score === 'number' ? reMeta.score : null,
      };
    }

    const certificateNumber = (await allocateCertificateOfficialReference(undefined)).reference;
    const now = new Date();
    const certId = new mongoose.Types.ObjectId();
    const verifyUrl = buildVerifyUrl(String(certId), now);
    const verifyQrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 160 });

    /** @type {Record<string, unknown>} */
    const metadata = {};
    if (typeof input.passPct === 'number' && Number.isFinite(input.passPct)) {
      const rounded = clampScorePct(input.passPct);
      metadata.passPct = rounded;
      metadata.score = rounded;
      metadata.scorePct = rounded;
    }
    if (input.level === 'basic' || input.level === 'intermediate' || input.level === 'advanced') {
      metadata.level = input.level;
    }
    if (Array.isArray(input.decreeIds) && input.decreeIds.length) {
      metadata.decreeIds = input.decreeIds.map(String);
    }
    if (typeof input.category === 'string' && input.category.trim()) {
      metadata.category = input.category.trim();
    }
    const expiresAt = computeExpiry(now, input.kind, {
      validityDays: input.validityDays ?? null,
      expiresAt: input.expiresAt ?? null,
    });
    metadata.validTo = expiresAt.toISOString();
    metadata.validToYmd = expiresAt.toISOString().slice(0, 10);
    metadata.validityDays = Math.max(
      1,
      Math.round((expiresAt.getTime() - now.getTime()) / 86400000),
    );
    metadata.verifyQrDataUrl = verifyQrDataUrl;
    metadata.verifyUrl = verifyUrl;

    const created = await CertificateModel.create({
      _id: certId,
      certificateNumber,
      holderUserId: new mongoose.Types.ObjectId(input.holderUserId),
      kind: input.kind,
      status: 'issued',
      sourceExamId: input.sourceExamId
        ? new mongoose.Types.ObjectId(input.sourceExamId)
        : null,
      sourceExamAttemptId: input.sourceExamAttemptId
        ? new mongoose.Types.ObjectId(input.sourceExamAttemptId)
        : null,
      sourceDecreeId: input.sourceDecreeId
        ? new mongoose.Types.ObjectId(input.sourceDecreeId)
        : null,
      issuedAt: now,
      tenantId: input.tenantId ?? null,
      issuedByUserId: input.actorUserId
        ? new mongoose.Types.ObjectId(input.actorUserId)
        : null,
      metadata: Object.keys(metadata).length ? metadata : undefined,
    });

    // Enqueue PDF rendering; dev runs it in-process, prod runs it in the worker.
    await enqueue(QUEUE.CERTIFICATES_ISSUE, 'render-pdf', {
      certificateId: String(created._id),
    });

    return {
      certificateId: String(created._id),
      certificateNumber,
      alreadyIssued: false,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      score: typeof metadata.score === 'number' ? metadata.score : null,
    };
  }

  /**
   * Worker-side handler: render PDF, persist StoredFile via the StorageProvider, link it back
   * to the Certificate doc. Idempotent — if the cert already has `pdfFileId` set, returns early.
   *
   * @param {string} certificateId
   */
  async renderAndAttachPdf(certificateId) {
    if (!mongoose.Types.ObjectId.isValid(certificateId)) {
      throw new NotFoundError('Certificate not found');
    }
    const cert = await CertificateModel.findById(certificateId).lean();
    if (!cert || cert.isDeleted) {
      throw new NotFoundError('Certificate not found');
    }
    if (cert.pdfFileId) {
      return { ok: true, skipped: 'already_rendered' };
    }

    const [holder, exam] = await Promise.all([
      UserModel.findById(cert.holderUserId).select({ displayName: 1, email: 1 }).lean(),
      cert.sourceExamId ? ExamModel.findById(cert.sourceExamId).select({ title: 1 }).lean() : null,
    ]);

    const verifyUrl = buildVerifyUrl(String(cert._id), cert.issuedAt);
    const meta = cert.metadata && typeof cert.metadata === 'object' ? /** @type {Record<string, unknown>} */ (cert.metadata) : {};
    const levelLabel =
      meta.level === 'advanced' || meta.level === 'intermediate' || meta.level === 'basic'
        ? String(meta.level)
        : null;
    const expiresAtForPdf =
      typeof meta.validTo === 'string' && meta.validTo
        ? meta.validTo
        : null;

    const departmentBannerTitle = await departmentPdfBannerTitle();

    const pdf = await renderCertificatePdf({
      certificateNumber: cert.certificateNumber,
      holderDisplayName: holder?.displayName ?? 'Holder',
      kind: cert.kind,
      issuedAt: cert.issuedAt,
      verifyUrl,
      examTitle: exam?.title ?? null,
      passPct: typeof meta.passPct === 'number' ? Number(meta.passPct) : null,
      proficiencyLevel: levelLabel,
      expiresAt: expiresAtForPdf,
      departmentBannerTitle,
    });

    const storage = getStorageProvider();
    const uploaded = await storage.upload(
      {
        originalName: `certificate-${cert.certificateNumber}.pdf`,
        mimeType: 'application/pdf',
        buffer: pdf,
        size: pdf.length,
      },
      {
        purpose: StoredFilePurpose.CERTIFICATE,
        ownerUserId: String(cert.holderUserId),
        folder: 'certificates',
      },
    );

    const file = await StoredFileModel.create({
      originalName: `certificate-${cert.certificateNumber}.pdf`,
      mimeType: 'application/pdf',
      size: pdf.length,
      provider: uploaded.provider,
      providerFileId: uploaded.storageKey,
      url: uploaded.publicUrl ?? null,
      folder: 'certificates',
      sha256: uploaded.sha256,
      purpose: StoredFilePurpose.CERTIFICATE,
      uploadedBy: cert.holderUserId,
      tenantId: cert.tenantId ?? null,
      linkedEntityType: StoredEntityType.CERTIFICATE,
      linkedEntityId: cert._id,
    });

    await CertificateModel.updateOne(
      { _id: cert._id },
      { $set: { pdfFileId: file._id } },
    );

    getLogger().info(
      { certificateId: String(cert._id), fileId: String(file._id) },
      'certificate.pdf_rendered',
    );

    return { ok: true, fileId: String(file._id) };
  }
}

export const certificateIssueWorkflow = new CertificateIssueWorkflow();
