import { Brand } from '@/constants/brand';
import type { CertificateLevel, CertificateListItem } from '@/data/certificates';

const LEVEL_COPY: Record<CertificateLevel, { level: string; accent: string }> = {
  advanced: { level: 'Advanced', accent: '#F1B434' },
  intermediate: { level: 'Intermediate', accent: '#1B7340' },
  basic: { level: 'Basic', accent: '#0088FF' },
};

/** Multi-page HTML for expo-print (PDF / system print). */
export function buildCertificatePdfHtml(item: CertificateListItem, recipientName: string): string {
  const { level, accent } = LEVEL_COPY[item.level];
  const green = Brand.green;

  const page = (inner: string) => `
    <div class="page">${inner}</div>
  `;

  const p1 = `
    <div class="cert border-accent" style="border-color:${accent}">
      <div class="row-top">
        <div class="emblem-block">
          <div class="emblem">☪</div>
          <p class="small">Sharia Decrees Authority</p>
          <p class="small">Ministry of Justice</p>
        </div>
        <div class="right-title">
          <h1 style="color:${green}">Certificate</h1>
          <p class="sub" style="color:${accent}">Certificate of Completion</p>
        </div>
      </div>
      <p class="body">This is to certify that <strong>${escapeHtml(recipientName)}</strong> has successfully completed the examination and demonstrated proficiency.</p>
      <div class="row-bottom">
        <div class="qr-block">
          <div class="qr-placeholder">QR</div>
          <p class="tiny">Certificate ID: ${escapeHtml(item.certificateId)}</p>
          <p class="tiny">Scan to verify</p>
        </div>
        <div class="meta-block">
          <p>Date of Issue: ${escapeHtml(item.dateLabel)}</p>
          <div class="pill" style="border-color:${accent};color:${accent}">Valid for 2 Years</div>
        </div>
      </div>
    </div>
  `;

  const p2 = `
    <div class="cert border-accent" style="border-color:${accent}">
      <h2 style="color:${green};text-align:center">Certificate of Completion</h2>
      <p class="tri">English | پښتو | دری</p>
      <p class="body">This is to certify that</p>
      <p class="name">${escapeHtml(recipientName)}</p>
      <p class="body">has successfully completed the examination and demonstrated proficiency.</p>
      <div class="center-pill" style="background:${accent}22;border:1px solid ${accent};color:#92400e">
        <span style="color:${item.level === 'intermediate' ? green : item.level === 'basic' ? '#0088FF' : '#B45309'}">${escapeHtml(item.categoryBadge)}</span>
      </div>
      <p class="body">Date of Issue: ${escapeHtml(item.dateLabel)}</p>
      <div class="valid-box" style="border-color:${accent};background:${accent}14">
        <p>Valid for 2 Years</p>
        <p class="tiny">Expires: ${escapeHtml(item.expiresLabel)}</p>
      </div>
    </div>
  `;

  const scoreColor =
    item.level === 'advanced' ? '#D97706' : item.level === 'intermediate' ? green : '#0088FF';

  const p3 = `
    <div class="cert border-accent" style="border-color:${accent}">
      <div class="score-row">
        <div></div>
        <div class="score-block">
          <p class="small">Score Achieved</p>
          <p class="score" style="color:${scoreColor}">${item.scorePct}%</p>
          <p class="small">Proficiency Level</p>
          <div class="level-pill" style="background:${accent}22;border:1px solid ${accent};color:${scoreColor}">${level}</div>
        </div>
      </div>
      <p class="name">${escapeHtml(recipientName.split(' ').pop() ?? recipientName)}</p>
      <div class="sigs">
        <div class="sig"><p class="tiny">Head of Examinations</p><div class="line"></div></div>
        <div class="seal">★</div>
        <div class="sig"><p class="tiny">Chief Registrar</p><div class="line"></div></div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 16px; color: #111827; }
  .page { page-break-after: always; padding: 8px 0; }
  .page:last-child { page-break-after: auto; }
  .cert { border: 2px solid #E5E7EB; border-radius: 12px; padding: 20px; min-height: 420px; background: #fff; }
  .border-accent { border-top-width: 4px; border-bottom-width: 4px; }
  .row-top { display: flex; justify-content: space-between; gap: 16px; }
  .emblem-block { text-align: center; max-width: 38%; }
  .emblem { font-size: 36px; margin-bottom: 8px; }
  .right-title h1 { margin: 0; font-size: 28px; }
  .sub { margin: 4px 0 0; font-size: 14px; font-weight: 600; }
  .body { font-size: 14px; line-height: 1.5; margin: 16px 0; text-align: center; }
  .small { font-size: 12px; color: #6B7280; margin: 4px 0; }
  .tiny { font-size: 11px; color: #6B7280; margin: 2px 0; }
  .row-bottom { display: flex; justify-content: space-between; margin-top: 24px; gap: 12px; }
  .qr-block { text-align: center; }
  .qr-placeholder { width: 96px; height: 96px; border: 2px dashed #9CA3AF; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #6B7280; }
  .meta-block { text-align: right; font-size: 13px; }
  .pill { display: inline-block; padding: 6px 12px; border-radius: 999px; border: 1px solid; margin-top: 8px; font-size: 12px; font-weight: 700; }
  h2 { font-size: 20px; margin: 0 0 8px; }
  .tri { text-align: center; font-size: 12px; color: #6B7280; margin-bottom: 16px; }
  .name { font-size: 22px; font-weight: 700; text-align: center; color: #004a7a; font-family: Georgia, serif; margin: 12px 0; }
  .center-pill { text-align: center; padding: 10px 16px; border-radius: 999px; margin: 16px auto; max-width: 280px; font-weight: 700; font-size: 13px; }
  .valid-box { margin-top: 20px; padding: 12px; border-radius: 10px; border: 1px solid; text-align: center; font-size: 13px; }
  .score-row { display: flex; justify-content: flex-end; }
  .score-block { text-align: right; }
  .score { font-size: 42px; font-weight: 800; margin: 4px 0 12px; }
  .level-pill { display: inline-block; padding: 8px 16px; border-radius: 999px; font-weight: 700; font-size: 14px; }
  .sigs { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding: 0 8px; }
  .sig { flex: 1; text-align: center; }
  .line { height: 2px; background: #9CA3AF; margin: 8px 16px 0; }
  .seal { width: 48px; height: 48px; border-radius: 24px; background: ${accent}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; margin: 0 8px; }
</style>
</head><body>
${page(p1)}
${page(p2)}
${page(p3)}
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
