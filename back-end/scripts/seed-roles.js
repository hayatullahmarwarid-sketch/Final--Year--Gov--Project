import 'dotenv/config';
import { getLogger } from '../src/config/logger.js';
import { connectMongo, disconnectMongo } from '../database/connection/mongoose.js';
import { ensureModelIndexes } from '../database/indexes/registry.js';
import { runAllSeeders } from '../database/seeders/run-seed.js';

const log = getLogger();

function assertSeedingAllowed() {
  const env = String(process.env.NODE_ENV ?? '').trim().toLowerCase();
  if (env === 'production') {
    throw new Error('Refusing to run seeders in production (NODE_ENV=production).');
  }
  if (String(process.env.DISABLE_DB_SEEDING ?? '').trim().toUpperCase() === 'YES') {
    throw new Error('Refusing to run seeders: DISABLE_DB_SEEDING=YES is set.');
  }
  const allow = String(process.env.ALLOW_DB_SEEDING ?? '').trim().toUpperCase();
  if (allow !== 'YES') {
    throw new Error('Refusing to run seeders without explicit ALLOW_DB_SEEDING=YES.');
  }
}

try {
  assertSeedingAllowed();
  await connectMongo();
  await ensureModelIndexes();
  const result = await runAllSeeders();
  log.info({ result }, 'Seed completed');
} catch (err) {
  log.error({ err }, 'Seed failed');
  process.exitCode = 1;
} finally {
  await disconnectMongo().catch((err) => log.error({ err }, 'Disconnect failed'));
}
