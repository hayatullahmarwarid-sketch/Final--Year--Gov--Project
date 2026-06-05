import { asyncHandler, sendSuccess } from '../shared/http/index.js';
import { searchService } from './search.service.js';

export class SearchController {
  /**
   * @param {import('./search.service.js').SearchService} [service]
   */
  constructor(service = searchService) {
    this.service = service;
  }

  unified = asyncHandler(async (req, res) => {
    const data = await this.service.unifiedSearch(req.validated.query);
    return sendSuccess(res, data);
  });
}

export const searchController = new SearchController();
