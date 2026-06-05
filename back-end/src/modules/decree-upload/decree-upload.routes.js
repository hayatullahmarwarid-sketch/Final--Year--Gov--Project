import { Router } from 'express';
import { validateRequest } from '../shared/http/index.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { decreeUploadController } from './decree-upload.controller.js';
import {
  abandonAmendmentDraftBodySchema,
  archiveDecreeBodySchema,
  categoryIdParamsSchema,
  createAmendmentBodySchema,
  createCategoryBodySchema,
  createDecreeBodySchema,
  decreeAndVersionParamsSchema,
  decreeIdParamsSchema,
  listCategoriesQuerySchema,
  listDecreesQuerySchema,
  listVersionsQuerySchema,
  nextDecreeNumberQuerySchema,
  patchDeptUploadSettingsBodySchema,
  patchCategoryBodySchema,
  patchDecreeBodySchema,
  publishDecreeBodySchema,
  supersedeDecreeBodySchema,
} from './decree-upload.validation.js';

export const decreeUploadRouter = Router();

decreeUploadRouter.use(authenticate(), authorize(['dept_upload', 'system_admin']));

decreeUploadRouter.get('/_meta', decreeUploadController.meta);

decreeUploadRouter.get('/stats', decreeUploadController.workspaceStats);

decreeUploadRouter.get('/settings', decreeUploadController.deptUploadSettingsGet);
decreeUploadRouter.patch(
  '/settings',
  validateRequest({ body: patchDeptUploadSettingsBodySchema }),
  decreeUploadController.deptUploadSettingsPatch,
);

decreeUploadRouter.post('/reports/reference', decreeUploadController.allocateAnalyticsReportReference);

decreeUploadRouter.get(
  '/categories',
  validateRequest({ query: listCategoriesQuerySchema }),
  decreeUploadController.listCategories,
);

decreeUploadRouter.get(
  '/categories/:id',
  validateRequest({ params: categoryIdParamsSchema }),
  decreeUploadController.getCategoryById,
);

decreeUploadRouter.post(
  '/categories',
  validateRequest({ body: createCategoryBodySchema }),
  decreeUploadController.createCategory,
);

decreeUploadRouter.patch(
  '/categories/:id',
  validateRequest({ params: categoryIdParamsSchema, body: patchCategoryBodySchema }),
  decreeUploadController.patchCategory,
);

decreeUploadRouter.get(
  '/decrees',
  validateRequest({ query: listDecreesQuerySchema }),
  decreeUploadController.listDecrees,
);

decreeUploadRouter.post(
  '/decrees',
  validateRequest({ body: createDecreeBodySchema }),
  decreeUploadController.createDecree,
);

decreeUploadRouter.get(
  '/decrees/next-number',
  validateRequest({ query: nextDecreeNumberQuerySchema }),
  decreeUploadController.getNextDecreeNumberPreview,
);

decreeUploadRouter.get(
  '/decrees/:id',
  validateRequest({ params: decreeIdParamsSchema }),
  decreeUploadController.getDecreeById,
);

decreeUploadRouter.patch(
  '/decrees/:id',
  validateRequest({ params: decreeIdParamsSchema, body: patchDecreeBodySchema }),
  decreeUploadController.patchDecree,
);

decreeUploadRouter.post(
  '/decrees/:id/publish',
  validateRequest({ params: decreeIdParamsSchema, body: publishDecreeBodySchema }),
  decreeUploadController.publishDecree,
);

decreeUploadRouter.post(
  '/decrees/:id/archive',
  validateRequest({ params: decreeIdParamsSchema, body: archiveDecreeBodySchema }),
  decreeUploadController.archiveDecree,
);

decreeUploadRouter.post(
  '/decrees/:id/supersede',
  validateRequest({ params: decreeIdParamsSchema, body: supersedeDecreeBodySchema }),
  decreeUploadController.supersedeDecree,
);

decreeUploadRouter.post(
  '/decrees/:id/amendments',
  validateRequest({ params: decreeIdParamsSchema, body: createAmendmentBodySchema }),
  decreeUploadController.createAmendment,
);

decreeUploadRouter.post(
  '/decrees/:id/draft/abandon',
  validateRequest({ params: decreeIdParamsSchema, body: abandonAmendmentDraftBodySchema }),
  decreeUploadController.abandonAmendmentDraft,
);

decreeUploadRouter.get(
  '/decrees/:id/versions',
  validateRequest({ params: decreeIdParamsSchema, query: listVersionsQuerySchema }),
  decreeUploadController.listVersions,
);

decreeUploadRouter.get(
  '/decrees/:id/versions/:versionId',
  validateRequest({ params: decreeAndVersionParamsSchema }),
  decreeUploadController.getDecreeVersionById,
);
