import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { superAdminController } from './super-admin.controller.js';

export const superAdminRouter = Router();

superAdminRouter.get(
  '/_meta',
  authenticate(),
  authorize(['system_admin']),
  superAdminController.meta,
);
