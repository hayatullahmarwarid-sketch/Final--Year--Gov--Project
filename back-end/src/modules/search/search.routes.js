import { Router } from 'express';
import { validateRequest } from '../shared/http/index.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { searchController } from './search.controller.js';
import { unifiedSearchQuerySchema } from './search.validation.js';

export const searchRouter = Router();

searchRouter.use(authenticate());

searchRouter.get('/', validateRequest({ query: unifiedSearchQuerySchema }), searchController.unified);
