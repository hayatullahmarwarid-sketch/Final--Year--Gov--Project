import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Returns absolute path to a bundled TTF for Arabic / Persian / Pashto shaping in Chromium PDF.
 * Falls back to `@expo-google-fonts/noto-naskh-arabic` from the API's node_modules.
 */
export function resolveNotoNaskhArabicTtfPath() {
  const candidates = [
    path.join(__dirname, '../../../node_modules/@expo-google-fonts/noto-naskh-arabic/400Regular/NotoNaskhArabic_400Regular.ttf'),
    '@expo-google-fonts/noto-naskh-arabic/400Regular/NotoNaskhArabic_400Regular.ttf',
  ];
  for (const rel of candidates) {
    try {
      if (rel.startsWith('@')) return require.resolve(rel);
      if (fs.existsSync(rel)) return rel;
    } catch {
      /* continue */
    }
  }
  return null;
}

/**
 * @returns {string} `@font-face { ... }` rule or empty string.
 */
export function buildEmbeddedNotoNaskhFaceCss() {
  const p = resolveNotoNaskhArabicTtfPath();
  if (!p) return '';
  try {
    const b64 = fs.readFileSync(p).toString('base64');
    return `
@font-face {
  font-family: "PdfNotoNaskh";
  src: url("data:font/ttf;base64,${b64}") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: block;
}`;
  } catch {
    return '';
  }
}
