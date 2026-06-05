import { Router } from 'express';
import { API_VERSION } from '../modules/shared/constants/api.js';
import { healthRouter } from './health.routes.js';
import { metricsRouter } from './metrics.routes.js';
import { notificationsRouter } from '../modules/notifications/notifications.routes.js';
import { superAdminRouter } from '../modules/super-admin/super-admin.routes.js';
import { systemAdminRouter } from '../modules/system-admin/system-admin.routes.js';
import { decreeUploadRouter } from '../modules/decree-upload/decree-upload.routes.js';
import { inspectorAdminRouter } from '../modules/inspector-admin/inspector-admin.routes.js';
import { inspectorsRouter } from '../modules/inspectors/inspectors.routes.js';
import { publicUsersRouter } from '../modules/public-users/public-users.routes.js';
import { contentRouter } from '../modules/content/content.routes.js';
import { filesRouter } from '../modules/files/files.routes.js';
import { dashboardsRouter } from '../modules/dashboards/dashboards.routes.js';
import { devicesRouter } from '../modules/devices/devices.routes.js';
import { certificatesPublicRouter } from '../modules/certificates/certificates-public.routes.js';
import { searchRouter } from '../modules/search/search.routes.js';
import { authRouter } from '../api/v1/auth/auth.routes.js';
import { uploadsRouter } from '../api/v1/uploads/uploads.routes.js';
import { publicConfigRouter } from './public-config.routes.js';

/** Versioned HTTP API (`/api/v1`). Order here is mount order only; keep paths stable for mobile clients. */
const apiV1 = Router();

const v1Mounts = [
  ['/auth', authRouter],
  ['/uploads', uploadsRouter],
  ['/public-config', publicConfigRouter],
  ['/notifications', notificationsRouter],
  ['/super-admin', superAdminRouter],
  ['/system-admin', systemAdminRouter],
  ['/decree-upload', decreeUploadRouter],
  ['/inspector-admin', inspectorAdminRouter],
  ['/inspectors', inspectorsRouter],
  ['/public', publicUsersRouter],
  ['/content', contentRouter],
  ['/files', filesRouter],
  ['/dashboards', dashboardsRouter],
  ['/devices', devicesRouter],
  ['/certificates', certificatesPublicRouter],
  ['/search', searchRouter],
];

for (const [path, router] of v1Mounts) {
  apiV1.use(path, router);
}

export const rootRouter = Router();
rootRouter.use('/health', healthRouter);
rootRouter.use('/metrics', metricsRouter);
rootRouter.use(`/api/${API_VERSION}`, apiV1);
