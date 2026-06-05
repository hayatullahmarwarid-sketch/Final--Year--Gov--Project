import type { DecreeListItem } from '@/data/decree-models';

export type ArticleBlock = {
  n: number;
  body: string;
};

export type DecreeDetailModel = {
  list: DecreeListItem;
  /** e.g. ECONOMY - DECREE #02 */
  kicker: string;
  /** Main document heading inside the card */
  documentTitle: string;
  /** Chip next to eye icon, e.g. 3.1k */
  viewsChip: string;
  /** Chip next to calendar: upload timestamp (auto). */
  uploadDateChip: string;
  /** Chip next to calendar: user-provided creation/issuance date. */
  creationDateChip: string;
  categoryUpper: string;
  articleCount: number;
  articles: ArticleBlock[];
};

// Legacy mock decree detail builder removed. Decree detail is built from live API payloads
// in `lib/public/decree-adapters.ts` (`apiDecreeToDetailModel`).
