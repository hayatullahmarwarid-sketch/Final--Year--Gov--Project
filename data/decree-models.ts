export type DecreeListItem = {
  id: string;
  /** Per-category decree number label (UI display). */
  indexLabel: string;
  category: string;
  categoryId: string;
  /** API status normalized for UI (active | inactive). */
  status: string;
  title: string;
  pageCount: number;
  /** Total engagement views (from API `viewCount` / metadata). */
  viewCount: number;
  /** Compact label value; UI localizes around it. */
  viewsLabel: string;
  /** Upload date (system timestamp). */
  dateLabel: string;
  /** Creation date (user-provided). */
  creationDateLabel?: string;
  isVerified: boolean;
};

