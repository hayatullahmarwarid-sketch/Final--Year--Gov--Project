import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from './StorageProvider.js';

/**
 * S3-compatible storage (AWS S3, MinIO, Cloudflare R2, Wasabi, …).
 * Private-by-default: downloads flow through presigned URLs. Flip `publicRead=true`
 * only for avatars / homepage banners where you explicitly want CDN-cacheable public bytes.
 */
export class S3StorageProvider extends StorageProvider {
  /**
   * @param {{
   *   bucket: string,
   *   region: string,
   *   endpoint?: string,
   *   forcePathStyle?: boolean,
   *   publicRead?: boolean,
   *   publicBaseUrl?: string | null,
   *   accessKeyId?: string,
   *   secretAccessKey?: string,
   *   defaultSignedUrlTtlSeconds?: number,
   * }} config
   */
  constructor(config) {
    super();
    this.bucket = config.bucket;
    this.publicRead = Boolean(config.publicRead);
    this.publicBaseUrl = config.publicBaseUrl?.replace(/\/$/, '') ?? null;
    this.defaultTtl = config.defaultSignedUrlTtlSeconds ?? 15 * 60;
    /** @type {import('@aws-sdk/client-s3').S3ClientConfig} */
    const clientConfig = {
      region: config.region,
      forcePathStyle: Boolean(config.forcePathStyle),
    };
    if (config.endpoint) clientConfig.endpoint = config.endpoint;
    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    }
    this.client = new S3Client(clientConfig);
  }

  get providerName() {
    return 's3';
  }

  /**
   * @param {string} originalName
   * @param {string} mimeType
   */
  static extensionFor(originalName, mimeType) {
    const ext = path.extname(originalName || '').toLowerCase();
    if (ext && /^\.[a-z0-9._-]+$/i.test(ext) && ext.length <= 16) return ext;
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return '.jpg';
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/webp') return '.webp';
    if (mimeType === 'image/gif') return '.gif';
    if (mimeType === 'application/pdf') return '.pdf';
    return '';
  }

  /**
   * @param {import('./StorageProvider.js').StorageUploadInput} file
   * @param {import('./StorageProvider.js').StorageUploadOptions} [options]
   * @returns {Promise<import('./StorageProvider.js').StorageUploadResult>}
   */
  async upload(file, options = {}) {
    const ext = S3StorageProvider.extensionFor(file.originalName, file.mimeType);
    const folder = options.folder ? options.folder.replace(/^\/+|\/+$/g, '') : '';
    const key = folder ? `${folder}/${randomUUID()}${ext || '.bin'}` : `${randomUUID()}${ext || '.bin'}`;
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimeType,
        ContentLength: file.size,
        ChecksumSHA256: Buffer.from(sha256, 'hex').toString('base64'),
        Metadata: {
          ...(options.ownerUserId ? { 'owner-user-id': options.ownerUserId } : {}),
          ...(options.purpose ? { purpose: options.purpose } : {}),
        },
        ACL: this.publicRead ? 'public-read' : undefined,
      }),
    );

    const publicUrl = this.publicRead && this.publicBaseUrl ? `${this.publicBaseUrl}/${key}` : undefined;

    return {
      storageKey: key,
      provider: this.providerName,
      size: file.size,
      sha256,
      publicUrl,
    };
  }

  /**
   * @param {string} storageKey
   * @param {{ ttlSeconds?: number, download?: boolean, filename?: string }} [options]
   */
  async getSignedUrl(storageKey, options = {}) {
    if (this.publicRead && this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${storageKey}`;
    }
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ResponseContentDisposition: options.download
        ? `attachment; filename="${options.filename ?? path.basename(storageKey)}"`
        : undefined,
    });
    return s3GetSignedUrl(this.client, cmd, { expiresIn: options.ttlSeconds ?? this.defaultTtl });
  }

  /** @param {string} storageKey */
  async delete(storageKey) {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
      return { deleted: true };
    } catch (err) {
      if (err && typeof err === 'object' && 'name' in err && err.name === 'NoSuchKey') {
        return { deleted: false };
      }
      throw err;
    }
  }

  /** @param {string} storageKey */
  async head(storageKey) {
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }));
      return {
        size: typeof res.ContentLength === 'number' ? res.ContentLength : 0,
        mimeType: res.ContentType ?? null,
      };
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'name' in err &&
        (err.name === 'NotFound' || err.name === 'NoSuchKey')
      ) {
        return null;
      }
      throw err;
    }
  }
}
