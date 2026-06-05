import { Router } from 'express';
import { validateRequest } from '../shared/http/index.js';
import { filesController } from './files.controller.js';
import {
  createStoredFileBodySchema,
  listStoredFilesQuerySchema,
  storedFileIdParamsSchema,
} from './files.validation.js';

export const filesRouter = Router();

filesRouter.get('/limits', filesController.limits);

filesRouter.post(
  '/',
  validateRequest({ body: createStoredFileBodySchema }),
  filesController.createMetadata,
);

filesRouter.get('/', validateRequest({ query: listStoredFilesQuerySchema }), filesController.listMetadata);

filesRouter.get(
  '/:id',
  validateRequest({ params: storedFileIdParamsSchema }),
  filesController.getMetadata,
);

/**
 * Resolve a short-lived download URL for a stored file. For disk/public-read S3 this is the
 * public URL; for private S3 this is a presigned GET URL.
 */
filesRouter.get(
  '/:id/url',
  validateRequest({ params: storedFileIdParamsSchema }),
  filesController.getSignedUrl,
);

filesRouter.delete(
  '/:id',
  validateRequest({ params: storedFileIdParamsSchema }),
  filesController.deleteMetadata,
);
