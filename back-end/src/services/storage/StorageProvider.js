/**
 * Provider-agnostic file storage contract. Providers MUST be async-safe and idempotent on `delete`.
 * `head()` returning `null` means the object does not exist (do NOT throw).
 *
 * @typedef {object} StorageUploadInput
 * @property {string} originalName
 * @property {string} mimeType
 * @property {Buffer} buffer
 * @property {number} size
 *
 * @typedef {object} StorageUploadOptions
 * @property {string} [purpose]        Logical purpose (see `StoredFilePurpose`).
 * @property {string} [ownerUserId]    Owner id (ObjectId string) for auditing / tenancy.
 * @property {string} [folder]         Optional namespace prefix (e.g. `avatars/`).
 *
 * @typedef {object} StorageUploadResult
 * @property {string} storageKey      Provider-specific key (file path, S3 key, …).
 * @property {string} provider        `'disk' | 's3' | …` — matches StoredFile.provider.
 * @property {number} size
 * @property {string} sha256          Hex-encoded SHA-256 of the uploaded bytes.
 * @property {string} [publicUrl]     Directly-accessible URL when the object is public.
 */
export class StorageProvider {
  /**
   * Persist a file and return stable identifiers. Implementations MUST compute sha256 from the
   * stored bytes (not from the input buffer reference) to survive multer streaming changes.
   *
   * @param {StorageUploadInput} _file
   * @param {StorageUploadOptions} [_options]
   * @returns {Promise<StorageUploadResult>}
   */
  async upload(_file, _options = {}) {
    throw new Error('StorageProvider.upload() must be implemented');
  }

  /**
   * Resolve a URL for a stored `storageKey`. Providers that only support public URLs return the
   * same URL regardless of `ttlSeconds`.
   *
   * @param {string} _storageKey
   * @param {{ ttlSeconds?: number, download?: boolean, filename?: string }} [_options]
   * @returns {Promise<string>}
   */
  async getSignedUrl(_storageKey, _options = {}) {
    throw new Error('StorageProvider.getSignedUrl() must be implemented');
  }

  /**
   * Idempotent delete. No-op when the object does not exist.
   * @param {string} _storageKey
   * @returns {Promise<{ deleted: boolean }>}
   */
  async delete(_storageKey) {
    throw new Error('StorageProvider.delete() must be implemented');
  }

  /**
   * Returns a metadata summary or `null` when the object does not exist.
   * @param {string} _storageKey
   * @returns {Promise<{ size: number, mimeType?: string | null } | null>}
   */
  async head(_storageKey) {
    throw new Error('StorageProvider.head() must be implemented');
  }

  /**
   * Provider identifier matching `StoredFile.provider`.
   * @returns {string}
   */
  get providerName() {
    return 'abstract';
  }
}
