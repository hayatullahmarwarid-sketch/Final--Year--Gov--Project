import { asyncHandler, sendPaginatedList, sendSuccess } from '../shared/http/index.js';
import { publicUsersService } from './public-users.service.js';
import { requirePublicOwnerUserId } from './lib/require-public-user.js';

export class PublicUsersController {
  constructor(service = publicUsersService) {
    this.service = service;
  }

  meta = asyncHandler(async (_req, res) => {
    return sendSuccess(res, this.service.getModuleMeta());
  });

  home = asyncHandler(async (req, res) => {
    const ownerUserId = req.publicUser?.ownerUserId ?? null;
    const data = await this.service.getHome(ownerUserId, req.validated.query);
    return sendSuccess(res, data);
  });

  listDecrees = asyncHandler(async (req, res) => {
    const list = await this.service.listDecrees(req.validated.query);
    return sendPaginatedList(res, list);
  });

  listDecreeCategories = asyncHandler(async (req, res) => {
    const list = await this.service.listDecreeCategories(req.validated.query);
    return sendPaginatedList(res, list);
  });

  getDecreeById = asyncHandler(async (req, res) => {
    const data = await this.service.getDecreeById(req.validated.params.id);
    return sendSuccess(res, data);
  });

  recordDecreeView = asyncHandler(async (req, res) => {
    const ownerUserId = req.publicUser?.ownerUserId ?? null;
    const data = await this.service.recordDecreeView(req.validated.params.id, ownerUserId);
    return sendSuccess(res, data);
  });

  downloadDecreePdf = asyncHandler(async (req, res) => {
    const decreeId = req.validated.params.id;
    const locale = req.validated.query?.locale;
    const r = await this.service.getDecreePdfForHttp(decreeId, { locale });
    const safeName = String(r.filename || 'decree.pdf')
      .replace(/["\r\n]/g, '_')
      .slice(0, 200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Length', String(r.buffer.length));
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).send(r.buffer);
  });

  listBookmarks = asyncHandler(async (req, res) => {
    const ownerUserId = requirePublicOwnerUserId(req);
    const list = await this.service.listBookmarks(ownerUserId, req.validated.query);
    return sendPaginatedList(res, list);
  });

  createBookmark = asyncHandler(async (req, res) => {
    const ownerUserId = requirePublicOwnerUserId(req);
    const data = await this.service.addBookmark(ownerUserId, req.validated.body.decreeId);
    return sendSuccess(res, data, { statusCode: 201 });
  });

  deleteBookmark = asyncHandler(async (req, res) => {
    const ownerUserId = requirePublicOwnerUserId(req);
    const data = await this.service.removeBookmark(ownerUserId, req.validated.params.id);
    return sendSuccess(res, data);
  });

  listNotifications = asyncHandler(async (req, res) => {
    const ownerUserId = req.publicUser?.ownerUserId ?? null;
    const list = await this.service.listNotifications(ownerUserId, req.validated.query);
    return sendPaginatedList(res, list);
  });

  listExams = asyncHandler(async (req, res) => {
    const list = await this.service.listExams(req.validated.query);
    return sendPaginatedList(res, list);
  });

  getExamById = asyncHandler(async (req, res) => {
    const data = await this.service.getExamById(req.validated.params.id);
    return sendSuccess(res, data);
  });

  createExamAttempt = asyncHandler(async (req, res) => {
    const ownerUserId = requirePublicOwnerUserId(req);
    const data = await this.service.startExamAttempt(ownerUserId, req.validated.body.examId, {
      locale: req.validated.body.locale,
    });
    const status = data.resumed ? 200 : 201;
    return sendSuccess(res, data, { statusCode: status });
  });

  submitExamAttempt = asyncHandler(async (req, res) => {
    const ownerUserId = requirePublicOwnerUserId(req);
    const data = await this.service.submitExamAttempt(
      ownerUserId,
      req.validated.params.id,
      req.validated.body.answers,
    );
    return sendSuccess(res, data);
  });

  patchExamAttempt = asyncHandler(async (req, res) => {
    const ownerUserId = requirePublicOwnerUserId(req);
    const data = await this.service.patchExamAttemptDraft(
      ownerUserId,
      req.validated.params.id,
      req.validated.body.answers,
    );
    return sendSuccess(res, data);
  });

  getExamAttemptById = asyncHandler(async (req, res) => {
    const ownerUserId = requirePublicOwnerUserId(req);
    const data = await this.service.getExamAttemptById(ownerUserId, req.validated.params.id);
    return sendSuccess(res, data);
  });

  listResults = asyncHandler(async (req, res) => {
    const ownerUserId = requirePublicOwnerUserId(req);
    const list = await this.service.listResults(ownerUserId, req.validated.query);
    return sendPaginatedList(res, list);
  });

  listCertificates = asyncHandler(async (req, res) => {
    const ownerUserId = requirePublicOwnerUserId(req);
    const list = await this.service.listCertificates(ownerUserId, req.validated.query);
    return sendPaginatedList(res, list);
  });

  getCertificateById = asyncHandler(async (req, res) => {
    const ownerUserId = requirePublicOwnerUserId(req);
    const data = await this.service.getCertificateById(ownerUserId, req.validated.params.id);
    return sendSuccess(res, data);
  });

  profile = asyncHandler(async (req, res) => {
    const ownerUserId = req.publicUser?.ownerUserId ?? null;
    const data = await this.service.getPublicProfile(ownerUserId);
    return sendSuccess(res, data);
  });

  departmentIdentity = asyncHandler(async (_req, res) => {
    const data = await this.service.getDepartmentPublicIdentity();
    return sendSuccess(res, data);
  });
}

export const publicUsersController = new PublicUsersController();
