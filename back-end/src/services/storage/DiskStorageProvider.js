import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { StorageProvider } from './StorageProvider.js';

const DEFAULT_PUBLIC_PREFIX = 'uploads';

/**
 * @param {string} originalname
 * @param {string} mimetype
 * @returns {string} Leading dot, lowercase, or empty string when unknown.
 */
function extensionFromOriginalName(originalname, mimetype) {
  const ext = path.extname(originalname || '').toLowerCase();
  if (ext && /^\.[a-z0-9._-]+$/i.test(ext) && ext.length <= 16) {
    return ext;
  }
  if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') return '.jpg';
  if (mimetype === 'image/png') return '.png';
  if (mimetype === 'image/webp') return '.webp';
  if (mimetype === 'image/gif') return '.gif';
  if (mimetype === 'application/pdf') return '.pdf';
  return '';
}

export class DiskStorageProvider extends StorageProvider {
  /**
   * @param {{ uploadDir: string; publicPathSegment?: string }} config
   */
  constructor(config) {
    super();
    this.uploadDir = config.uploadDir;
    this.publicPathSegment = (config.publicPathSegment ?? DEFAULT_PUBLIC_PREFIX).replace(/^\/+|\/+$/g, '');
  }

  get providerName() {
    return 'disk';
  }

  async #ensureDir() {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  /**
   * @param {string} storageKey Relative to the upload root, e.g. `uploads/<uuid>.png`.
   */
  #resolveAbsolute(storageKey) {
    const trimmed = String(storageKey).replace(/^\/+/, '');
    // Strip the public segment prefix if present so we don't duplicate it.
    const cleaned = trimmed.startsWith(`${this.publicPathSegment}/`)
      ? trimmed.slice(this.publicPathSegment.length + 1)
      : trimmed;
    const resolved = path.resolve(this.uploadDir, cleaned);
    // Path traversal guard.
    if (!resolved.startsWith(path.resolve(this.uploadDir))) {
      throw new Error('Invalid storage key (path traversal attempt)');
    }
    return resolved;
  }

  /**
   * @param {import('./StorageProvider.js').StorageUploadInput} file
   * @param {import('./StorageProvider.js').StorageUploadOptions} [options]
   * @returns {Promise<import('./StorageProvider.js').StorageUploadResult>}
   */
  async upload(file, options = {}) {
    await this.#ensureDir();
    const ext = extensionFromOriginalName(file.originalName, file.mimeType);
    const folder = options.folder ? options.folder.replace(/^\/+|\/+$/g, '') : '';
    const filename = `${randomUUID()}${ext || '.bin'}`;

    const relative = folder ? `${folder}/${filename}` : filename;
    const destDir = path.resolve(this.uploadDir, folder);
    if (folder) {
      await fs.mkdir(destDir, { recursive: true });
    }
    const dest = path.join(this.uploadDir, relative);

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    await fs.writeFile(dest, file.buffer);

    const storageKey = `${this.publicPathSegment}/${relative}`;
    return {
      storageKey,
      provider: this.providerName,
      size: file.size,
      sha256,
      publicUrl: `/${storageKey}`,
    };
  }

  /**
   * @param {string} storageKey
   * @returns {Promise<string>}
   */
  async getSignedUrl(storageKey) {
    const trimmed = String(storageKey).replace(/^\/+/, '');
    // Disk uploads are served by Express `/uploads` statically; the "signed" URL is just the public path.
    return `/${trimmed}`;
  }

  /** @param {string} storageKey */
  async delete(storageKey) {
    const abs = this.#resolveAbsolute(storageKey);
    try {
      await fs.unlink(abs);
      return { deleted: true };
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
        return { deleted: false };
      }
      throw err;
    }
  }

  /** @param {string} storageKey */
  async head(storageKey) {
    const abs = this.#resolveAbsolute(storageKey);
    try {
      const stat = await fs.stat(abs);
      return { size: stat.size, mimeType: null };
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }
}
