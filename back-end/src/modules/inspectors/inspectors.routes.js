import { Router } from 'express';
import { validateRequest } from '../shared/http/index.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { inspectorsController } from './inspectors.controller.js';
import { requireInspectorUserMiddleware } from './require-inspector-user.middleware.js';
import {
  assignmentIdParamsSchema,
  attachEvidenceBodySchema,
  listInspectorAssignmentsQuerySchema,
  saveDraftBodySchema,
  submitInspectionBodySchema,
  syncBatchBodySchema,
  syncStatusQuerySchema,
  offlineInspectionImportBodySchema,
} from './inspectors.validation.js';

export const inspectorsRouter = Router();

inspectorsRouter.get('/_meta', inspectorsController.meta);

inspectorsRouter.use(authenticate(), authorize(['inspector', 'inspector_admin', 'system_admin']));

inspectorsRouter.get(
  '/dashboard',
  requireInspectorUserMiddleware,
  inspectorsController.getDashboard,
);

inspectorsRouter.get(
  '/assignments',
  requireInspectorUserMiddleware,
  validateRequest({ query: listInspectorAssignmentsQuerySchema }),
  inspectorsController.listAssignments,
);

inspectorsRouter.get(
  '/assignments/:id',
  requireInspectorUserMiddleware,
  validateRequest({ params: assignmentIdParamsSchema }),
  inspectorsController.getAssignmentById,
);

inspectorsRouter.post(
  '/assignments/:id/save-draft',
  requireInspectorUserMiddleware,
  validateRequest({ params: assignmentIdParamsSchema, body: saveDraftBodySchema }),
  inspectorsController.saveDraft,
);

inspectorsRouter.post(
  '/assignments/:id/submit',
  requireInspectorUserMiddleware,
  validateRequest({ params: assignmentIdParamsSchema, body: submitInspectionBodySchema }),
  inspectorsController.submit,
);

inspectorsRouter.post(
  '/assignments/:id/evidence',
  requireInspectorUserMiddleware,
  validateRequest({ params: assignmentIdParamsSchema, body: attachEvidenceBodySchema }),
  inspectorsController.attachEvidence,
);

inspectorsRouter.post(
  '/inspections/offline',
  requireInspectorUserMiddleware,
  validateRequest({ body: offlineInspectionImportBodySchema }),
  inspectorsController.importOfflineInspection,
);

inspectorsRouter.post(
  '/inspections/offline/sync',
  requireInspectorUserMiddleware,
  inspectorsController.syncOfflineInspections,
);

inspectorsRouter.get(
  '/sync-status',
  requireInspectorUserMiddleware,
  validateRequest({ query: syncStatusQuerySchema }),
  inspectorsController.syncStatus,
);

/** Offline-sync batch endpoint (Phase 8). Applies drafts/submits in one round-trip. */
inspectorsRouter.post(
  '/sync',
  requireInspectorUserMiddleware,
  validateRequest({ body: syncBatchBodySchema }),
  inspectorsController.syncBatch,
);

inspectorsRouter.get('/profile', requireInspectorUserMiddleware, inspectorsController.profile);
