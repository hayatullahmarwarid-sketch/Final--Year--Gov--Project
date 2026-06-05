import { asyncHandler, sendSuccess } from '../shared/http/index.js';
import { resolveInspectorUserId } from '../inspectors/inspectors.context.js';
import { dashboardsService } from './dashboards.service.js';

export class DashboardsController {
  /**
   * @param {import('./dashboards.service.js').DashboardsService} [service]
   */
  constructor(service = dashboardsService) {
    this.service = service;
  }

  summary = asyncHandler(async (_req, res) => {
    const data = await this.service.getSummary();
    return sendSuccess(res, data);
  });

  systemAdmin = asyncHandler(async (_req, res) => {
    const data = await this.service.getSystemAdminDashboard();
    return sendSuccess(res, data);
  });

  decreeUpload = asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? '';
    const data = await this.service.getDecreeUploadDashboard(userId);
    return sendSuccess(res, data);
  });

  inspectorAdmin = asyncHandler(async (_req, res) => {
    const data = await this.service.getInspectorAdminDashboard();
    return sendSuccess(res, data);
  });

  inspector = asyncHandler(async (req, res) => {
    const inspectorUserId = resolveInspectorUserId(req);
    const data = await this.service.getInspectorDashboard(inspectorUserId);
    return sendSuccess(res, data);
  });

  public = asyncHandler(async (req, res) => {
    const ownerUserId = req.publicUser?.ownerUserId ?? null;
    const data = await this.service.getPublicDashboard(ownerUserId);
    return sendSuccess(res, data);
  });
}

export const dashboardsController = new DashboardsController();
