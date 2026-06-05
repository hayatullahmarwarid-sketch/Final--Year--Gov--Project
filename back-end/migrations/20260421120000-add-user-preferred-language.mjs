/**
 * One-shot migration: set `preferredLanguage` on existing users who do not have a valid value.
 * Run from repo root: `node back-end/migrations/20260421120000-add-user-preferred-language.mjs`
 * Requires `MONGODB_URI` in the environment (or `.env` loaded by your shell).
 */
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDotEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadDotEnv();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

await mongoose.connect(uri);
const col = mongoose.connection.collection('users');

const res = await col.updateMany(
  { preferredLanguage: { $nin: ['en', 'ps', 'fa'] } },
  [
    {
      $set: {
        preferredLanguage: {
          $switch: {
            branches: [
              { case: { $eq: ['$preferredLocale', 'en'] }, then: 'en' },
              { case: { $eq: ['$preferredLocale', 'ps'] }, then: 'ps' },
              { case: { $eq: ['$preferredLocale', 'fa'] }, then: 'fa' },
              { case: { $eq: ['$preferredLocale', 'prs'] }, then: 'fa' },
            ],
            default: 'en',
          },
        },
      },
    },
  ],
);

console.log(`preferredLanguage migration: matched=${res.matchedCount} modified=${res.modifiedCount}`);
await mongoose.disconnect();
