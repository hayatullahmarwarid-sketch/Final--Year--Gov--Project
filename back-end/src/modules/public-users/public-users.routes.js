import { Router } from 'express';
import { validateRequest } from '../shared/http/index.js';
import { publicUserContextMiddleware } from './middleware/public-user-context.middleware.js';
import { publicUsersController } from './public-users.controller.js';
import {
  createBookmarkBodySchema,
  createExamAttemptBodySchema,
  idParamSchema,
  listPublicBookmarksQuerySchema,
  listPublicCertificatesQuerySchema,
  listPublicDecreeCategoriesQuerySchema,
  listPublicDecreesQuerySchema,
  listPublicExamsQuerySchema,
  listPublicNotificationsQuerySchema,
  listPublicResultsQuerySchema,
  publicHomeQuerySchema,
  submitExamAttemptBodySchema,
  patchExamAttemptBodySchema,
  publicDecreePdfQuerySchema,
} from './public-users.validation.js';

export const publicUsersRouter = Router();

publicUsersRouter.use(publicUserContextMiddleware());

publicUsersRouter.get('/_meta', publicUsersController.meta);

publicUsersRouter.get('/department-identity', publicUsersController.departmentIdentity);

publicUsersRouter.get(
  '/home',
  validateRequest({ query: publicHomeQuerySchema }),
  publicUsersController.home,
);

publicUsersRouter.get(
  '/decrees',
  validateRequest({ query: listPublicDecreesQuerySchema }),
  publicUsersController.listDecrees,
);

publicUsersRouter.get(
  '/decree-categories',
  validateRequest({ query: listPublicDecreeCategoriesQuerySchema }),
  publicUsersController.listDecreeCategories,
);

publicUsersRouter.get(
  '/decrees/:id',
  validateRequest({ params: idParamSchema }),
  publicUsersController.getDecreeById,
);

publicUsersRouter.post(
  '/decrees/:id/view',
  validateRequest({ params: idParamSchema }),
  publicUsersController.recordDecreeView,
);

publicUsersRouter.get(
  '/decrees/:id/pdf',
  validateRequest({ params: idParamSchema, query: publicDecreePdfQuerySchema }),
  publicUsersController.downloadDecreePdf,
);

publicUsersRouter.get(
  '/bookmarks',
  validateRequest({ query: listPublicBookmarksQuerySchema }),
  publicUsersController.listBookmarks,
);

publicUsersRouter.post(
  '/bookmarks',
  validateRequest({ body: createBookmarkBodySchema }),
  publicUsersController.createBookmark,
);

publicUsersRouter.delete(
  '/bookmarks/:id',
  validateRequest({ params: idParamSchema }),
  publicUsersController.deleteBookmark,
);

publicUsersRouter.get(
  '/notifications',
  validateRequest({ query: listPublicNotificationsQuerySchema }),
  publicUsersController.listNotifications,
);

publicUsersRouter.get(
  '/exams',
  validateRequest({ query: listPublicExamsQuerySchema }),
  publicUsersController.listExams,
);

publicUsersRouter.get(
  '/exams/:id',
  validateRequest({ params: idParamSchema }),
  publicUsersController.getExamById,
);

publicUsersRouter.post(
  '/exam-attempts',
  validateRequest({ body: createExamAttemptBodySchema }),
  publicUsersController.createExamAttempt,
);

publicUsersRouter.post(
  '/exam-attempts/:id/submit',
  validateRequest({ params: idParamSchema, body: submitExamAttemptBodySchema }),
  publicUsersController.submitExamAttempt,
);

publicUsersRouter.patch(
  '/exam-attempts/:id',
  validateRequest({ params: idParamSchema, body: patchExamAttemptBodySchema }),
  publicUsersController.patchExamAttempt,
);

publicUsersRouter.get(
  '/exam-attempts/:id',
  validateRequest({ params: idParamSchema }),
  publicUsersController.getExamAttemptById,
);

publicUsersRouter.get(
  '/results',
  validateRequest({ query: listPublicResultsQuerySchema }),
  publicUsersController.listResults,
);

publicUsersRouter.get(
  '/certificates',
  validateRequest({ query: listPublicCertificatesQuerySchema }),
  publicUsersController.listCertificates,
);

publicUsersRouter.get(
  '/certificates/:id',
  validateRequest({ params: idParamSchema }),
  publicUsersController.getCertificateById,
);

publicUsersRouter.get('/profile', publicUsersController.profile);
