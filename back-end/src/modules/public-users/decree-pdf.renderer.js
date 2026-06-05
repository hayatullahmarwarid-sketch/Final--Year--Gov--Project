import { getEnv } from '../../config/env.js';
import {
  brandingBuffersToDataUri,
  buildEnterpriseDecreePdfPlaywrightBundle,
} from '../../services/pdf/enterprise-decree-pdf.lib.js';
import { loadPdfBrandingBuffers } from '../../services/pdf/pdf-branding.lib.js';

/** Shared Chromium instance — avoids cold-starting the browser on every decree export. */
let browserSingleton;

async function getSharedChromium() {
  if (!browserSingleton) {
    const { chromium } = await import('playwright');
    browserSingleton = await chromium.launch({
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browserSingleton;
}

/**
 * @param {string} decreeId
 * @param {string | null | undefined} verificationUrl
 */
async function buildQrDataUrl(decreeId, verificationUrl) {
  try {
    const QRCode = (await import('qrcode')).default;
    const payload =
      verificationUrl && verificationUrl.trim()
        ? verificationUrl.trim()
        : `decree:${String(decreeId)}`;
    return await QRCode.toDataURL(payload, {
      margin: 1,
      width: 260,
      errorCorrectionLevel: 'M',
      type: 'image/png',
    });
  } catch {
    return null;
  }
}

function buildVerificationUrl(decreeId) {
  try {
    const env = getEnv();
    const base = env.APP_PUBLIC_BASE_URL;
    if (!base) return null;
    return `${base.replace(/\/$/, '')}/decree/${encodeURIComponent(String(decreeId))}`;
  } catch {
    return null;
  }
}

/**
 * Enterprise decree PDF — multilingual Unicode via embedded Noto + Chromium.
 *
 * @param {{
 *   decreeId: string,
 *   decreeNumberLabel: string,
 *   officialReference: string | null,
 *   titleSummary: string,
 *   locale: string,
 *   body: string,
 *   departmentName?: string | null,
 *   departmentCode?: string | null,
 *   categoryLabel?: string | null,
 *   publishedAtIso?: string | null,
 *   creationDateIso?: string | null,
 *   generatedAtIso: string,
 * }} input
 * @returns {Promise<Buffer>}
 */
export async function renderDecreePdf(input) {
  const brandingBuf = loadPdfBrandingBuffers();
  const logos = brandingBuffersToDataUri(brandingBuf);

  const verificationUrl = buildVerificationUrl(input.decreeId);
  const qrDataUrl = await buildQrDataUrl(input.decreeId, verificationUrl);

  const bundle = buildEnterpriseDecreePdfPlaywrightBundle(
    {
      locale: input.locale,
      decreeId: input.decreeId,
      decreeNumberLabel: input.decreeNumberLabel,
      officialReference: input.officialReference,
      titleSummary: input.titleSummary,
      body: input.body,
      departmentName: input.departmentName ?? null,
      departmentCode: input.departmentCode ?? null,
      categoryLabel: input.categoryLabel ?? null,
      publishedAtIso: input.publishedAtIso ?? null,
      creationDateIso: input.creationDateIso ?? null,
      generatedAtIso: input.generatedAtIso,
      verificationUrl,
      qrDataUrl,
    },
    {
      leftLogoDataUri: logos.leftLogoDataUri,
      rightLogoDataUri: logos.rightLogoDataUri,
    },
  );

  const browser = await getSharedChromium();
  const page = await browser.newPage();
  try {
    await page.setContent(bundle.html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: bundle.headerTemplate,
      footerTemplate: bundle.footerTemplate,
      margin: bundle.pdfMargin,
      preferCSSPageSize: false,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
