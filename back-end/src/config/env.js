import { z } from 'zod';

/**
 * Env booleans are strings; `Boolean('false')` is true, so coerce carefully.
 * @param {unknown} val
 * @param {boolean} defaultValue
 */
function boolFromEnv(val, defaultValue) {
  if (val === undefined || val === null || val === '') return defaultValue;
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'off'].includes(s)) return false;
  return defaultValue;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CORS_ORIGIN: z.string().default('*'),
  /** Max single upload (decree PDFs, etc.); 30MB default to allow large scans. */
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(30 * 1024 * 1024),

  /** MongoDB pool + timeout tuning (Phase 3). Defaults scale to ~1 mid-size worker. */
  MONGO_MAX_POOL_SIZE: z.coerce.number().int().positive().default(50),
  MONGO_MIN_POOL_SIZE: z.coerce.number().int().nonnegative().default(5),
  MONGO_SOCKET_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
  MONGO_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  MONGO_HEARTBEAT_FREQUENCY_MS: z.coerce.number().int().positive().default(10_000),

  STORAGE_PROVIDER: z.enum(['disk', 's3']).default('disk'),
  /** Directory on disk for `disk` provider (relative to process cwd unless absolute). Served at `/uploads`. */
  UPLOAD_DIR: z.string().min(1).default('uploads'),

  /** S3 provider (used when STORAGE_PROVIDER=s3). Also supports MinIO / R2 / Wasabi. */
  S3_BUCKET: z.string().trim().min(1).optional(),
  S3_REGION: z.string().trim().min(1).optional(),
  /** Custom endpoint for MinIO / R2. Omit for AWS S3. */
  S3_ENDPOINT: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().url().optional()),
  /** MinIO / R2 usually require path-style addressing. */
  S3_FORCE_PATH_STYLE: z.preprocess((v) => boolFromEnv(v, false), z.boolean()),
  /** Public-read objects (avatars, banners). Default false = private with presigned URLs. */
  S3_PUBLIC_READ: z.preprocess((v) => boolFromEnv(v, false), z.boolean()),
  /** CDN / public base URL to prepend when publicRead is true. */
  S3_PUBLIC_BASE_URL: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().url().optional()),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),

  /** Expo push access token (optional; Expo works without one for low volume). */
  EXPO_ACCESS_TOKEN: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().min(1).optional()),

  /**
   * Firebase Admin service account JSON (entire file contents as one line or pretty JSON).
   * Required on the API for FCM Android/Web native tokens. Omit if only Expo push is used.
   */
  FIREBASE_SERVICE_ACCOUNT_JSON: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().min(10).optional()),

  /** Public Firebase web SDK config (safe to expose to browsers; used by `/public-config/firebase-web`). */
  FIREBASE_WEB_API_KEY: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().min(1).optional()),
  FIREBASE_WEB_AUTH_DOMAIN: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().min(1).optional()),
  FIREBASE_WEB_PROJECT_ID: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().min(1).optional()),
  FIREBASE_WEB_STORAGE_BUCKET: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().min(1).optional()),
  FIREBASE_WEB_MESSAGING_SENDER_ID: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().min(1).optional()),
  FIREBASE_WEB_APP_ID: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().min(1).optional()),
  /** Web Push certificate / VAPID public key from Firebase console → Cloud Messaging. */
  FIREBASE_WEB_VAPID_KEY: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().min(1).optional()),

  /** Public-facing API base URL, used to embed verify URLs in certificates, push data, etc. */
  APP_PUBLIC_BASE_URL: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim().replace(/\/$/, '') : undefined), z.string().url().optional()),

  /** Bearer token required to scrape `/metrics`. When unset, the endpoint is hidden (404). */
  METRICS_TOKEN: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().min(8).optional()),
  /**
   * Optional Mongo ObjectId string used as the public “actor” when `X-Public-User-Id` is absent.
   * Enables local development of bookmarks, attempts, and notifications without auth wiring.
   */
  PUBLIC_API_STANDALONE_USER_ID: z.string().trim().optional(),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  /** Used as HMAC key for hashing opaque refresh tokens persisted in MongoDB. */
  JWT_REFRESH_SECRET: z.string().min(8, 'JWT_REFRESH_SECRET must be at least 8 characters'),
  /** Access JWT lifetime in seconds (default 15 minutes). */
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  /** Refresh token lifetime in seconds (default 30 days). */
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(30 * 24 * 60 * 60),
  /**
   * HMAC key for `audit_logs.integrityHash`.
   * When omitted, the API derives a stable key from `JWT_REFRESH_SECRET` at boot (set explicitly in production for key rotation independence).
   */
  AUDIT_LOG_INTEGRITY_SECRET: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().min(8).optional()),
  /** Worker cron: delete `audit_logs` older than this many days (see `runAuditLogPruneTick`). */
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
  /** When false, the worker skips `node-cron` schedules (queues still run). */
  WORKER_CRON_ENABLED: z.preprocess((v) => boolFromEnv(v, true), z.boolean()),

  /** When set with `SMTP_PORT` and `MAIL_FROM`, the API can send outbound email (e.g. verification). */
  SMTP_HOST: z.string().trim().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  /** Use TLS on the SMTP port (typical for 465). */
  SMTP_SECURE: z.preprocess((val) => boolFromEnv(val, false), z.boolean()),
  /**
   * For port 587 + `SMTP_SECURE=false`, STARTTLS is enabled by default (`requireTLS: true`).
   * Set to `false` only for broken legacy relays (not recommended).
   */
  SMTP_REQUIRE_TLS: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return boolFromEnv(val, true);
  }, z.boolean().optional()),
  /** Set to `false` only for local dev mail catchers with self-signed certs (e.g. Mailpit). */
  SMTP_TLS_REJECT_UNAUTHORIZED: z.preprocess((val) => boolFromEnv(val, true), z.boolean()),
  /** Skip `transporter.verify()` on API boot (faster local start; less visibility when SMTP is misconfigured). */
  SMTP_SKIP_BOOT_VERIFY: z.preprocess((val) => boolFromEnv(val, false), z.boolean()),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** Envelope `from` (e.g. `noreply@example.com` or `Name <noreply@example.com>`). */
  MAIL_FROM: z.string().trim().min(1).optional(),
  /** Deep-link base for verification / password-reset links (https or exp:// for Expo dev; no trailing slash). */
  EMAIL_VERIFICATION_APP_URL: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().min(1).optional()),
  EMAIL_VERIFICATION_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(24 * 60 * 60),
  /** Optional separate HMAC key for email verification tokens; defaults to `JWT_REFRESH_SECRET`. */
  EMAIL_VERIFICATION_HMAC_SECRET: z.string().min(8).optional(),
  PASSWORD_RESET_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60),
  PASSWORD_RESET_HMAC_SECRET: z.string().min(8).optional(),

  /**
   * Redis connection URL, e.g. `redis://127.0.0.1:6379`. Optional in dev:
   * when unset, the rate-limit middleware uses an in-memory store and the job queue
   * runs jobs in-process (see Phase 4).
   */
  REDIS_URL: z
    .preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined), z.string().url().optional()),

  /** Enable/disable all rate limiting (useful for load tests). */
  RATE_LIMIT_ENABLED: z.preprocess((v) => boolFromEnv(v, true), z.boolean()),

  /** Failed-login lockout policy (Phase 1). */
  LOGIN_MAX_FAILS: z.coerce.number().int().positive().default(8),
  LOGIN_FAIL_WINDOW_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  LOGIN_LOCK_SECONDS: z.coerce.number().int().positive().default(15 * 60),

  /**
   * 2FA seam (Phase 1). When `REQUIRE_2FA=true` the `/auth/2fa/*` routes activate and
   * users with `totpEnabledAt` must complete challenge before a session is issued.
   * Default `false` — the schema is in place but the feature is dormant.
   */
  REQUIRE_2FA: z.preprocess((v) => boolFromEnv(v, false), z.boolean()),

  /**
   * Block the `X-Public-User-Id`, `X-Inspector-User-Id`, and `PUBLIC_API_STANDALONE_USER_ID`
   * dev-only bypasses at runtime. Default is `false` in dev/test and `true` in production
   * (forced via the NODE_ENV check below).
   */
  DISABLE_DEV_AUTH_HEADERS: z
    .preprocess((v) => (v === undefined || v === null || v === '' ? undefined : boolFromEnv(v, false)), z.boolean().optional()),
})
  .superRefine((data, ctx) => {
    const host = data.SMTP_HOST?.trim();
    if (host && (!data.SMTP_PORT || !data.MAIL_FROM?.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SMTP_PORT and MAIL_FROM are required when SMTP_HOST is set',
        path: ['SMTP_HOST'],
      });
    }

    if (data.NODE_ENV === 'production') {
      if (process.env.RBAC_ENFORCED === 'false') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'RBAC_ENFORCED=false is forbidden in production',
          path: ['NODE_ENV'],
        });
      }
      if (data.PUBLIC_API_STANDALONE_USER_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PUBLIC_API_STANDALONE_USER_ID is a dev-only header bypass; unset it in production',
          path: ['PUBLIC_API_STANDALONE_USER_ID'],
        });
      }
      if (data.DISABLE_DEV_AUTH_HEADERS === false) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'DISABLE_DEV_AUTH_HEADERS=false is forbidden in production',
          path: ['DISABLE_DEV_AUTH_HEADERS'],
        });
      }
    }
  });

let cached;

/**
 * Validated process.env. Throws on boot if invalid.
 * @returns {z.infer<typeof envSchema>}
 */
export function getEnv() {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(detail)}`);
  }
  const data = { ...parsed.data };
  if (!data.AUDIT_LOG_INTEGRITY_SECRET) {
    data.AUDIT_LOG_INTEGRITY_SECRET = `${data.JWT_REFRESH_SECRET}:sharia-audit-integrity-v1`;
  }
  // Default DISABLE_DEV_AUTH_HEADERS: true in production, false elsewhere.
  if (data.DISABLE_DEV_AUTH_HEADERS === undefined) {
    data.DISABLE_DEV_AUTH_HEADERS = data.NODE_ENV === 'production';
  }
  cached = data;
  return cached;
}
