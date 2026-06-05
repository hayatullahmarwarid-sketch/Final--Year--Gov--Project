import 'dotenv/config';
import http from 'node:http';
import { getEnv } from './config/env.js';
import { getLogger } from './config/logger.js';
import { createApp } from './app.js';
import { connectMongo, disconnectMongo } from '../database/connection/mongoose.js';
import { ensureModelIndexes } from '../database/indexes/registry.js';
import { disconnectRedis, getRedis } from './config/redis.js';
import { registerInProcessHandlersIfNeeded } from './jobs/register-in-process-handlers.js';
import { shutdownQueues } from './jobs/queue-registry.js';
import {
  isOutboundEmailConfigured,
  verifyOutboundSmtpConnection,
} from './services/email/smtp-mailer.service.js';

async function bootstrap() {
  const env = getEnv();
  const log = getLogger();

  const app = createApp();
  await connectMongo();
  await ensureModelIndexes();

  // Warm up Redis if configured; failure is non-fatal — rate-limit + queue fall back to memory / in-process.
  getRedis();
  // In dev (no Redis) we process jobs in the API process so developers don't need a worker.
  registerInProcessHandlersIfNeeded();

  if (env.NODE_ENV !== 'test' && isOutboundEmailConfigured() && !env.SMTP_SKIP_BOOT_VERIFY) {
    try {
      await verifyOutboundSmtpConnection();
      log.info('SMTP: outbound connection verified (registration / password-reset email is enabled).');
    } catch (err) {
      log.warn(
        { err },
        'SMTP is set in env but verify() failed — emails will fail until host, port, TLS, and credentials are fixed in .env.',
      );
    }
  } else if (env.NODE_ENV !== 'test' && !isOutboundEmailConfigured()) {
    log.warn(
      'SMTP not configured (set SMTP_HOST, SMTP_PORT, MAIL_FROM in back-end/.env) — verification emails will not send.',
    );
  }

  const server = http.createServer(app);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log.fatal(
        { port: env.PORT, err },
        `Port ${env.PORT} is already in use (another API instance?). PowerShell: netstat -ano | findstr ":${env.PORT}" then taskkill /PID <pid> /F`,
      );
    } else {
      log.fatal({ err }, 'HTTP server failed to start');
    }
    process.exit(1);
  });

  server.listen(env.PORT, () => {
    log.info({ port: env.PORT, env: env.NODE_ENV }, 'HTTP server listening');
  });

  const shutdown = async (signal) => {
    log.info({ signal }, 'Shutting down');
    await new Promise((resolve) => server.close(resolve));
    await shutdownQueues().catch((err) => log.warn({ err }, 'Queue shutdown failed'));
    await disconnectRedis().catch((err) => log.warn({ err }, 'Redis disconnect failed'));
    await disconnectMongo().catch((err) => log.error({ err }, 'Mongo disconnect failed'));
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  getLogger().fatal({ err }, 'Fatal boot error');
  process.exit(1);
});
