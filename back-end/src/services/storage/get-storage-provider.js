import path from 'node:path';
import { getEnv } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';
import { HttpStatus } from '../../core/errors/http-status.js';
import { DiskStorageProvider } from './DiskStorageProvider.js';
import { S3StorageProvider } from './S3StorageProvider.js';

/** @type {import('./StorageProvider.js').StorageProvider | null} */
let cached = null;
/** @type {string | null} */
let cacheKey = null;

/**
 * Returns the configured storage implementation (singleton per process).
 * @returns {import('./StorageProvider.js').StorageProvider}
 */
export function getStorageProvider() {
  const env = getEnv();
  const key = `${env.STORAGE_PROVIDER}:${env.UPLOAD_DIR}:${env.S3_BUCKET ?? ''}:${env.S3_REGION ?? ''}`;
  if (cached && cacheKey === key) {
    return cached;
  }

  if (env.STORAGE_PROVIDER === 'disk') {
    const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    cached = new DiskStorageProvider({ uploadDir, publicPathSegment: 'uploads' });
    cacheKey = key;
    return cached;
  }

  if (env.STORAGE_PROVIDER === 's3') {
    if (!env.S3_BUCKET || !env.S3_REGION) {
      throw new AppError('S3 storage is selected but S3_BUCKET / S3_REGION are missing', {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'STORAGE_MISCONFIGURED',
      });
    }
    cached = new S3StorageProvider({
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      publicRead: env.S3_PUBLIC_READ,
      publicBaseUrl: env.S3_PUBLIC_BASE_URL ?? null,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      defaultSignedUrlTtlSeconds: env.S3_SIGNED_URL_TTL_SECONDS,
    });
    cacheKey = key;
    return cached;
  }

  throw new AppError(`Unknown STORAGE_PROVIDER: ${env.STORAGE_PROVIDER}`, {
    statusCode: HttpStatus.BAD_REQUEST,
    code: 'INVALID_STORAGE_PROVIDER',
  });
}

/** Reset the provider singleton (used by tests / hot-reload). */
export function resetStorageProviderForTests() {
  cached = null;
  cacheKey = null;
}
