#!/usr/bin/env node
/**
 * Dept-upload i18n diagnostics:
 * - Lists translation keys used via t('…') under components/dept-upload and app/dept-upload vs keys in en/common.json
 * - Heuristic: quoted ASCII strings in JSX/Text that look like UI prose (length ≥ 4, letters)
 *
 * Usage: node scripts/i18n-scan.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const enPath = path.join(root, 'lib/i18n/locales/en/common.json');
const scanDirs = [
  path.join(root, 'components/dept-upload'),
  path.join(root, 'app/dept-upload'),
];

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const enKeys = new Set(Object.keys(en));

function walkTsx(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkTsx(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

const usedKeys = new Set();
const stringLiterals = [];

const tCall = /\bt\s*\(\s*['"]([^'"]+)['"]/g;

for (const dir of scanDirs) {
  for (const file of walkTsx(dir)) {
    const txt = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = tCall.exec(txt)) !== null) {
      usedKeys.add(m[1]);
    }
    // Avoid matching import paths — crude filter for JSX text-ish quotes
    const lit =
      /(?:>|\})\s*['"]([A-Za-z][^'"{}]{3,80})['"]\s*(?:<|\}|\.)/g;
    while ((m = lit.exec(txt)) !== null) {
      const s = m[1];
      if (/^[a-z]+$/i.test(s) && s.length < 12) continue;
      stringLiterals.push({ file: path.relative(root, file), text: s });
    }
  }
}

const missingInEn = [...usedKeys].filter((k) => !enKeys.has(k)).sort();

console.log('=== Dept-upload i18n scan ===\n');
console.log(`Unique t('key') references: ${usedKeys.size}`);
console.log(`Keys missing from en/common.json: ${missingInEn.length}`);
if (missingInEn.length) {
  console.log(missingInEn.join('\n'));
}
console.log('\n--- Heuristic hardcoded UI-like strings (review manually) ---');
const seen = new Set();
for (const row of stringLiterals) {
  const id = `${row.file}:${row.text}`;
  if (seen.has(id)) continue;
  seen.add(id);
  console.log(`${row.file}: "${row.text}"`);
}
