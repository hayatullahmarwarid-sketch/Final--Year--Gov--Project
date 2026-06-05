import { asyncHandler, HttpStatus, sendPaginatedList, sendSuccess } from '../shared/http/index.js';
import { contentService } from './content.service.js';

export class ContentController {
  constructor(service = contentService) {
    this.service = service;
  }

  catalogStatus = asyncHandler(async (_req, res) => {
    return sendSuccess(res, this.service.getCatalogStatus());
  });

  listPages = asyncHandler(async (req, res) => {
    const result = await this.service.listPages(req.validated.query);
    return sendPaginatedList(res, result);
  });

  createPage = asyncHandler(async (req, res) => {
    const created = await this.service.createPage(req.validated.body);
    return sendSuccess(res, created, { statusCode: HttpStatus.CREATED, message: 'Content page created' });
  });

  getPageById = asyncHandler(async (req, res) => {
    const { publishedOnly } = req.validated.query;
    const row = await this.service.getPageById(req.validated.params.id, { publishedOnly });
    return sendSuccess(res, row);
  });

  patchPage = asyncHandler(async (req, res) => {
    const updated = await this.service.patchPage(req.validated.params.id, req.validated.body);
    return sendSuccess(res, updated, { message: 'Content page updated' });
  });

  listBanners = asyncHandler(async (req, res) => {
    const result = await this.service.listBanners(req.validated.query);
    return sendPaginatedList(res, result);
  });

  createBanner = asyncHandler(async (req, res) => {
    const created = await this.service.createBanner(req.validated.body);
    return sendSuccess(res, created, { statusCode: HttpStatus.CREATED, message: 'Homepage banner created' });
  });

  patchBanner = asyncHandler(async (req, res) => {
    const updated = await this.service.patchBanner(req.validated.params.id, req.validated.body);
    return sendSuccess(res, updated, { message: 'Homepage banner updated' });
  });
}

export const contentController = new ContentController();
