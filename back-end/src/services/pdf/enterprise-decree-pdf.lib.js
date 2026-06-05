import { pngBufferToDataUri } from './pdf-branding.lib.js';
import { buildEmbeddedNotoNaskhFaceCss } from './pdf-fonts.lib.js';

/**
 * @param {string | null | undefined} locale
 * @returns {'en'|'ps'|'fa'}
 */
export function clampPdfLocale(locale) {
  const l = String(locale ?? '').trim().toLowerCase();
  if (l === 'ps') return 'ps';
  if (l === 'fa') return 'fa';
  return 'en';
}

/**
 * @param {'en'|'ps'|'fa'} locale
 */
export function isRtlPdfLocale(locale) {
  return locale === 'ps' || locale === 'fa';
}

/** @param {string | null | undefined} iso */
export function formatPdfCalendarDate(iso, locale) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const map = { en: 'en-GB', ps: 'ps-AF', fa: 'fa-AF' };
  const loc = map[locale] ?? 'en-GB';
  try {
    return new Intl.DateTimeFormat(loc, { dateStyle: 'long' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stringsFor(locale) {
  /** @type {Record<string, Record<'en'|'ps'|'fa', string>>} */
  const T = {
    strapline: {
      en: 'Government Decrees Information System',
      ps: 'د حکومتی حکمونو معلوماتي سیستم',
      fa: 'سامانه اطلاعات احکام دولتی',
    },
    docKind: {
      en: 'Official Decree',
      ps: 'رسمي حکم',
      fa: 'حکم رسمی',
    },
    reference: {
      en: 'Official reference',
      ps: 'رسمي حواله',
      fa: 'مرجع رسمی',
    },
    decreeNo: {
      en: 'Decree number',
      ps: 'د حکم شمېره',
      fa: 'شماره حکم',
    },
    category: {
      en: 'Category',
      ps: 'کټګوري',
      fa: 'دسته‌بندی',
    },
    department: {
      en: 'Department',
      ps: 'وزارت / اداره',
      fa: 'وزارت / اداره',
    },
    published: {
      en: 'Publication date',
      ps: 'د خپریدو نیټه',
      fa: 'تاریخ انتشار',
    },
    issued: {
      en: 'Issue date',
      ps: 'د صادرولو نیټه',
      fa: 'تاریخ صدور',
    },
    generated: {
      en: 'Document generated',
      ps: 'اسناد جوړ شو',
      fa: 'سند تولید شد',
    },
    bodyHeading: {
      en: 'Decree text',
      ps: 'د حکم متن',
      fa: 'متن حکم',
    },
    verificationTitle: {
      en: 'Digital verification',
      ps: 'ډیجیټل تایید',
      fa: 'تأیید دیجیتال',
    },
    verificationHint: {
      en: 'Scan this code to verify against the official registry.',
      ps: 'د رسمي ثبت سره د تایید لپاره دا کوډ سکین کړئ.',
      fa: 'برای تأیید با دفتر رسمی این کد را اسکن کنید.',
    },
    watermark: {
      en: 'OFFICIAL DOCUMENT',
      ps: 'رسمي اسناد',
      fa: 'سند رسمی',
    },
    signature: {
      en: 'Authorized signature',
      ps: 'د صلاحیت لیکونکی لاسلیک',
      fa: 'امضای مجاز',
    },
    registryId: {
      en: 'Registry identifier',
      ps: 'ثبت پېژند',
      fa: 'شناسه ثبت',
    },
    localeEdition: {
      en: 'Language edition',
      ps: 'د ژبې نسخه',
      fa: 'نسخه زبان',
    },
    none: {
      en: '—',
      ps: '—',
      fa: '—',
    },
  };
  const L = clampPdfLocale(locale);
  const pick = (k) => T[k][L] ?? T[k].en;
  return {
    strapline: pick('strapline'),
    docKind: pick('docKind'),
    reference: pick('reference'),
    decreeNo: pick('decreeNo'),
    category: pick('category'),
    department: pick('department'),
    published: pick('published'),
    issued: pick('issued'),
    generated: pick('generated'),
    bodyHeading: pick('bodyHeading'),
    verificationTitle: pick('verificationTitle'),
    verificationHint: pick('verificationHint'),
    watermark: pick('watermark'),
    signature: pick('signature'),
    registryId: pick('registryId'),
    localeEdition: pick('localeEdition'),
    none: pick('none'),
  };
}

/**
 * Plain text vs stored rich HTML for decree body.
 * @param {string} body
 */
function decreeBodyToInnerHtml(body) {
  const raw = String(body ?? '').trim();
  if (!raw) return `<p class="muted">${escapeHtml('—')}</p>`;
  const looksHtml = /<\/[a-z][a-z0-9]*\s*>/i.test(raw) || /<br\s*\/?>/i.test(raw) || /<p[\s>]/i.test(raw);
  if (looksHtml) {
    const stripped = raw
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '');
    return `<div class="rich">${stripped}</div>`;
  }
  return `<div class="plain">${escapeHtml(raw).replace(/\r?\n/g, '<br/>')}</div>`;
}

/**
 * @typedef {{
 *   locale: string,
 *   decreeId: string,
 *   decreeNumberLabel: string,
 *   officialReference: string | null,
 *   titleSummary: string,
 *   body: string,
 *   departmentName: string | null,
 *   departmentCode: string | null,
 *   categoryLabel: string | null,
 *   publishedAtIso: string | null,
 *   creationDateIso: string | null,
 *   generatedAtIso: string,
 *   verificationUrl: string | null,
 *   qrDataUrl: string | null,
 * }} EnterpriseDecreePdfModel
 */

/**
 * @param {EnterpriseDecreePdfModel} model
 * @param {{ leftLogoDataUri?: string | null, rightLogoDataUri?: string | null, extraFontFaceCss?: string }} assets
 */
export function buildEnterpriseDecreePdfPlaywrightBundle(model, assets = {}) {
  const locale = clampPdfLocale(model.locale);
  const rtl = isRtlPdfLocale(locale);
  const dir = rtl ? 'rtl' : 'ltr';
  const S = stringsFor(locale);

  const fontFaceCss = [buildEmbeddedNotoNaskhFaceCss(), assets.extraFontFaceCss ?? ''].filter(Boolean).join('\n');

  const pub = formatPdfCalendarDate(model.publishedAtIso, locale);
  const iss = formatPdfCalendarDate(model.creationDateIso, locale);
  const gen = formatPdfCalendarDate(model.generatedAtIso, locale);

  const leftUri = assets.leftLogoDataUri ?? null;
  const rightUri = assets.rightLogoDataUri ?? null;

  const metaRows = [
    { k: S.reference, v: model.officialReference && model.officialReference.trim() ? model.officialReference.trim() : S.none },
    { k: S.decreeNo, v: model.decreeNumberLabel || S.none },
    { k: S.category, v: model.categoryLabel && model.categoryLabel.trim() ? model.categoryLabel.trim() : S.none },
    {
      k: S.department,
      v:
        model.departmentName && model.departmentName.trim()
          ? `${model.departmentName.trim()}${model.departmentCode ? ` (${model.departmentCode})` : ''}`
          : S.none,
    },
    { k: S.published, v: pub },
    { k: S.issued, v: iss },
    { k: S.registryId, v: escapeHtml(model.decreeId) },
    { k: S.localeEdition, v: locale.toUpperCase() },
  ];

  const metaHtml = metaRows
    .map(
      (row, i) => `
        <div class="meta-row ${i % 2 === 0 ? 'zebra' : ''}">
          <div class="meta-k">${escapeHtml(row.k)}</div>
          <div class="meta-v">${escapeHtml(row.v)}</div>
        </div>`,
    )
    .join('');

  const qrBlock =
    model.qrDataUrl &&
    `<div class="verify-card">
      <div class="verify-i"><img class="qr" src="${model.qrDataUrl}" alt="" /></div>
      <div class="verify-t">
        <div class="verify-title">${escapeHtml(S.verificationTitle)}</div>
        <p class="verify-hint">${escapeHtml(S.verificationHint)}</p>
        ${
          model.verificationUrl
            ? `<div class="mono">${escapeHtml(model.verificationUrl)}</div>`
            : ''
        }
      </div>
    </div>`;

  const html = `<!doctype html>
<html lang="${escapeHtml(locale)}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <style>
    ${fontFaceCss}
    :root {
      --gov-ink: #0c1829;
      --gov-muted: #5c6b7d;
      --gov-rule: #d7dee8;
      --gov-band: #0f4c75;
      --gov-gold: #b8892c;
      --paper: #fafbfd;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      color: var(--gov-ink);
      font-family: "PdfNotoNaskh", "Noto Naskh Arabic", "Segoe UI", Tahoma, Arial, sans-serif;
      font-size: 11.5pt;
      line-height: 1.65;
      background: var(--paper);
    }
    .wm {
      position: fixed;
      left: -10%;
      right: -10%;
      top: 34%;
      text-align: center;
      font-size: 54px;
      font-weight: 900;
      letter-spacing: 0.14em;
      color: rgba(15, 76, 117, 0.065);
      transform: rotate(-30deg);
      pointer-events: none;
      z-index: 0;
      text-transform: uppercase;
    }
    .shell { position: relative; z-index: 1; padding: 8px 4px 36px; }
    .frame {
      border: 1px solid var(--gov-rule);
      border-radius: 2px;
      padding: 28px 26px 30px;
      background: #fff;
      box-shadow: 0 1px 0 rgba(15, 76, 117, 0.04);
    }
    .ribbon {
      height: 4px;
      background: linear-gradient(90deg, var(--gov-band), #1b6fa8);
      margin: -28px -26px 22px;
      border-radius: 2px 2px 0 0;
    }
    .strap {
      font-size: 9.5pt;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--gov-muted);
      font-weight: 700;
      margin: 0 0 10px;
    }
    .doc-kind {
      display: inline-block;
      padding: 4px 12px;
      border: 1px solid var(--gov-gold);
      color: var(--gov-band);
      font-weight: 800;
      font-size: 10pt;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .title {
      font-size: 18pt;
      font-weight: 800;
      line-height: 1.35;
      margin: 0 0 18px;
      color: var(--gov-ink);
    }
    .meta-grid {
      border: 1px solid var(--gov-rule);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 22px;
    }
    .meta-row {
      display: grid;
      grid-template-columns: minmax(120px, 34%) 1fr;
      gap: 12px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--gov-rule);
      align-items: start;
    }
    .meta-row:last-child { border-bottom: 0; }
    .meta-row.zebra { background: #f6f8fb; }
    .meta-k {
      font-size: 9.5pt;
      font-weight: 800;
      color: var(--gov-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .meta-v { font-size: 10.5pt; font-weight: 600; }
    .section-h {
      font-size: 10pt;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--gov-band);
      margin: 22px 0 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid rgba(15, 76, 117, 0.18);
    }
    .body-box {
      border: 1px solid var(--gov-rule);
      border-radius: 2px;
      padding: 16px 18px;
      min-height: 120px;
      background: #fff;
    }
    .rich p { margin: 0 0 0.55em; }
    .rich p:last-child { margin-bottom: 0; }
    .plain { white-space: normal; word-break: break-word; }
    .muted { color: var(--gov-muted); }
    .verify-card {
      margin-top: 26px;
      padding: 14px 16px;
      border: 1px dashed rgba(15, 76, 117, 0.35);
      border-radius: 2px;
      display: grid;
      grid-template-columns: 132px 1fr;
      gap: 16px;
      align-items: center;
      page-break-inside: avoid;
    }
    .qr { width: 120px; height: 120px; image-rendering: pixelated; }
    .verify-title { font-weight: 800; font-size: 11pt; margin: 0 0 6px; color: var(--gov-band); }
    .verify-hint { margin: 0 0 8px; font-size: 9.5pt; color: var(--gov-muted); line-height: 1.45; }
    .mono { font-size: 8.5pt; color: var(--gov-muted); word-break: break-all; }
    .sign-area {
      margin-top: 28px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      page-break-inside: avoid;
    }
    .sign-box {
      border-top: 1px solid var(--gov-ink);
      padding-top: 8px;
      min-height: 72px;
      font-size: 9pt;
      color: var(--gov-muted);
      font-weight: 700;
    }
    .gen-line {
      margin-top: 18px;
      font-size: 9pt;
      color: var(--gov-muted);
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wm">OFFICIAL DOCUMENT</div>
  <div class="shell">
    <div class="frame">
      <div class="ribbon"></div>
      <div class="strap">${escapeHtml(S.strapline)}</div>
      <div class="doc-kind">${escapeHtml(S.docKind)}</div>
      <h1 class="title">${escapeHtml(model.titleSummary || '—')}</h1>

      <div class="meta-grid">${metaHtml}</div>

      <div class="section-h">${escapeHtml(S.bodyHeading)}</div>
      <div class="body-box">${decreeBodyToInnerHtml(model.body)}</div>

      ${qrBlock ?? ''}

      <div class="sign-area">
        <div class="sign-box">${escapeHtml(S.signature)}</div>
        <div class="sign-box">${escapeHtml(S.signature)}</div>
      </div>

      <div class="gen-line">${escapeHtml(S.generated)}: ${escapeHtml(gen)}</div>
    </div>
  </div>
</body>
</html>`;

  const logoHeightPx = 52;
  const headerInner =
    leftUri || rightUri
      ? `<div style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:0 38px 0 38px;">
    <div style="flex:0 0 auto;">${
      leftUri ? `<img alt="" src="${leftUri}" style="height:${logoHeightPx}px;width:auto;max-width:200px;object-fit:contain;" />` : '<span></span>'
    }</div>
    <div style="flex:1;text-align:center;padding:0 12px;font-size:9px;color:#5c6b7d;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">
      ${escapeHtml(S.strapline)}
    </div>
    <div style="flex:0 0 auto;">${
      rightUri ? `<img alt="" src="${rightUri}" style="height:${logoHeightPx}px;width:auto;max-width:200px;object-fit:contain;" />` : '<span></span>'
    }</div>
  </div>`
      : `<div style="font-size:10px;font-weight:700;color:#0f4c75;text-align:center;width:100%;padding:6px 40px;">${escapeHtml(
          S.strapline,
        )}</div>`;

  const headerTemplate = `<div style="width:100%;margin:0;padding:10px 0 8px;border-bottom:1px solid #d7dee8;">${headerInner}</div>`;

  const footerTemplate = `<div style="width:100%;font-size:9px;color:#5c6b7d;padding:4px 42px 8px;border-top:1px solid #e5eaf0;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
    <div style="flex:1;text-align:${rtl ? 'right' : 'left'};">
      <span style="font-weight:700;color:#0f4c75;">${escapeHtml(model.decreeNumberLabel || '')}</span>
      <span style="margin:0 8px;opacity:0.45;">·</span>
      <span>${escapeHtml(S.generated)} ${escapeHtml(gen)}</span>
    </div>
    <div style="flex:0 0 auto;text-align:center;">
      <span class="pageNumber" style="font-weight:800;"></span>
      <span style="opacity:0.45;"> / </span>
      <span class="totalPages" style="font-weight:800;"></span>
    </div>
    <div style="flex:1;text-align:${rtl ? 'left' : 'right'};font-size:8px;opacity:0.85;">
      ${escapeHtml(model.officialReference?.trim() || model.decreeId)}
    </div>
  </div>
</div>`;

  return {
    html,
    headerTemplate,
    footerTemplate,
    pdfMargin: {
      top: leftUri || rightUri ? '104px' : '72px',
      bottom: '78px',
      left: '42px',
      right: '42px',
    },
  };
}

/**
 * Resolve branding buffers to data URIs for Playwright templates.
 * @param {{ leftPng?: Buffer, rightPng?: Buffer }} branding
 */
export function brandingBuffersToDataUri(branding) {
  return {
    leftLogoDataUri: branding.leftPng ? pngBufferToDataUri(branding.leftPng) : null,
    rightLogoDataUri: branding.rightPng ? pngBufferToDataUri(branding.rightPng) : null,
  };
}
