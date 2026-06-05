import { asyncHandler, HttpStatus, sendPaginatedList, sendSuccess } from '../shared/http/index.js';
import { getInspectorBinding } from './inspectors.context.js';
import { inspectorsService } from './inspectors.service.js';

export class InspectorsController {
  /**
   * @param {import('./inspectors.service.js').InspectorsService} [service]
   */
  constructor(service = inspectorsService) {
    this.service = service;
  }

  meta = asyncHandler(async (_req, res) => {
    return sendSuccess(res, this.service.getModuleMeta());
  });

  getDashboard = asyncHandler(async (req, res) => {
    const inspectorUserId = /** @type {string} */ (req.inspectorUserId);
    const data = await this.service.getInspectorDashboard(inspectorUserId);
    return sendSuccess(res, data);
  });

  listAssignments = asyncHandler(async (req, res) => {
    const inspectorUserId = /** @type {string} */ (req.inspectorUserId);
    const result = await this.service.listAssignments(inspectorUserId, req.validated.query);
    return sendPaginatedList(res, result);
  });

  getAssignmentById = asyncHandler(async (req, res) => {
    const inspectorUserId = /** @type {string} */ (req.inspectorUserId);
    const { id } = req.validated.params;
    const data = await this.service.getAssignmentDetail(inspectorUserId, id);
    return sendSuccess(res, data);
  });

  saveDraft = asyncHandler(async (req, res) => {
    const inspectorUserId = /** @type {string} */ (req.inspectorUserId);
    const { id } = req.validated.params;
    const data = await this.service.saveDraft(inspectorUserId, id, req.validated.body);
    return sendSuccess(res, data, { message: 'Draft saved' });
  });

  submit = asyncHandler(async (req, res) => {
    const inspectorUserId = /** @type {string} */ (req.inspectorUserId);
    const { id } = req.validated.params;
    const data = await this.service.submitInspection(inspectorUserId, id, req.validated.body);
    return sendSuccess(res, data, {
      message: data.idempotent ? 'Submit acknowledged (idempotent)' : 'Inspection submitted',
    });
  });

  syncStatus = asyncHandler(async (req, res) => {
    const inspectorUserId = /** @type {string} */ (req.inspectorUserId);
    const data = await this.service.getSyncStatus(inspectorUserId, req.validated.query);
    return sendSuccess(res, data);
  });

  syncBatch = asyncHandler(async (req, res) => {
    const inspectorUserId = /** @type {string} */ (req.inspectorUserId);
    const data = await this.service.syncBatch(inspectorUserId, req.validated.body);
    return sendSuccess(res, data);
  });

  profile = asyncHandler(async (req, res) => {
    const inspectorUserId = /** @type {string} */ (req.inspectorUserId);
    const binding = getInspectorBinding(req);
    const data = await this.service.getProfileSummary(inspectorUserId, { authState: binding.authState });
    return sendSuccess(res, data);
  });

  attachEvidence = asyncHandler(async (req, res) => {
    const inspectorUserId = /** @type {string} */ (req.inspectorUserId);
    const { id } = req.validated.params;
    const row = await this.service.attachEvidence(inspectorUserId, id, req.validated.body);
    return sendSuccess(res, row, { statusCode: HttpStatus.CREATED, message: 'Evidence reference recorded' });
  });

  importOfflineInspection = asyncHandler(async (req, res) => {
    const inspectorUserId = /** @type {string} */ (req.inspectorUserId);
    const data = await this.service.importOfflineInspection(inspectorUserId, req.validated.body);
    return sendSuccess(res, data, { statusCode: HttpStatus.CREATED });
  });

  syncOfflineInspections = asyncHandler(async (req, res) => {
    const inspectorUserId = /** @type {string} */ (req.inspectorUserId);
    const data = await this.service.syncOfflineInspections(inspectorUserId);
    return sendSuccess(res, data);
  });
}

export const inspectorsController = new InspectorsController();
