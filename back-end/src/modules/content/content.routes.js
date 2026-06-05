import { Router } from 'express';
import { validateRequest } from '../shared/http/index.js';
import { contentController } from './content.controller.js';
import {
  contentPageIdParamSchema,
  createContentPageBodySchema,
  createHomepageBannerBodySchema,
  getContentPageByIdQuerySchema,
  homepageBannerIdParamSchema,
  listContentPagesQuerySchema,
  listHomepageBannersQuerySchema,
  patchContentPageBodySchema,
  patchHomepageBannerBodySchema,
} from './content.validation.js';

export const contentRouter = Router();

contentRouter.get('/catalog-status', contentController.catalogStatus);

contentRouter.get(
  '/pages',
  validateRequest({ query: listContentPagesQuerySchema }),
  contentController.listPages,
);

contentRouter.post(
  '/pages',
  validateRequest({ body: createContentPageBodySchema }),
  contentController.createPage,
);

contentRouter.get(
  '/pages/:id',
  validateRequest({ params: contentPageIdParamSchema, query: getContentPageByIdQuerySchema }),
  contentController.getPageById,
);

contentRouter.patch(
  '/pages/:id',
  validateRequest({ params: contentPageIdParamSchema, body: patchContentPageBodySchema }),
  contentController.patchPage,
);

contentRouter.get(
  '/banners',
  validateRequest({ query: listHomepageBannersQuerySchema }),
  contentController.listBanners,
);

contentRouter.post(
  '/banners',
  validateRequest({ body: createHomepageBannerBodySchema }),
  contentController.createBanner,
);

contentRouter.patch(
  '/banners/:id',
  validateRequest({ params: homepageBannerIdParamSchema, body: patchHomepageBannerBodySchema }),
  contentController.patchBanner,
);
