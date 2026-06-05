import { asyncHandler, HttpStatus, sendPaginatedList, sendSuccess } from '../shared/http/index.js';
import { getRequestContext } from '../../middlewares/request-context.middleware.js';
import { NotFoundError } from '../../core/errors/app-error.js';
import { resolveStoredFileUrl } from '../../services/storage/upload.service.js';
import { filesService } from './files.service.js';
import { filesMetadataService } from './files-metadata.service.js';

export class FilesController {
  /**
   * @param {{
   *   files?: import('./files.service.js').FilesService,
   *   metadata?: import('./files-metadata.service.js').FilesMetadataService,
   * }} [services]
   */
  constructor(services = {}) {
    this.files = services.files ?? filesService;
    this.metadata = services.metadata ?? filesMetadataService;
  }

  limits = asyncHandler(async (_req, res) => {
    return sendSuccess(res, this.files.getUploadLimits());
  });

  createMetadata = asyncHandler(async (req, res) => {
    const ctx = getRequestContext(req);
    const actorUserId = ctx.actor?.id ?? undefined;
    const created = await this.metadata.createMetadata(req.validated.body, { actorUserId });
    return sendSuccess(res, created, {
      statusCode: HttpStatus.CREATED,
      message: 'File metadata created',
    });
  });

  listMetadata = asyncHandler(async (req, res) => {
    const result = await this.metadata.listMetadata(req.validated.query);
    return sendPaginatedList(res, result);
  });

  getMetadata = asyncHandler(async (req, res) => {
    const row = await this.metadata.getMetadataById(req.validated.params.id);
    return sendSuccess(res, row);
  });

  getSignedUrl = asyncHandler(async (req, res) => {
    const id = req.validated.params.id;
    const url = await resolveStoredFileUrl(id, { ttlSeconds: 600 });
    if (!url) throw new NotFoundError('File not available');
    return sendSuccess(res, { url, ttlSeconds: 600 });
  });

  deleteMetadata = asyncHandler(async (req, res) => {
    await this.metadata.deleteMetadata(req.validated.params.id);
    return sendSuccess(res, { ok: true }, { message: 'File metadata deleted' });
  });
}

export const filesController = new FilesController();
