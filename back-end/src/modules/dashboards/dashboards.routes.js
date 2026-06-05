import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { publicUserContextMiddleware } from '../public-users/middleware/public-user-context.middleware.js';
import { dashboardsController } from './dashboards.controller.js';

export const dashboardsRouter = Router();

dashboardsRouter.get('/summary', dashboardsController.summary);

dashboardsRouter.get(
  '/system-admin',
  authenticate(),
  authorize(['system_admin']),
  dashboardsController.systemAdmin,
);

dashboardsRouter.get(
  '/decree-upload',
  authenticate(),
  authorize(['dept_upload', 'system_admin']),
  dashboardsController.decreeUpload,
);

dashboardsRouter.get(
  '/inspector-admin',
  authenticate(),
  authorize(['inspector_admin']),
  dashboardsController.inspectorAdmin,
);

dashboardsRouter.get(
  '/inspector',
  authenticate(),
  authorize(['inspector', 'inspector_admin', 'system_admin']),
  dashboardsController.inspector,
);

dashboardsRouter.get(
  '/public',
  authenticate(),
  authorize(['public']),
  publicUserContextMiddleware(),
  dashboardsController.public,
);
