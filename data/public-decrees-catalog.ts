export interface Decree {
  id: number;
  number: number; // Position within category
  categoryId: string;
  title: string;
  explanations: string[];
  isVerified: boolean;
  viewCount: number;
  uploadDate: string; // ISO date string
}

export interface Category {
  id: string;
  name: string;
  color: string;
  decrees: Decree[];
}

/**
 * Decree category taxonomy. The categories themselves are real configuration — they drive
 * routing, filter chips, and inspector-admin category assignments. Decree rows inside each
 * category are intentionally empty: real decrees come from the API via
 * `GET /api/v1/public/decrees` and are normalized by `lib/public/decree-adapters.ts`.
 */
export const CATEGORIES: Category[] = [
  { id: 'economy', name: 'Economy', color: '#10b981', decrees: [] },
  { id: 'family', name: 'Family', color: '#8b5cf6', decrees: [] },
  { id: 'finance', name: 'Finance', color: '#f59e0b', decrees: [] },
  { id: 'worship', name: 'Worship', color: '#3b82f6', decrees: [] },
  { id: 'trade', name: 'Trade', color: '#ec4899', decrees: [] },
  { id: 'property', name: 'Property', color: '#14b8a6', decrees: [] },
  { id: 'criminal', name: 'Criminal', color: '#ef4444', decrees: [] },
  { id: 'civil', name: 'Civil', color: '#6366f1', decrees: [] },
];

/** Flattened view over every category's decrees (empty by default). */
export const ALL_DECREES: Decree[] = CATEGORIES.flatMap((cat) => cat.decrees);

export function getDecreeById(id: number): Decree | undefined {
  return ALL_DECREES.find((d) => d.id === id);
}

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getDecreeByCategoryAndNumber(categoryId: string, number: number): Decree | undefined {
  const category = getCategoryById(categoryId);
  return category?.decrees.find((d) => d.number === number);
}
