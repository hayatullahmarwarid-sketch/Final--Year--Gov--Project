import type { SerializedDecree } from '@/lib/api/decree-upload';

export type DecreeTableSortKey = 'num' | 'title' | 'category' | 'status' | 'views';
export type SortDir = 'asc' | 'desc';

/** Pill + actions match decree management reference. */
export type DecreeRowDisplayStatus = 'published' | 'draft' | 'rejected' | 'pending';

export function decreeRowDisplayStatus(d: SerializedDecree): DecreeRowDisplayStatus {
  const m = d.metadata && typeof d.metadata === 'object' ? (d.metadata as Record<string, unknown>) : null;
  if (m?.uiStatus === 'pending') return 'pending';
  if (d.status === 'pending') return 'pending';
  if (d.status === 'active') return 'published';
  if (d.status === 'archived') return 'rejected';
  if (d.status === 'superseded') return 'published';
  return 'draft';
}

export type DecreeRowActionFlags = { edit: boolean; accept: boolean; reject: boolean; delete: boolean };

/** Action column rules from decree management reference + delete on all types. */
export function decreeRowActions(ui: DecreeRowDisplayStatus): DecreeRowActionFlags {
  switch (ui) {
    case 'published':
      return { edit: true, accept: false, reject: false, delete: true };
    case 'pending':
      return { edit: true, accept: true, reject: true, delete: true };
    case 'draft':
      return { edit: true, accept: true, reject: true, delete: true };
    case 'rejected':
      return { edit: true, accept: false, reject: false, delete: true };
    default:
      return { edit: true, accept: false, reject: false, delete: true };
  }
}

export function decreeViewsCount(d: SerializedDecree): number {
  const m = d.metadata;
  if (m && typeof m === 'object' && typeof (m as { views?: unknown }).views === 'number') {
    return (m as { views: number }).views;
  }
  if (m && typeof m === 'object' && typeof (m as { views?: unknown }).views === 'string') {
    const v = parseInt(String((m as { views: string }).views), 10);
    return Number.isNaN(v) ? 0 : v;
  }
  return 0;
}

function cmpStr(a: string, b: string, dir: SortDir): number {
  const x = a.localeCompare(b, undefined, { sensitivity: 'base' });
  return dir === 'asc' ? x : -x;
}

function cmpNum(a: number, b: number, dir: SortDir): number {
  return dir === 'asc' ? a - b : b - a;
}

export function sortDecrees(rows: SerializedDecree[], key: DecreeTableSortKey, dir: SortDir): SerializedDecree[] {
  const out = [...rows];
  out.sort((a, b) => {
    switch (key) {
      case 'num': {
        const na = parseInt(String(a.decreeNumber).replace(/\D/g, ''), 10) || 0;
        const nb = parseInt(String(b.decreeNumber).replace(/\D/g, ''), 10) || 0;
        return cmpNum(na, nb, dir);
      }
      case 'title':
        return cmpStr(a.titleSummary, b.titleSummary, dir);
      case 'category': {
        const ca = a.categories[0]?.name ?? '';
        const cb = b.categories[0]?.name ?? '';
        return cmpStr(ca, cb, dir);
      }
      case 'status': {
        const sa = decreeRowDisplayStatus(a);
        const sb = decreeRowDisplayStatus(b);
        return cmpStr(sa, sb, dir);
      }
      case 'views':
        return cmpNum(decreeViewsCount(a), decreeViewsCount(b), dir);
      default:
        return 0;
    }
  });
  return out;
}
