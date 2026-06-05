import { Router } from 'express';
import { validateRequest } from '../shared/http/index.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { devicesController } from './devices.controller.js';
import { deviceIdParamSchema, registerDeviceBodySchema } from './devices.validation.js';

export const devicesRouter = Router();

devicesRouter.use(authenticate());

devicesRouter.get('/', devicesController.list);

devicesRouter.post(
  '/',
  validateRequest({ body: registerDeviceBodySchema }),
  devicesController.register,
);

devicesRouter.delete('/session/all', devicesController.unregisterAll);

devicesRouter.delete(
  '/:id',
  validateRequest({ params: deviceIdParamSchema }),
  devicesController.unregister,
);
