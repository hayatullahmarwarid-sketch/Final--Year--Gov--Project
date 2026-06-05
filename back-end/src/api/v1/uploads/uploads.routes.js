import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getEnv } from '../../../config/env.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { authorize } from '../../../middlewares/authorize.middleware.js';
import { asyncHandler, validateRequest } from '../../../modules/shared/http/index.js';
import { HttpStatus } from '../../../core/errors/http-status.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { AppError, BadRequestError } from '../../../core/errors/app-error.js';
import { persistUpload } from '../../../services/storage/upload.service.js';
import { STORED_FILE_PURPOSE_KEYS } from '../../../modules/shared/constants/stored-file-purpose.js';
import { auditService } from '../../../services/audit/auditService.js';

const env = getEnv();

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES },
});

/**
 * Wraps multer middleware so `LIMIT_FILE_SIZE` becomes an `AppError` for the global error handler.
 * @param {import('express').RequestHandler} mw
 * @returns {import('express').RequestHandler}
 */
function wrapMulter(mw) {
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new AppError('File exceeds maximum allowed size', {
              statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
              code: 'PAYLOAD_TOO_LARGE',
              details: { maxBytes: env.MAX_UPLOAD_BYTES },
            }),
          );
        }
        return next(new BadRequestError(err.message, { multerCode: err.code }));
      }
      return next(err);
    });
  };
}

/** Roles that may attach files. */
const UPLOAD_ALLOWED_ROLES = ['public', 'inspector', 'dept_upload', 'inspector_admin', 'system_admin'];

const uploadQuerySchema = z
  .object({
    purpose: z.enum(/** @type {[string, ...string[]]} */ ([...STORED_FILE_PURPOSE_KEYS])).optional(),
    folder: z
      .string()
      .trim()
      .max(200)
      .regex(/^[a-zA-Z0-9_\-/]*$/, 'folder may only contain letters, digits, dash, underscore, slash')
      .optional(),
  })
  .strict();

export const uploadsRouter = Router();

uploadsRouter.post(
  '/',
  authenticate(),
  authorize(UPLOAD_ALLOWED_ROLES),
  validateRequest({ query: uploadQuerySchema }),
  wrapMulter(uploadMiddleware.single('file')),
  asyncHandler(async (req, res) => {
    if (!req.file?.buffer) {
      throw new BadRequestError('Missing file; send multipart field "file"');
    }
    if (req.file.size === 0 || req.file.buffer.length === 0) {
      throw new BadRequestError('Uploaded file is empty; re-attach the document and try again');
    }

    const result = await persistUpload({
      file: req.file,
      ownerUserId: req.user?.id,
      purpose: req.validated.query.purpose,
      folder: req.validated.query.folder,
    });

    await auditService.logFromRequest(req, 'file.upload', {
      resourceType: 'StoredFile',
      resourceId: result.fileId,
      summary: result.deduplicated ? 'Binary dedup-reused' : 'Binary uploaded',
      details: {
        mimeType: req.file.mimetype,
        size: req.file.size,
        provider: result.provider,
        storageKey: result.storageKey,
        deduplicated: result.deduplicated,
        purpose: req.validated.query.purpose ?? 'other',
      },
    });

    return sendSuccess(
      res,
      {
        fileId: result.fileId,
        storageKey: result.storageKey,
        provider: result.provider,
        size: result.size,
        sha256: result.sha256,
        deduplicated: result.deduplicated,
        // Back-compat: mobile clients expect `url`. Disk provider fills it; S3 private mode
        // returns null and callers should hit `GET /api/v1/files/:id/url` for a signed URL.
        url: result.url,
        pdfPageCount: result.pdfPageCount ?? null,
      },
      { statusCode: HttpStatus.CREATED, message: result.deduplicated ? 'File reused' : 'File uploaded' },
    );
  }),
);
