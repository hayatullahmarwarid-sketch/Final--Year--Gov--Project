import path from 'node:path';
import mongoose from 'mongoose';
import { StoredFileModel } from '../../../database/models/stored-file.model.js';
import { getEnv } from '../../config/env.js';
import { StoredFilePurpose } from '../../modules/shared/constants/stored-file-purpose.js';
import { getStorageProvider } from './get-storage-provider.js';

const DISK_PUBLIC_PATH_SEGMENT = 'uploads';
const DEFAULT_TMP_SUBDIR = '_tmp';
const MAX_PDF_PAGECOUNT_BYTES = 10 * 1024 * 1024;

/**
 * @param {string} originalname
 * @param {string} mimetype
 * @returns {string} Leading dot (lowercase) or empty string.
 */
function extensionFromOriginalName(originalname, mimetype) {
  const ext = path.extname(originalname || '').toLowerCase();
  if (ext && /^\.[a-z0-9._-]+$/i.test(ext) && ext.length <= 16) return ext;
  const m = String(mimetype || '').toLowerCase();
  if (m === 'application/pdf' || m.includes('pdf')) return '.pdf';
  if (m.includes('wordprocessingml') || m.includes('officedocument.wordprocessingml')) return '.docx';
  if (m.includes('msword')) return '.doc';
  if (m === 'image/jpeg' || m === 'image/jpg') return '.jpg';
  if (m === 'image/png') return '.png';
  if (m === 'image/webp') return '.webp';
  if (m === 'image/gif') return '.gif';
  return '';
}

/**
 * @param {string} p
 * @returns {string}
 */
function normalizeFolder(p) {
  const raw = String(p ?? '').trim();
  if (!raw) return '';
  // Mirror route validation but also strip leading/trailing slashes.
  const cleaned = raw.replace(/^\/+|\/+$/g, '');
  return cleaned;
}

/**
 * @param {string} absPath
 * @returns {Promise<boolean>}
 */
async function fileExists(absPath) {
  try {
    const { access, constants } = await import('node:fs/promises');
    await access(absPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} absPath
 * @returns {Promise<string>}
 */
async function sha256OfFile(absPath) {
  const { createReadStream } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(absPath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Best-effort PDF page count without loading huge files into RAM.
 * @param {{ absPath: string, size: number, mimetype: string, originalname: string }} args
 * @returns {Promise<number | null>}
 */
async function tryPdfPageCountFromDisk(args) {
  const mime = String(args.mimetype || '').toLowerCase();
  const name = String(args.originalname || '').toLowerCase();
  const looksPdf = mime === 'application/pdf' || mime === 'application/x-pdf' || name.endsWith('.pdf');
  if (!looksPdf) return null;
  if (!Number.isFinite(args.size) || args.size <= 0 || args.size > MAX_PDF_PAGECOUNT_BYTES) return null;
  try {
    const { readFile } = await import('node:fs/promises');
    const buffer = await readFile(args.absPath);
    return tryPdfPageCount(buffer);
  } catch {
    return null;
  }
}

/**
 * Ensure an existing StoredFile row still has bytes at its provider location before dedup reuse.
 *
 * @param {import('../../../database/models/stored-file.model.js').StoredFileModel | Record<string, any>} existing
 * @returns {Promise<boolean>}
 */
async function providerBytesExistForRow(existing) {
  const provider = String(existing?.provider ?? '').toLowerCase();
  const key = String(existing?.providerFileId ?? '');
  if (!provider || !key) return false;

  if (provider === 'disk') {
    try {
      const abs = getAbsoluteDiskPathForStorageKey(key);
      return fileExists(abs);
    } catch {
      return false;
    }
  }

  if (provider === 's3') {
    // Only attempt head when the current runtime is configured for S3.
    const storage = getStorageProvider();
    if (storage.providerName !== 's3') return false;
    try {
      const head = await storage.head(key);
      return Boolean(head && typeof head.size === 'number' && head.size >= 0);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * When disk storage returns a path-only public URL (e.g. `/uploads/...`), clients that are not
 * same-origin (Expo) need an absolute `https?://` URL. Uses `APP_PUBLIC_BASE_URL` when set.
 * @param {string | null | undefined} href
 * @returns {string | null | undefined}
 */
function absolutizeIfDiskPath(href) {
  if (href == null || typeof href !== 'string') return href;
  const t = href.trim();
  if (!t) return href;
  if (!t.startsWith('/') || t.startsWith('//')) return href;
  const base = getEnv().APP_PUBLIC_BASE_URL;
  if (!base) return href;
  return `${String(base).replace(/\/$/, '')}${t}`;
}

/**
 * Absolute on-disk path for a disk-stored file key (same path rules as `DiskStorageProvider`).
 * @param {string} providerFileId
 * @returns {string}
 */
export function getAbsoluteDiskPathForStorageKey(providerFileId) {
  const uploadDir = path.resolve(process.cwd(), getEnv().UPLOAD_DIR);
  const trimmed = String(providerFileId ?? '').replace(/^\/+/, '');
  const cleaned = trimmed.startsWith(`${DISK_PUBLIC_PATH_SEGMENT}/`)
    ? trimmed.slice(DISK_PUBLIC_PATH_SEGMENT.length + 1)
    : trimmed;
  const resolved = path.resolve(uploadDir, cleaned);
  const root = path.resolve(uploadDir);
  if (!resolved.startsWith(root)) {
    throw new Error('Invalid storage key (path traversal attempt)');
  }
  return resolved;
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<number | null>}
 */
async function tryPdfPageCount(buffer) {
  if (!buffer?.length) return null;
  try {
    const mod = await import('pdf-parse');
    const pdfParse = mod.default ?? mod;
    const data = await pdfParse(buffer);
    const n = typeof data.numpages === 'number' ? data.numpages : null;
    return n != null && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * @typedef {object} PersistUploadInput
 * @property {{ originalname: string, mimetype: string, size: number, buffer: Buffer }} file Multer file (memory storage).
 * @property {string} [ownerUserId]  Mongo ObjectId string; required for dedup + tenancy.
 * @property {string} [purpose]      One of StoredFilePurpose values; defaults to OTHER.
 * @property {string} [folder]       Provider-side folder hint (`avatars/`, `decrees/`, …).
 * @property {string} [tenantId]
 *
 * @typedef {object} PersistUploadResult
 * @property {string}  fileId        StoredFile `_id`.
 * @property {string}  storageKey    Provider key.
 * @property {string}  provider
 * @property {string}  sha256
 * @property {number}  size
 * @property {boolean} deduplicated  True when we reused an existing row.
 * @property {string | null} url     Public URL when available; null when signed URL is required.
 */

/**
 * Uploads the bytes via the configured StorageProvider AND persists a StoredFile row.
 * When the same owner already has a live row with the same sha256, the existing row is reused
 * (dedup) and no provider call is made.
 *
 * @param {PersistUploadInput} input
 * @returns {Promise<PersistUploadResult>}
 */
export async function persistUpload(input) {
  const { file } = input;
  if (!file?.buffer || typeof file.size !== 'number') {
    throw new Error('persistUpload requires a multer memory-storage file');
  }

  const ownerUserId =
    input.ownerUserId && mongoose.Types.ObjectId.isValid(input.ownerUserId)
      ? new mongoose.Types.ObjectId(input.ownerUserId)
      : null;
  const purpose = input.purpose ?? StoredFilePurpose.OTHER;
  const tenantId = input.tenantId ?? null;

  // Dedup: hash the bytes up front (cheap for <10MB files we actually accept).
  // The provider will also compute the hash, but doing it now lets us short-circuit.
  const { createHash } = await import('node:crypto');
  const sha256 = createHash('sha256').update(file.buffer).digest('hex');

  if (ownerUserId) {
    const existing = await StoredFileModel.findOne({
      uploadedBy: ownerUserId,
      sha256,
      isDeleted: false,
    }).lean();
    if (existing) {
      // Dedup reuse is safe only if the provider bytes still exist (uploads dir cleared, S3 object removed, etc.).
      if (!(await providerBytesExistForRow(existing))) {
        // Treat as stale and re-upload below.
      } else {
      return {
        fileId: String(existing._id),
        storageKey: existing.providerFileId,
        provider: existing.provider,
        sha256,
        size: existing.size,
        deduplicated: true,
        url: existing.url ?? null,
        pdfPageCount: typeof existing.pdfPageCount === 'number' ? existing.pdfPageCount : null,
      };
      }
    }
  }

  let pdfPageCount = null;
  const mime = String(file.mimetype || '').toLowerCase();
  const name = String(file.originalname || '').toLowerCase();
  const looksPdf = mime === 'application/pdf' || mime === 'application/x-pdf' || name.endsWith('.pdf');
  if (looksPdf) {
    pdfPageCount = await tryPdfPageCount(file.buffer);
  }

  const storage = getStorageProvider();
  const uploaded = await storage.upload(
    {
      originalName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    },
    {
      purpose,
      ownerUserId: ownerUserId ? String(ownerUserId) : undefined,
      folder: input.folder,
    },
  );

  const row = await StoredFileModel.create({
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    provider: uploaded.provider,
    providerFileId: uploaded.storageKey,
    url: uploaded.publicUrl ?? null,
    folder: input.folder ?? null,
    sha256: uploaded.sha256,
    pdfPageCount,
    purpose,
    uploadedBy: ownerUserId,
    tenantId,
  });

  return {
    fileId: String(row._id),
    storageKey: uploaded.storageKey,
    provider: uploaded.provider,
    sha256: uploaded.sha256,
    size: file.size,
    deduplicated: false,
    url: uploaded.publicUrl ?? null,
    pdfPageCount,
  };
}

/**
 * Persist an upload that has already been written to disk by multer (disk storage).
 * This avoids buffering large PDFs in RAM.
 *
 * @param {{
 *   file: { path: string, originalname: string, mimetype: string, size: number },
 *   ownerUserId?: string,
 *   purpose?: string,
 *   folder?: string,
 *   tenantId?: string,
 * }} input
 */
export async function persistUploadFromDiskFile(input) {
  const file = input?.file;
  const tmpPath = String(file?.path ?? '');
  if (!tmpPath) {
    throw new Error('persistUploadFromDiskFile requires a multer disk-storage file path');
  }
  const size = Number(file?.size ?? NaN);
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('Uploaded file is empty');
  }

  const ownerUserId =
    input.ownerUserId && mongoose.Types.ObjectId.isValid(input.ownerUserId)
      ? new mongoose.Types.ObjectId(input.ownerUserId)
      : null;
  const purpose = input.purpose ?? StoredFilePurpose.OTHER;
  const tenantId = input.tenantId ?? null;
  const folder = normalizeFolder(input.folder);

  const sha256 = await sha256OfFile(tmpPath);

  if (ownerUserId) {
    const existing = await StoredFileModel.findOne({
      uploadedBy: ownerUserId,
      sha256,
      isDeleted: false,
    }).lean();
    if (existing) {
      if (await providerBytesExistForRow(existing)) {
        // Cleanup temp file (multer wrote it) then reuse existing row.
        try {
          const { unlink } = await import('node:fs/promises');
          await unlink(tmpPath);
        } catch {
          /* best-effort */
        }
        return {
          fileId: String(existing._id),
          storageKey: existing.providerFileId,
          provider: existing.provider,
          sha256,
          size: existing.size,
          deduplicated: true,
          url: existing.url ?? null,
          pdfPageCount: typeof existing.pdfPageCount === 'number' ? existing.pdfPageCount : null,
        };
      }
    }
  }

  const storage = getStorageProvider();

  let pdfPageCount = null;
  try {
    pdfPageCount = await tryPdfPageCountFromDisk({
      absPath: tmpPath,
      size,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });
  } catch {
    pdfPageCount = null;
  }

  /** @type {{ storageKey: string, provider: string, size: number, sha256: string, publicUrl?: string }} */
  let uploaded;

  try {
    if (storage.providerName === 'disk') {
      const { randomUUID } = await import('node:crypto');
      const uploadRoot = path.resolve(process.cwd(), getEnv().UPLOAD_DIR);
      const ext = extensionFromOriginalName(file.originalname, file.mimetype) || '.bin';
      const filename = `${randomUUID()}${ext}`;
      const relative = folder ? `${folder}/${filename}` : filename;
      const destDir = folder ? path.resolve(uploadRoot, folder) : uploadRoot;
      const destAbs = path.join(uploadRoot, relative);

      // Ensure destination directory exists, then move temp into final location.
      const { mkdir, rename, unlink } = await import('node:fs/promises');
      await mkdir(destDir, { recursive: true });
      try {
        await rename(tmpPath, destAbs);
      } catch {
        // Cross-device rename fallback: copy then unlink.
        const { copyFile } = await import('node:fs/promises');
        await copyFile(tmpPath, destAbs);
        await unlink(tmpPath);
      }

      const storageKey = `${DISK_PUBLIC_PATH_SEGMENT}/${relative}`.replace(/\\/g, '/');
      uploaded = {
        storageKey,
        provider: 'disk',
        size,
        sha256,
        publicUrl: `/${storageKey}`,
      };
    } else if (storage.providerName === 's3') {
      // Stream upload from disk (avoid buffering).
      const { randomUUID } = await import('node:crypto');
      const { createReadStream } = await import('node:fs');
      const ext = extensionFromOriginalName(file.originalname, file.mimetype) || '.bin';
      const key = folder ? `${folder}/${randomUUID()}${ext}` : `${randomUUID()}${ext}`;

      // Use the S3 provider's underlying client if present; otherwise, fall back to reading into memory.
      if ('client' in storage && 'bucket' in storage && storage.client && storage.bucket) {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        await storage.client.send(
          new PutObjectCommand({
            Bucket: storage.bucket,
            Key: key,
            Body: createReadStream(tmpPath),
            ContentType: file.mimetype,
            ContentLength: size,
            Metadata: {
              ...(ownerUserId ? { 'owner-user-id': String(ownerUserId) } : {}),
              ...(purpose ? { purpose: String(purpose) } : {}),
            },
          }),
        );
        uploaded = { storageKey: key, provider: 's3', size, sha256 };
      } else {
        const { readFile } = await import('node:fs/promises');
        const buffer = await readFile(tmpPath);
        uploaded = await storage.upload(
          {
            originalName: file.originalname,
            mimeType: file.mimetype,
            buffer,
            size,
          },
          {
            purpose,
            ownerUserId: ownerUserId ? String(ownerUserId) : undefined,
            folder,
          },
        );
      }

      // Always remove multer temp file after uploading to remote.
      try {
        const { unlink } = await import('node:fs/promises');
        await unlink(tmpPath);
      } catch {
        /* best-effort */
      }
    } else {
      throw new Error(`Unsupported storage provider: ${storage.providerName}`);
    }
  } catch (err) {
    // Ensure temp file isn't left behind on failure.
    try {
      const { unlink } = await import('node:fs/promises');
      await unlink(tmpPath);
    } catch {
      /* best-effort */
    }
    throw err;
  }

  const row = await StoredFileModel.create({
    originalName: file.originalname,
    mimeType: file.mimetype,
    size,
    provider: uploaded.provider,
    providerFileId: uploaded.storageKey,
    url: uploaded.publicUrl ?? null,
    folder: folder || null,
    sha256: uploaded.sha256 ?? sha256,
    pdfPageCount,
    purpose,
    uploadedBy: ownerUserId,
    tenantId,
  });

  return {
    fileId: String(row._id),
    storageKey: uploaded.storageKey,
    provider: uploaded.provider,
    sha256: uploaded.sha256 ?? sha256,
    size,
    deduplicated: false,
    url: uploaded.publicUrl ?? null,
    pdfPageCount,
  };
}

/**
 * Resolve a (possibly signed) URL for a given StoredFile id, computing it via the provider when
 * the row doesn't have a cached public URL.
 *
 * @param {string} fileId
 * @param {{ ttlSeconds?: number, download?: boolean }} [options]
 * @returns {Promise<string | null>}
 */
export async function resolveStoredFileUrl(fileId, options = {}) {
  if (!mongoose.Types.ObjectId.isValid(fileId)) return null;
  const row = await StoredFileModel.findById(fileId).lean();
  if (!row || row.isDeleted) return null;
  if (row.url) return absolutizeIfDiskPath(row.url);
  const storage = getStorageProvider();
  if (storage.providerName !== row.provider) {
    // Row was persisted under a different provider (e.g. older disk upload while we're on S3).
    // Skip signing in that case — caller should treat as missing and surface an upgrade task.
    return null;
  }
  const signed = await storage.getSignedUrl(row.providerFileId, {
    ttlSeconds: options.ttlSeconds,
    download: options.download,
    filename: row.originalName,
  });
  return absolutizeIfDiskPath(signed) ?? signed;
}

/**
 * Soft-delete a StoredFile row (marks `deletedAt` + `isDeleted`). The bytes are reaped later
 * by the `files.gc` background job (Phase 4). Safe against double-delete.
 *
 * @param {string} fileId
 * @returns {Promise<{ ok: boolean }>}
 */
export async function softDeleteStoredFile(fileId) {
  if (!mongoose.Types.ObjectId.isValid(fileId)) return { ok: false };
  const res = await StoredFileModel.updateOne(
    { _id: fileId, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date() } },
  );
  return { ok: res.modifiedCount > 0 };
}
