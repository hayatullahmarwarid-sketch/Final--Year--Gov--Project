import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Resolved from `back-end/src/services/pdf` → `back-end/assets/pdf-branding`. */
const BRANDING_DIR = path.join(__dirname, '../../../assets/pdf-branding');

/**
 * @returns {{ leftPng?: Buffer, rightPng?: Buffer }}
 */
export function loadPdfBrandingBuffers() {
  const leftPath = path.join(BRANDING_DIR, 'logo-ministry.png');
  const rightPath = path.join(BRANDING_DIR, 'logo-national-emblem.png');
  const out = {};
  try {
    if (fs.existsSync(leftPath)) out.leftPng = fs.readFileSync(leftPath);
  } catch {
    /* ignore */
  }
  try {
    if (fs.existsSync(rightPath)) out.rightPng = fs.readFileSync(rightPath);
  } catch {
    /* ignore */
  }
  return out;
}

/**
 * @param {Buffer} buf
 * @returns {string}
 */
export function pngBufferToDataUri(buf) {
  return `data:image/png;base64,${buf.toString('base64')}`;
}
