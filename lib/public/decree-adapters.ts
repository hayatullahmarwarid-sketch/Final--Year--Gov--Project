/**
 * Maps `GET /api/v1/public/decrees` / `GET /api/v1/public/decrees/:id` JSON into legacy UI shapes.
 */
import type { AppLanguageId } from '@/constants/languages';
import type { ArticleBlock, DecreeDetailModel } from '@/data/decree-detail-content';
import type { DecreeListItem } from '@/data/decree-models';
import { formatDecreeNumberLabel } from '@/lib/decree-number-format';
import { formatDateMonthDayYear } from '@/lib/i18n/format';
import { pickPublicDecreeTitleFromRow } from '@/lib/decree-title-typography';

function toAppLanguageId(locale: string): AppLanguageId {
  const k = locale.trim().toLowerCase();
  if (k === 'en') return 'en';
  if (k === 'prs' || k === 'fa') return 'prs';
  return 'ps';
}

function wordCount(text: string): number {
  const s = text.trim();
  if (!s) return 0;
  return s.split(/\s+/g).filter(Boolean).length;
}

function chunkIntoArticles(text: string, wordsPerArticle = 30): ArticleBlock[] {
  const t = text.trim();
  if (!t) return [];
  const words = t.split(/\s+/g).filter(Boolean);
  const n = Math.max(1, Math.ceil(words.length / wordsPerArticle));
  const out: ArticleBlock[] = [];
  for (let i = 0; i < n; i++) {
    const start = i * wordsPerArticle;
    const slice = words.slice(start, start + wordsPerArticle);
    out.push({ n: i + 1, body: slice.join(' ') });
  }
  return out;
}

function localeKey(l: string | null | undefined): string {
  return String(l ?? '').trim().toLowerCase();
}

/** App language (en | ps | prs) vs API `localizedContent.locale` (en, ps, fa, prs, …). */
type CanonicalContentLang = 'en' | 'ps' | 'fa';

function appLanguageToCanonical(id: string): CanonicalContentLang {
  const k = localeKey(id);
  if (k === 'en') return 'en';
  if (k === 'ps') return 'ps';
  if (k === 'prs' || k === 'fa') return 'fa';
  return 'en';
}

function blockLocaleToCanonical(raw: string): CanonicalContentLang | 'other' {
  const k = localeKey(raw);
  if (!k) return 'other';
  if (k === 'en' || k === 'eng' || k === 'english' || k.startsWith('en-')) return 'en';
  if (k === 'ps' || k === 'pus' || k === 'pushto' || k === 'pashto' || (k.length <= 5 && k.startsWith('ps-')))
    return 'ps';
  if (k === 'fa' || k === 'prs' || k === 'dari' || k === 'per' || k.startsWith('fa') || k.startsWith('prs')) return 'fa';
  return 'other';
}

function contentBlockMatchesAppLanguage(blockLocale: string, appLanguage: string): boolean {
  const want = appLanguageToCanonical(appLanguage);
  const b = blockLocaleToCanonical(blockLocale);
  if (b !== 'other') return b === want;
  return localeKey(blockLocale) === localeKey(appLanguage);
}

function localizedPageCountsFromMeta(row: Record<string, unknown>): Record<string, number> {
  const meta = row.metadata;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};
  const raw = (meta as Record<string, unknown>).localizedPageCounts;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    if (k && Number.isFinite(n) && n > 0) out[localeKey(k)] = n;
  }
  return out;
}

function bestPageCountForLocale(pageCounts: Record<string, number>, locale: string): number | null {
  const key = localeKey(locale);
  if (key && pageCounts[key]) return pageCounts[key];
  // Common fallback aliases between app language and content locale keys.
  if (key === 'fa' && pageCounts.prs) return pageCounts.prs;
  if (key === 'prs' && pageCounts.fa) return pageCounts.fa;
  // Otherwise pick any available.
  const any = Object.values(pageCounts).find((n) => typeof n === 'number' && n > 0);
  return any ?? null;
}

/** Compact view count for decree cards and meta (matches list `viewsLabel` number part). */
export function formatDecreeViewCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n === 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(n));
}

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const lang = localeKey(locale) === 'prs' ? 'fa' : localeKey(locale);
  if (lang === 'ps') return formatDateMonthDayYear(d, 'ps');
  if (lang === 'fa') return formatDateMonthDayYear(d, 'prs');
  return formatDateMonthDayYear(d, 'en');
}

function pickLocalizedField(
  row: Record<string, unknown>,
  locale: string,
  fields: { en?: string; ps?: string; fa?: string },
): string {
  const raw = localeKey(locale);
  const l = raw === 'prs' ? 'fa' : raw;
  const want =
    l === 'ps'
      ? [fields.ps, fields.fa, fields.en]
      : l === 'fa'
        ? [fields.fa, fields.ps, fields.en]
        : [fields.en, fields.ps, fields.fa];
  for (const f of want) {
    if (!f) continue;
    const v = row[f];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function firstCategory(row: Record<string, unknown>, locale: string): { id: string; name: string } {
  const cats = row.categories;
  if (Array.isArray(cats) && cats.length > 0) {
    const c = cats[0] as Record<string, unknown>;
    const id = typeof c.id === 'string' ? c.id : '';
    const name =
      pickLocalizedField(c, locale, { en: 'name', ps: 'namePs', fa: 'nameFa' }) ||
      (typeof c.name === 'string' && c.name.trim() ? c.name.trim() : '');
    return { id: id || 'unknown', name };
  }
  const ids = row.categoryIds;
  if (Array.isArray(ids) && ids.length > 0 && typeof ids[0] === 'string') {
    return { id: ids[0], name: '' };
  }
  return { id: 'unknown', name: '' };
}

function bookmarkDecreeId(bookmark: Record<string, unknown>): string {
  const raw = bookmark.decreeId;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return '';
}

/** Builds a list row from a bookmark payload (`serializePublicBookmark` includes embedded decree summary). */
export function apiBookmarkToListItem(bookmark: Record<string, unknown>, locale: string): DecreeListItem | null {
  const dec = bookmark.decree;
  const decreeId = bookmarkDecreeId(bookmark);
  if (!dec || typeof dec !== 'object') {
    if (!decreeId) return null;
    return apiDecreeToListItem(
      {
        id: decreeId,
        decreeNumber: 0,
        titleSummary: 'Decree',
        categories: [],
        categoryIds: [],
        status: 'active',
        currentPublishedVersion: null,
      },
      locale,
    );
  }
  const d = dec as Record<string, unknown>;
  const id = typeof d.id === 'string' ? d.id : decreeId;
  if (!id) return null;
  return apiDecreeToListItem(
    {
      ...d,
      id,
      decreeNumber: String(d.decreeNumber ?? ''),
      titleSummary: typeof d.titleSummary === 'string' ? d.titleSummary : '—',
      categories: [],
      categoryIds: [],
      status: typeof d.status === 'string' ? d.status : 'active',
      publishedAt: typeof d.publishedAt === 'string' ? d.publishedAt : null,
      currentPublishedVersion: null,
    },
    locale,
  );
}

/** Maps API `serializeDecree` row to `DecreeListItem` for cards and lists. */
export function apiDecreeToListItem(row: Record<string, unknown>, locale: string): DecreeListItem {
  const id = typeof row.id === 'string' ? row.id : '';
  const cs = row.categorySequence;
  const display = formatDecreeNumberLabel({
    decreeNumber: String(row.decreeNumber ?? ''),
    decreeNumberLabel: typeof row.decreeNumberLabel === 'string' ? row.decreeNumberLabel : undefined,
    categorySequence: typeof cs === 'number' ? cs : cs === null ? null : undefined,
  });
  const indexLabel = display.startsWith('#') ? display.slice(1) : display;
  const cat = firstCategory(row, locale);
  const statusRaw = typeof row.status === 'string' ? row.status : '';
  const verified = statusRaw === 'active';
  const uiLang = toAppLanguageId(locale);
  const title = pickPublicDecreeTitleFromRow(row, uiLang) || '—';
  const meta = row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : null;
  const views =
    typeof row.viewCount === 'number'
      ? row.viewCount
      : typeof meta?.viewCount === 'number'
        ? meta.viewCount
        : 0;
  // Keep the raw numeric in `viewCount`; UI renders the localized label.
  const viewsLabel = String(views);
  /** Uploader’s primary public PDF page count (server: pdf-parse on upload, `decree.primaryPdfPageCount`). */
  const pagesFromPrimaryPdf =
    typeof row.primaryPdfPageCount === 'number' && row.primaryPdfPageCount > 0
      ? row.primaryPdfPageCount
      : null;

  const counts = localizedPageCountsFromMeta(row);
  let pageCount = 0;
  if (pagesFromPrimaryPdf != null) {
    pageCount = pagesFromPrimaryPdf;
  } else {
    const byLocale = bestPageCountForLocale(counts, locale);
    if (byLocale != null) pageCount = byLocale;
  }
  if (!pageCount) pageCount = 1;
  const publishedAt =
    typeof row.publishedAt === 'string'
      ? row.publishedAt
      : typeof row.lastAmendedAt === 'string'
        ? row.lastAmendedAt
        : typeof row.updatedAt === 'string'
          ? row.updatedAt
          : null;
  const uploadAt = typeof row.createdAt === 'string' ? row.createdAt : publishedAt;
  const creationAt = typeof row.creationDate === 'string' ? row.creationDate : null;

  return {
    id,
    indexLabel,
    category:
      cat.name ||
      pickLocalizedField(row, locale, { en: 'categoryName', ps: 'categoryNamePs', fa: 'categoryNameFa' }) ||
      '—',
    categoryId: cat.id,
    status: verified ? 'active' : 'inactive',
    title,
    pageCount,
    viewCount: views,
    viewsLabel,
    dateLabel: formatDate(uploadAt, locale),
    creationDateLabel: formatDate(creationAt, locale),
    isVerified: verified,
  };
}

function pickLocalizedBlocks(version: Record<string, unknown>): { locale: string; title: string; body: string }[] {
  const loc = version.localizedContent;
  if (!Array.isArray(loc) || loc.length === 0) return [];
  return loc
    .filter((raw): raw is Record<string, unknown> => !!raw && typeof raw === 'object')
    .map((b) => {
      const title = typeof b.title === 'string' ? b.title : '';
      const body =
        typeof b.bodyPlain === 'string' && b.bodyPlain.trim()
          ? b.bodyPlain
          : typeof b.bodyRich === 'string'
            ? b.bodyRich
            : '';
      const blockLocale = typeof b.locale === 'string' && b.locale.trim() ? b.locale : '';
      return {
        locale: blockLocale,
        title,
        body: body || (title ? '' : ''),
      };
    })
    .filter((r) => (r.title || r.body) && r.locale);
}

/** Builds decree detail screen model from `GET /api/v1/public/decrees/:id` payload. */
export function apiDecreeToDetailModel(
  row: Record<string, unknown>,
  locale: string,
  tMissing?: () => string,
): DecreeDetailModel | null {
  const list = apiDecreeToListItem(row, locale);
  const uploadDateChip = formatDate(typeof row.createdAt === 'string' ? row.createdAt : null, locale);
  const creationDateChip = formatDate(typeof row.creationDate === 'string' ? row.creationDate : null, locale);
  const ver = row.currentPublishedVersion;
  if (!ver || typeof ver !== 'object') {
    const articles: ArticleBlock[] = [
      {
        n: 1,
        body: typeof row.titleSummary === 'string' ? row.titleSummary : tMissing ? tMissing() : 'No published content yet.',
      },
    ];
    const catUpper = list.category;
    return {
      list,
      kicker: `${catUpper}`,
      documentTitle: list.title,
      viewsChip: '—',
      uploadDateChip,
      creationDateChip,
      categoryUpper: catUpper,
      articleCount: articles.length,
      articles,
    };
  }
  const v = ver as Record<string, unknown>;
  const blocks = pickLocalizedBlocks(v);
  const picked = blocks.find((b) => contentBlockMatchesAppLanguage(b.locale, locale)) ?? null;
  const composed = picked ? [picked.title, picked.body].filter(Boolean).join('\n\n').trim() : '';
  const articles: ArticleBlock[] =
    picked && composed && wordCount(composed) > 0
      ? chunkIntoArticles(composed, 30)
      : [
          {
            n: 1,
            body: tMissing ? tMissing() : 'Articles are not available for this language right now.',
          },
        ];

  const catUpper = list.category;
  const uiLang = toAppLanguageId(locale);
  const decreeTitle = pickPublicDecreeTitleFromRow(row, uiLang);
  const documentTitle =
    decreeTitle.trim() ||
    (picked?.title && picked.title.trim()) ||
    (typeof row.titleSummary === 'string' ? row.titleSummary : list.title);

  return {
    list,
    kicker: `${catUpper}`,
    documentTitle,
    viewsChip: list.viewsLabel.trim() || '—',
    uploadDateChip,
    creationDateChip,
    categoryUpper: catUpper,
    articleCount: articles.length,
    articles,
  };
}
