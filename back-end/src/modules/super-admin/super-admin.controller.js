import { asyncHandler } from '../../core/async-handler.js';
import { sendSuccess } from '../../utils/api-response.js';
import { superAdminService } from './super-admin.service.js';

export class SuperAdminController {
  constructor(service = superAdminService) {
    this.service = service;
  }

  meta = asyncHandler(async (_req, res) => {
    return sendSuccess(res, this.service.getModuleMeta());
  });
}

export const superAdminController = new SuperAdminController();
