import { asyncHandler, HttpStatus, sendPaginatedList, sendSuccess } from '../shared/http/index.js';
import { getRequestContext } from '../../middlewares/request-context.middleware.js';
import { auditService } from '../../services/audit/auditService.js';
import { dashboardsService } from '../dashboards/dashboards.service.js';
import { decreeUploadService } from './decree-upload.service.js';

function optionalActorUserId(req) {
  const id = getRequestContext(req).actor?.id;
  return typeof id === 'string' ? id : undefined;
}

/**
 * @param {Record<string, unknown>} before
 * @param {Record<string, unknown>} after
 */
function summarizeDeptSettingsChanges(before, after) {
  const paths = [
    ['department', 'deptName'],
    ['department', 'deptCode'],
    ['department', 'refPrefix'],
    ['department', 'contactEmail'],
    ['system', 'sessionTimeoutMinutes'],
    ['system', 'sequenceYearlyReset'],
    ['system', 'interfaceLanguage'],
    ['system', 'dateFormat'],
  ];
  /** @type {{ path: string, from: unknown, to: unknown }[]} */
  const changes = [];
  for (const [ns, key] of paths) {
    const ov = /** @type {Record<string, unknown> | undefined} */ (before?.[ns])?.[key];
    const nv = /** @type {Record<string, unknown> | undefined} */ (after?.[ns])?.[key];
    if (JSON.stringify(ov) !== JSON.stringify(nv)) {
      changes.push({ path: `${ns}.${String(key)}`, from: ov ?? null, to: nv ?? null });
    }
  }
  return changes;
}

export class DecreeUploadController {
  /**
   * @param {import('./decree-upload.service.js').DecreeUploadService} [service]
   */
  constructor(service = decreeUploadService) {
    this.service = service;
  }

  meta = asyncHandler(async (_req, res) => {
    return sendSuccess(res, this.service.getModuleMeta());
  });

  deptUploadSettingsGet = asyncHandler(async (_req, res) => {
    const data = await this.service.getDeptUploadSettings();
    return sendSuccess(res, data);
  });

  deptUploadSettingsPatch = asyncHandler(async (req, res) => {
    const before = await this.service.getDeptUploadSettings();
    const data = await this.service.patchDeptUploadSettings(req.validated.body);
    const changes = summarizeDeptSettingsChanges(
      /** @type {Record<string, unknown>} */ (before),
      /** @type {Record<string, unknown>} */ (data),
    );
    if (changes.length) {
      await auditService.logFromRequest(req, 'dept_upload.settings.update', {
        resourceType: 'DeptUploadSettings',
        resourceId: 'dept_upload',
        summary: 'Department portal settings updated',
        details: { changes },
      });
    }
    return sendSuccess(res, data, { message: 'Settings updated' });
  });

  allocateAnalyticsReportReference = asyncHandler(async (_req, res) => {
    const data = await this.service.allocateAnalyticsReportReference();
    return sendSuccess(res, data, { message: 'Report reference allocated' });
  });

  /** Aggregated counts for the signed-in uploader (same source as dashboards decree-upload). */
  workspaceStats = asyncHandler(async (req, res) => {
    const actor = optionalActorUserId(req);
    const dash = await dashboardsService.getDecreeUploadDashboard(actor);
    return sendSuccess(res, {
      totalDecrees: dash.decrees.total,
      publishedDecrees: dash.decrees.active,
      pendingDraftDecrees: dash.decrees.other.draft,
      totalViews: dash.engagement.totalViews,
      totalDownloads: dash.engagement.totalDownloads,
      newDecreesThisMonth: dash.newDecreesThisMonth ?? 0,
    });
  });

  listCategories = asyncHandler(async (req, res) => {
    const result = await this.service.listCategories(req.validated.query);
    return sendPaginatedList(res, result);
  });

  getCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const row = await this.service.getCategoryById(id);
    return sendSuccess(res, row);
  });

  createCategory = asyncHandler(async (req, res) => {
    const created = await this.service.createCategory(req.validated.body, optionalActorUserId(req));
    await auditService.logFromRequest(req, 'decree_category.create', {
      resourceType: 'DecreeCategory',
      resourceId: String(created.id),
      summary: 'Decree category created',
      details: { slug: created.slug },
    });
    return sendSuccess(res, created, {
      statusCode: HttpStatus.CREATED,
      message: 'Category created',
    });
  });

  patchCategory = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const updated = await this.service.patchCategory(id, req.validated.body, optionalActorUserId(req));
    await auditService.logFromRequest(req, 'decree_category.update', {
      resourceType: 'DecreeCategory',
      resourceId: id,
      summary: 'Decree category updated',
      details: { fields: Object.keys(req.validated.body) },
    });
    return sendSuccess(res, updated, { message: 'Category updated' });
  });

  listDecrees = asyncHandler(async (req, res) => {
    const role = req.user?.role;
    const uploaderOnly = role === 'decree_upload_department' ? optionalActorUserId(req) : undefined;
    const result = await this.service.listDecrees(req.validated.query, { uploaderId: uploaderOnly });
    return sendPaginatedList(res, result);
  });

  createDecree = asyncHandler(async (req, res) => {
    const created = await this.service.createDecree(req.validated.body, optionalActorUserId(req));
    await auditService.logFromRequest(req, 'decree.create', {
      resourceType: 'Decree',
      resourceId: String(created.id),
      summary: 'Decree created',
      details: { decreeNumber: created.decreeNumber, status: created.status },
    });
    return sendSuccess(res, created, {
      statusCode: HttpStatus.CREATED,
      message: 'Decree created',
    });
  });

  getNextDecreeNumberPreview = asyncHandler(async (req, res) => {
    const row = await this.service.getNextDecreeNumberPreview(req.validated.query);
    return sendSuccess(res, row, { message: 'Next decree number preview' });
  });

  getDecreeById = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const row = await this.service.getDecreeById(id);
    return sendSuccess(res, row);
  });

  patchDecree = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const updated = await this.service.patchDecree(id, req.validated.body, optionalActorUserId(req));
    await auditService.logFromRequest(req, 'decree.update', {
      resourceType: 'Decree',
      resourceId: id,
      summary: 'Decree metadata updated',
      details: { fields: Object.keys(req.validated.body) },
    });
    return sendSuccess(res, updated, { message: 'Decree updated' });
  });

  publishDecree = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const row = await this.service.publishDecree(id, req.validated.body, optionalActorUserId(req));
    await auditService.logFromRequest(req, 'decree.publish', {
      resourceType: 'Decree',
      resourceId: id,
      summary: 'Decree version published',
      details: {
        currentPublishedVersionId: row.currentPublishedVersionId,
        activeDraftVersionId: row.activeDraftVersionId,
      },
    });
    return sendSuccess(res, row, { message: 'Decree version published' });
  });

  archiveDecree = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const row = await this.service.archiveDecree(id, req.validated.body, optionalActorUserId(req));
    await auditService.logFromRequest(req, 'decree.archive', {
      resourceType: 'Decree',
      resourceId: id,
      summary: 'Decree archived',
      details: { status: row.status },
    });
    return sendSuccess(res, row, { message: 'Decree archived' });
  });

  supersedeDecree = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const row = await this.service.supersedeDecree(id, req.validated.body, optionalActorUserId(req));
    await auditService.logFromRequest(req, 'decree.supersede', {
      resourceType: 'Decree',
      resourceId: id,
      summary: 'Decree superseded',
      details: { fields: Object.keys(req.validated.body) },
    });
    return sendSuccess(res, row, { message: 'Decree superseded' });
  });

  createAmendment = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const row = await this.service.createAmendment(id, req.validated.body, optionalActorUserId(req));
    await auditService.logFromRequest(req, 'decree.amendment.create', {
      resourceType: 'Decree',
      resourceId: id,
      summary: 'Decree amendment draft created',
      details: { activeDraftVersionId: row.activeDraftVersionId },
    });
    return sendSuccess(res, row, { message: 'Amendment draft created' });
  });

  abandonAmendmentDraft = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const row = await this.service.abandonAmendmentDraft(id, req.validated.body, optionalActorUserId(req));
    await auditService.logFromRequest(req, 'decree.amendment.abandon', {
      resourceType: 'Decree',
      resourceId: id,
      summary: 'Amendment draft abandoned',
      details: {},
    });
    return sendSuccess(res, row, { message: 'Amendment draft abandoned' });
  });

  getDecreeVersionById = asyncHandler(async (req, res) => {
    const { id, versionId } = req.validated.params;
    const row = await this.service.getDecreeVersionById(id, versionId);
    return sendSuccess(res, row);
  });

  listVersions = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const rows = await this.service.listVersions(id, req.validated.query);
    return sendSuccess(res, rows);
  });
}

export const decreeUploadController = new DecreeUploadController();
