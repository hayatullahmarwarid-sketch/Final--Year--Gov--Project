import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

/**
 * Render an A4 portrait certificate PDF and return a Buffer. Intentionally minimal — the
 * design can be swapped per-tenant later. Keeps the worker dependency surface tiny.
 *
 * @param {{
 *   certificateNumber: string,
 *   holderDisplayName: string,
 *   kind: string,
 *   issuedAt: Date,
 *   verifyUrl: string,
 *   examTitle?: string | null,
 *   passPct?: number | null,
 *   proficiencyLevel?: string | null,
 *   issuedByDisplayName?: string | null,
 *   expiresAt?: Date | string | null,
 *   departmentBannerTitle?: string | null,
 * }} input
 * @returns {Promise<Buffer>}
 */
export async function renderCertificatePdf(input) {
  const qrDataUrl = await QRCode.toDataURL(input.verifyUrl, { margin: 1, width: 180 });
  const qrPng = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: 'Certificate' } });
      const chunks = /** @type {Buffer[]} */ ([]);
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header band
      doc.rect(0, 0, doc.page.width, 80).fill('#0088FF');
      const banner =
        typeof input.departmentBannerTitle === 'string' && input.departmentBannerTitle.trim()
          ? input.departmentBannerTitle.trim()
          : 'Official Certificate';
      doc.fillColor('white').fontSize(22).text(banner, 0, 30, { align: 'center' });

      doc.moveDown(2);
      doc.fillColor('black').fontSize(14).text('This is to certify that', { align: 'center' });
      doc.moveDown(0.6);
      doc.fontSize(28).text(input.holderDisplayName, { align: 'center' });
      doc.moveDown(0.6);
      doc.fontSize(14).text('has successfully completed', { align: 'center' });
      doc.moveDown(0.3);

      const kindLabel = input.examTitle ?? input.kind;
      doc.fontSize(18).text(kindLabel, { align: 'center' });
      if (typeof input.passPct === 'number' && Number.isFinite(input.passPct)) {
        doc.moveDown(0.6);
        doc.fontSize(12).fillColor('#374151').text(`Score: ${Math.round(input.passPct)}%`, { align: 'center' });
      }
      if (input.proficiencyLevel) {
        doc.moveDown(0.4);
        doc.fontSize(11)
          .fillColor('#374151')
          .text(`Level: ${String(input.proficiencyLevel)}`, { align: 'center' });
      }

      doc.moveDown(2);
      doc.fontSize(11).fillColor('black');
      doc.text(`Certificate number: ${input.certificateNumber}`, { align: 'center' });
      doc.text(`Issued at: ${input.issuedAt.toISOString().slice(0, 10)}`, { align: 'center' });
      if (input.expiresAt) {
        const exp = input.expiresAt instanceof Date ? input.expiresAt : new Date(input.expiresAt);
        if (!Number.isNaN(exp.getTime())) {
          doc.text(`Valid until: ${exp.toISOString().slice(0, 10)}`, { align: 'center' });
        }
      }
      if (input.issuedByDisplayName) {
        doc.text(`Issued by: ${input.issuedByDisplayName}`, { align: 'center' });
      }

      // QR code bottom-right
      const pageBottom = doc.page.height - 180;
      doc.image(qrPng, doc.page.width - 160, pageBottom, { width: 110 });
      doc.fontSize(9).fillColor('#6B7280').text(
        `Verify: ${input.verifyUrl}`,
        50,
        doc.page.height - 60,
        { width: doc.page.width - 100, align: 'center' },
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
