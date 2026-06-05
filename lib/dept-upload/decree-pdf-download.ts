import { Directory, File, Paths } from 'expo-file-system';
import { EncodingType, readAsStringAsync, StorageAccessFramework, writeAsStringAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import type { SerializedDecree } from '@/lib/api/decree-upload';
import { storage } from '@/lib/adapters/storage';
import { formatDecreeNumberLabel } from '@/lib/decree-number-format';
import { getEmbeddedNotoNaskhFontFaceCss } from '@/lib/pdf/embedded-noto-font';
import { loadGovPdfBrandingDataUris } from '@/lib/pdf/pdf-branding-assets';
import { escapeHtml, formatPdfGeneratedTimestamp } from '@/lib/pdf/pdf-html-shared';

function safeBasename(name: string): string {
  const t = name.replace(/[^a-z0-9._-]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return t.length > 0 ? t.slice(0, 120) : 'decree';
}

function directoryForWrite(): Directory {
  try {
    return Paths.document;
  } catch {
    return Paths.cache;
  }
}

const ANDROID_DECREE_PDF_DIR_URI_KEY = 'deptUpload.decreePdf.android.downloadDirUri.v1';

async function ensureAndroidDecreePdfDirUri(): Promise<string | null> {
  try {
    const cached = await storage.getItem(ANDROID_DECREE_PDF_DIR_URI_KEY);
    if (cached && String(cached).trim()) return String(cached);
  } catch {
    // ignore
  }

  const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!perm.granted || !perm.directoryUri) return null;
  try {
    await storage.setItem(ANDROID_DECREE_PDF_DIR_URI_KEY, perm.directoryUri);
  } catch {
    // ignore
  }
  return perm.directoryUri;
}

async function copyLocalFileToAndroidDirectory(args: {
  localUri: string;
  filename: string;
  mimeType: string;
}): Promise<boolean> {
  const dirUri = await ensureAndroidDecreePdfDirUri();
  if (!dirUri) return false;
  const destUri = await StorageAccessFramework.createFileAsync(dirUri, args.filename, args.mimeType);
  const b64 = await readAsStringAsync(args.localUri, { encoding: EncodingType.Base64 });
  await StorageAccessFramework.writeAsStringAsync(destUri, b64, { encoding: EncodingType.Base64 });
  return true;
}

function bestContentLocale(d: SerializedDecree): string {
  const blocks =
    d.currentPublishedVersion?.localizedContent ?? d.activeDraftVersion?.localizedContent ?? [];
  const pref = ['ps', 'fa', 'en'];
  for (const p of pref) {
    const hit = blocks.find((b) => (b.locale || '').toLowerCase().startsWith(p));
    if (hit) return hit.locale;
  }
  return blocks[0]?.locale ?? 'en';
}

function isRtlLocaleTag(locale: string): boolean {
  const l = locale.toLowerCase();
  return l.startsWith('ps') || l.startsWith('fa') || l.startsWith('ar');
}

function decreeBodyText(d: SerializedDecree): { title?: string; body?: string } {
  const blocks =
    d.currentPublishedVersion?.localizedContent ?? d.activeDraftVersion?.localizedContent ?? [];
  if (!blocks.length) return {};
  const want = bestContentLocale(d);
  const chosen =
    blocks.find((b) => b.locale === want) ??
    blocks.find((b) => (b.locale || '').toLowerCase().startsWith(String(want).slice(0, 2).toLowerCase())) ??
    blocks[0];
  const title = chosen?.title ?? '';
  const body = (chosen?.bodyPlain ?? chosen?.bodyRich ?? '') || '';
  return { title: title || undefined, body: body || undefined };
}

function bodyInnerHtml(body: string | undefined): string {
  const raw = String(body ?? '').trim();
  if (!raw) return '<p class="muted">—</p>';
  const looksHtml =
    /<\/[a-z][a-z0-9]*\s*>/i.test(raw) || /<br\s*\/?>/i.test(raw) || /<p[\s>]/i.test(raw);
  if (looksHtml) {
    const stripped = raw
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '');
    return `<div class="rich">${stripped}</div>`;
  }
  return `<div class="plain">${escapeHtml(raw).replace(/\r?\n/g, '<br/>')}</div>`;
}

type DeptDecreePdfEnhancement = {
  fontFaceCss: string;
  leftLogoDataUri: string | null;
  rightLogoDataUri: string | null;
};

function composeDeptUploadDecreePdfHtml(d: SerializedDecree, enhancement: DeptDecreePdfEnhancement): string {
  const decreeLabel = `Decree ${formatDecreeNumberLabel(d)}`;
  const cat = d.categories?.[0]?.name ?? '—';
  const updated = d.updatedAt ?? d.createdAt ?? null;
  const localeTag = bestContentLocale(d);
  const rtl = isRtlLocaleTag(localeTag);
  const dir = rtl ? 'rtl' : 'ltr';
  const pub = d.publishedAt ? formatPdfGeneratedTimestamp(d.publishedAt) : '—';
  const issue = d.creationDate ? formatPdfGeneratedTimestamp(d.creationDate) : '—';
  const { title, body } = decreeBodyText(d);
  const summary = (() => {
    const md =
      d.metadata && typeof d.metadata === 'object' ? (d.metadata as { description?: string }).description : '';
    if (md && String(md).trim()) return String(md).trim();
    const draft = d.activeDraftVersion?.changeSummary;
    if (draft && String(draft).trim()) return String(draft).trim();
    return '';
  })();

  const ref =
    d.officialReference && String(d.officialReference).trim()
      ? String(d.officialReference).trim()
      : d.decreeNumber && String(d.decreeNumber).trim()
        ? String(d.decreeNumber).trim()
        : '—';

  const logoH = 44;
  const left = enhancement.leftLogoDataUri;
  const right = enhancement.rightLogoDataUri;

  const headStrip = `
<div class="pdf-head">
  <div class="pdf-head-inner">
    <div class="logo-slot">${left ? `<img class="logo" src="${left}" height="${logoH}" alt="" />` : '<span></span>'}</div>
    <div class="head-title">
      <div class="head-kicker">Draft / preview export</div>
      <div class="head-main">${escapeHtml(d.categories?.[0]?.name ? `${d.categories[0].name}` : 'Department decree')}</div>
    </div>
    <div class="logo-slot r">${right ? `<img class="logo" src="${right}" height="${logoH}" alt="" />` : '<span></span>'}</div>
  </div>
  <div class="head-rule"></div>
</div>`;

  const wm = `<div class="wm" aria-hidden="true">OFFICIAL DOCUMENT</div>`;

  return `<!DOCTYPE html>
<html lang="${escapeHtml(localeTag)}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    ${enhancement.fontFaceCss}
    :root {
      --ink:#0c1829;
      --muted:#5c6b7d;
      --rule:#d7dee8;
      --band:#0f4c75;
      --paper:#fafbfd;
    }
    * { box-sizing:border-box; }
    body {
      margin:0;
      padding:0;
      color:var(--ink);
      font-family:'PdfNotoNaskh','Noto Naskh Arabic','Segoe UI',Tahoma,sans-serif;
      font-size:11pt;
      background:var(--paper);
      line-height:1.65;
    }
    .wm {
      position:fixed;
      left:-10%; right:-10%;
      top:34%;
      text-align:center;
      font-size:48px;
      font-weight:900;
      letter-spacing:.12em;
      color:rgba(15,76,117,.065);
      transform:rotate(-30deg);
      pointer-events:none;
      z-index:0;
      text-transform:uppercase;
    }
    .shell { position:relative; z-index:1; padding:22px 22px 40px; }
    .pdf-head {
      position:fixed;
      top:0; left:0; right:0;
      z-index:2;
      background:#fff;
      padding:12px 18px 8px;
      border-bottom:1px solid var(--rule);
    }
    .pdf-head-inner {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      max-width:900px;
      margin:0 auto;
    }
    .logo-slot { flex:0 0 auto; min-width:72px; text-align:center; }
    img.logo { height:${logoH}px; width:auto; max-width:160px; object-fit:contain; }
    .head-title { flex:1; text-align:center; }
    .head-kicker { font-size:8.5pt; letter-spacing:.09em; text-transform:uppercase; font-weight:800; color:var(--muted); }
    .head-main { font-size:12.5pt; font-weight:900; color:var(--band); margin-top:4px; }
    .head-rule { height:3px; margin-top:10px; background:linear-gradient(90deg,var(--band),#2d8bc7); }
    .pad-header { height:104px; }
    .frame {
      border:1px solid var(--rule);
      border-radius:3px;
      padding:22px 20px 24px;
      background:#fff;
    }
    .ribbon {
      height:4px;
      background:linear-gradient(90deg,var(--band),#1b6fa8);
      margin:-22px -20px 18px;
      border-radius:3px 3px 0 0;
    }
    .title { font-size:17pt; font-weight:900; margin:0 0 8px; line-height:1.35; }
    .subtitle { margin:0; font-size:11pt; color:var(--muted); font-weight:700; }
    .meta-grid {
      border:1px solid var(--rule);
      border-radius:3px;
      overflow:hidden;
      margin:16px 0 18px;
    }
    .meta-row {
      display:grid;
      grid-template-columns:minmax(110px,36%) 1fr;
      gap:10px;
      padding:9px 12px;
      border-bottom:1px solid var(--rule);
      align-items:start;
    }
    .meta-row:nth-child(odd) { background:#f6f8fb; }
    .meta-row:last-child { border-bottom:0; }
    .mk { font-size:9pt; font-weight:800; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }
    .mv { font-size:10.5pt; font-weight:700; word-break:break-word; }
    h2.section {
      font-size:9.5pt;
      letter-spacing:.08em;
      text-transform:uppercase;
      font-weight:900;
      color:var(--band);
      margin:18px 0 8px;
      padding-bottom:6px;
      border-bottom:2px solid rgba(15,76,117,.15);
    }
    .body-box {
      border:1px solid var(--rule);
      border-radius:3px;
      padding:14px 16px;
      min-height:100px;
      background:#fff;
    }
    .rich p { margin:0 0 .55em; }
    .muted { color:var(--muted); }
    .sign-area {
      margin-top:22px;
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:16px;
    }
    .sign-box {
      border-top:1px solid var(--ink);
      padding-top:8px;
      min-height:64px;
      font-size:9pt;
      color:var(--muted);
      font-weight:700;
    }
    @media print {
      .pdf-head { position:fixed; }
    }
  </style>
</head>
<body>
  ${wm}
  ${headStrip}
  <div class="pad-header"></div>
  <div class="shell">
    <div class="frame">
      <div class="ribbon"></div>
      <h1 class="title">${escapeHtml(decreeLabel)}</h1>
      <p class="subtitle">${escapeHtml(title || d.titleSummary || '—')}</p>

      <div class="meta-grid">
        <div class="meta-row"><div class="mk">Official reference</div><div class="mv">${escapeHtml(ref)}</div></div>
        <div class="meta-row"><div class="mk">Category</div><div class="mv">${escapeHtml(cat)}</div></div>
        <div class="meta-row"><div class="mk">Status</div><div class="mv">${escapeHtml(String(d.status || '—'))}</div></div>
        <div class="meta-row"><div class="mk">Publication date</div><div class="mv">${escapeHtml(pub)}</div></div>
        <div class="meta-row"><div class="mk">Issue date</div><div class="mv">${escapeHtml(issue)}</div></div>
        <div class="meta-row"><div class="mk">Language</div><div class="mv">${escapeHtml(localeTag)}</div></div>
      </div>

      <h2 class="section">Summary</h2>
      <div class="body-box">${escapeHtml(summary || 'No description on file.').replace(/\n/g, '<br/>')}</div>

      <h2 class="section">Decree text</h2>
      <div class="body-box">${bodyInnerHtml(body)}</div>

      <div class="sign-area">
        <div class="sign-box">Authorized signature</div>
        <div class="sign-box">Authorized signature</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * UTF-8 decree preview PDF with embedded Arabic-script font and government-style layout (logos in fixed header).
 */
export async function buildDeptUploadDecreePdfHtml(d: SerializedDecree): Promise<string> {
  const [fontFaceCss, logos] = await Promise.all([
    getEmbeddedNotoNaskhFontFaceCss(),
    loadGovPdfBrandingDataUris(),
  ]);
  return composeDeptUploadDecreePdfHtml(d, {
    fontFaceCss,
    leftLogoDataUri: logos.leftLogoDataUri,
    rightLogoDataUri: logos.rightLogoDataUri,
  });
}

export function decreePdfFilename(d: SerializedDecree): string {
  const base = safeBasename(`decree-${formatDecreeNumberLabel(d)}`.replace(/^decree-—$/i, `decree-${d.id}`));
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

/**
 * Save a generated PDF file (local URI from `expo-print`) to device storage.
 * - Android: writes to a user-chosen directory (typically Downloads) via SAF.
 * - iOS: writes into app Documents (device local storage); user-visible save is via Share sheet.
 * - Web: triggers a browser download.
 */
export async function saveGeneratedPdfToDeviceStorage(args: {
  localUri: string;
  filename: string;
}): Promise<{ savedUri: string; userVisible: boolean }> {
  const filename = safeBasename(args.filename.endsWith('.pdf') ? args.filename : `${args.filename}.pdf`);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const r = await fetch(args.localUri);
    const blob = await r.blob();
    const bUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = bUrl;
    a.setAttribute('download', filename);
    a.click();
    setTimeout(() => URL.revokeObjectURL(bUrl), 60_000);
    return { savedUri: filename, userVisible: true };
  }

  const dir = directoryForWrite();
  const local = new File(dir, filename);
  const b64 = await readAsStringAsync(args.localUri, { encoding: EncodingType.Base64 });
  await writeAsStringAsync(local.uri, b64, { encoding: EncodingType.Base64 });

  if (Platform.OS === 'android') {
    const ok = await copyLocalFileToAndroidDirectory({ localUri: local.uri, filename, mimeType: 'application/pdf' });
    if (ok) return { savedUri: filename, userVisible: true };
    return { savedUri: local.uri, userVisible: false };
  }

  return { savedUri: local.uri, userVisible: false };
}
