import { asyncHandler, HttpStatus, sendSuccess } from '../shared/http/index.js';
import { UnauthorizedError } from '../../core/errors/app-error.js';
import { devicesService } from './devices.service.js';

export class DevicesController {
  constructor(service = devicesService) {
    this.service = service;
  }

  register = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError('Authentication required');
    const data = await this.service.register(userId, req.validated.body);
    return sendSuccess(res, data, {
      statusCode: HttpStatus.CREATED,
      message: 'Device registered',
    });
  });

  unregister = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError('Authentication required');
    await this.service.unregister(userId, req.validated.params.id);
    return sendSuccess(res, { ok: true }, { message: 'Device removed' });
  });

  list = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError('Authentication required');
    const data = await this.service.listForUser(userId);
    return sendSuccess(res, data);
  });

  unregisterAll = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError('Authentication required');
    const data = await this.service.unregisterAllForUser(userId);
    return sendSuccess(res, data, { message: 'All devices removed' });
  });
}

export const devicesController = new DevicesController();
