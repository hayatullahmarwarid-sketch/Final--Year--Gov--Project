/**
 * Minimal forward-only migration runner. Reads `*.mjs` files in this folder (sorted
 * lexicographically), applies the ones not present in `schema_migrations`, and records each
 * one on success. Use:
 *
 *   npm run db:migrate            # apply pending
 *   npm run db:migrate:status     # summary only
 *   npm run db:migrate:down       # revert LAST applied (safety: explicit)
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectMongo, disconnectMongo } from '../connection/mongoose.js';
import { SchemaMigrationModel } from '../models/schema-migration.model.js';
import { getLogger } from '../../src/config/logger.js';

const here = path.dirname(fileURLToPath(import.meta.url));

async function loadMigrations() {
  const entries = await fs.readdir(here);
  const files = entries.filter((f) => /^\d{4,}_.+\.mjs$/.test(f)).sort();
  const out = [];
  for (const file of files) {
    const mod = await import(path.join(here, file));
    if (typeof mod.up !== 'function' || typeof mod.name !== 'string') {
      throw new Error(`Migration ${file} must export \`name: string\` and \`up()\``);
    }
    out.push({ file, name: mod.name, module: mod });
  }
  return out;
}

async function appliedNames() {
  const rows = await SchemaMigrationModel.find({}, { name: 1 }).lean();
  return new Set(rows.map((r) => r.name));
}

/**
 * @param {'up' | 'status' | 'down'} action
 */
async function main(action) {
  const log = getLogger();
  await connectMongo();

  const migrations = await loadMigrations();
  const applied = await appliedNames();

  if (action === 'status') {
    for (const m of migrations) {
      const state = applied.has(m.name) ? 'applied ' : 'pending ';
      console.log(`  [${state}] ${m.name}`);
    }
    await disconnectMongo();
    return;
  }

  if (action === 'down') {
    const last = await SchemaMigrationModel.findOne().sort({ appliedAt: -1 }).lean();
    if (!last) {
      console.log('No migrations to revert.');
      await disconnectMongo();
      return;
    }
    const target = migrations.find((m) => m.name === last.name);
    if (!target) {
      throw new Error(`Applied migration "${last.name}" has no matching file — refusing to revert.`);
    }
    if (typeof target.module.down !== 'function') {
      throw new Error(`Migration ${target.name} has no down().`);
    }
    log.info({ name: target.name }, 'migration.reverting');
    const t0 = Date.now();
    await target.module.down({ mongoose, logger: log });
    await SchemaMigrationModel.deleteOne({ name: target.name });
    log.info({ name: target.name, ms: Date.now() - t0 }, 'migration.reverted');
    await disconnectMongo();
    return;
  }

  // action === 'up'
  const pending = migrations.filter((m) => !applied.has(m.name));
  if (pending.length === 0) {
    log.info('migrations.up_to_date');
    await disconnectMongo();
    return;
  }
  for (const m of pending) {
    log.info({ name: m.name }, 'migration.applying');
    const t0 = Date.now();
    await m.module.up({ mongoose, logger: log });
    const durationMs = Date.now() - t0;
    await SchemaMigrationModel.create({
      name: m.name,
      durationMs,
      appliedByHost: os.hostname(),
    });
    log.info({ name: m.name, durationMs }, 'migration.applied');
  }
  await disconnectMongo();
}

const arg = process.argv[2] === 'status' ? 'status' : process.argv[2] === 'down' ? 'down' : 'up';
main(arg).catch((err) => {
  getLogger().fatal({ err }, 'migration.failed');
  disconnectMongo().finally(() => process.exit(1));
});
