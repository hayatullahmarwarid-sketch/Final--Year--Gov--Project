import { asyncHandler, HttpStatus, sendPaginatedList, sendSuccess } from '../shared/http/index.js';
import { UnauthorizedError } from '../../core/errors/app-error.js';
import { auditService } from '../../services/audit/auditService.js';
import { systemAdminService } from './system-admin.service.js';

export class SystemAdminController {
  /**
   * @param {import('./system-admin.service.js').SystemAdminService} [service]
   */
  constructor(service = systemAdminService) {
    this.service = service;
  }

  listStaff = asyncHandler(async (req, res) => {
    const query = req.validated.query;
    const result = await this.service.listStaff(query);
    return sendPaginatedList(res, result);
  });

  listPlatformUsers = asyncHandler(async (req, res) => {
    const query = req.validated.query;
    const result = await this.service.listPlatformUsers(query);
    return sendPaginatedList(res, result);
  });

  createStaff = asyncHandler(async (req, res) => {
    const body = req.validated.body;
    const created = await this.service.createStaff(body);
    await auditService.logFromRequest(req, 'user.staff_create', {
      resourceType: 'User',
      resourceId: created.id,
      summary: 'Staff account created',
      details: { roleKey: created.roleKey, status: created.status },
    });
    return sendSuccess(res, created, {
      statusCode: HttpStatus.CREATED,
      message: 'Staff member created',
    });
  });

  getStaffById = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const staff = await this.service.getStaffById(id);
    return sendSuccess(res, staff);
  });

  getStaffPortalPassword = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const result = await this.service.getStaffPortalPassword(id);
    return sendSuccess(res, result);
  });

  resetStaffPortalPassword = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const body = req.validated.body;
    const result = await this.service.resetStaffPortalPassword(id, body);
    await auditService.logFromRequest(req, 'user.staff_password_reset', {
      resourceType: 'User',
      resourceId: id,
      summary: 'Staff portal password reset (one-time password issued)',
      details: { mode: body.newPassword ? 'manual' : 'generated' },
    });
    return sendSuccess(res, result, { message: 'Temporary password issued' });
  });

  patchStaff = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const body = req.validated.body;
    const updated = await this.service.patchStaff(id, body);
    if (body.roleKey !== undefined) {
      await auditService.logFromRequest(req, 'user.role_change', {
        resourceType: 'User',
        resourceId: id,
        summary: 'Staff role changed',
        details: { nextRoleKey: body.roleKey },
      });
    }
    return sendSuccess(res, updated, { message: 'Staff member updated' });
  });

  deleteStaff = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const result = await this.service.deleteStaff(id);
    await auditService.logFromRequest(req, 'user.staff_delete', {
      resourceType: 'User',
      resourceId: id,
      summary: 'Staff account soft-deleted',
      details: { outcome: 'success' },
    });
    return sendSuccess(res, result, { message: 'Staff member removed' });
  });

  listAuditLogs = asyncHandler(async (req, res) => {
    const query = req.validated.query;
    const result = await this.service.listAuditLogs(query);
    return sendPaginatedList(res, result);
  });

  getSettings = asyncHandler(async (_req, res) => {
    const settings = await this.service.getSettings();
    return sendSuccess(res, settings);
  });

  patchSettings = asyncHandler(async (req, res) => {
    const body = req.validated.body;
    const settings = await this.service.patchSettings(body);
    return sendSuccess(res, settings, { message: 'Settings updated' });
  });

  getDashboard = asyncHandler(async (_req, res) => {
    const dashboard = await this.service.getDashboard();
    return sendSuccess(res, dashboard);
  });

  getSystemSummary = asyncHandler(async (_req, res) => {
    const summary = await this.service.getSystemSummary();
    return sendSuccess(res, summary);
  });

  listNotifications = asyncHandler(async (req, res) => {
    const uid = req.user?.id;
    if (!uid) throw new UnauthorizedError('Authentication required');
    const query = req.validated.query;
    const result = await this.service.listAdminNotifications(query, uid);
    return sendPaginatedList(res, result);
  });

  markNotificationRead = asyncHandler(async (req, res) => {
    const uid = req.user?.id;
    if (!uid) throw new UnauthorizedError('Authentication required');
    const { id } = req.validated.params;
    const updated = await this.service.markAdminNotificationRead(id, uid);
    return sendSuccess(res, updated, { message: 'Notification marked read' });
  });

  markAllNotificationsRead = asyncHandler(async (req, res) => {
    const uid = req.user?.id;
    if (!uid) throw new UnauthorizedError('Authentication required');
    const result = await this.service.markAllAdminNotificationsRead(uid);
    return sendSuccess(res, result, { message: 'All notifications marked read' });
  });

  triggerBackup = asyncHandler(async (req, res) => {
    const data = await this.service.triggerMongoBackup(req);
    return sendSuccess(res, data, { statusCode: HttpStatus.CREATED, message: 'Backup created' });
  });

  announceSystem = asyncHandler(async (req, res) => {
    const data = await this.service.announceSystem(req.validated.body, req);
    return sendSuccess(res, data, { statusCode: HttpStatus.CREATED, message: 'Announcement sent' });
  });
}

export const systemAdminController = new SystemAdminController();
