import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { getEnv } from './config/env.js';
import { getLogger } from './config/logger.js';
import { requestContextMiddleware } from './middlewares/request-context.middleware.js';
import { resolveBearerJwtMiddleware } from './middlewares/auth.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { errorHandlerMiddleware } from './middlewares/error-handler.middleware.js';
import { auditHttpWritesMiddleware } from './middlewares/audit-http-writes.middleware.js';
import { globalApiLimiter } from './middlewares/rate-limit.middleware.js';
import { metricsMiddleware } from './middlewares/metrics.middleware.js';
import { i18nMiddleware } from './modules/shared/i18n/index.js';
import { rootRouter } from './routes/index.js';

function parseCorsOrigin(value) {
  if (value === '*') return true;
  const list = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return true;
  if (list.length === 1) return list[0];
  return list;
}

const DEV_AUTH_HEADERS = [
  'x-public-user-id',
  'x-inspector-user-id',
  'x-staff-user-id',
];

/**
 * In production, refuse any request that carries a dev-bypass header. The env schema already
 * blocks `PUBLIC_API_STANDALONE_USER_ID` at boot; this middleware covers the runtime surface.
 *
 * @returns {import('express').RequestHandler}
 */
function blockDevHeadersInProduction() {
  return (req, res, next) => {
    const env = getEnv();
    if (!env.DISABLE_DEV_AUTH_HEADERS) return next();
    for (const header of DEV_AUTH_HEADERS) {
      if (req.headers[header] != null) {
        res.status(400).json({
          success: false,
          message: 'Dev auth headers are disabled in this environment',
          error: {
            code: 'DEV_HEADERS_DISABLED',
            message: 'Dev auth headers are disabled in this environment',
            details: { header },
          },
        });
        return;
      }
    }
    return next();
  };
}

export function createApp() {
  const env = getEnv();
  const logger = getLogger();

  const app = express();
  app.disable('x-powered-by');

  // Trust the first proxy (load balancer / CDN) — required for correct req.ip with X-Forwarded-For.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // Strict defaults; per-endpoint overrides are possible via helmet() on a sub-router.
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: { action: 'deny' },
    }),
  );
  app.use(
    cors({
      origin: parseCorsOrigin(env.CORS_ORIGIN),
      credentials: false,
    }),
  );
  // Gzip/brotli negotiation. Threshold at 1KB avoids header-overhead for tiny responses.
  app.use(compression({ threshold: 1024 }));
  app.use(express.json({ limit: '1mb' }));

  // /uploads is served as static content; keep it strict and drop frame embedding.
  const uploadDirAbsolute = path.resolve(process.cwd(), env.UPLOAD_DIR);
  app.use(
    '/uploads',
    helmet.contentSecurityPolicy({
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        imgSrc: ["'self'"],
        mediaSrc: ["'self'"],
      },
    }),
    express.static(uploadDirAbsolute, { index: false, dotfiles: 'ignore' }),
  );

  app.use(requestContextMiddleware());
  app.use(blockDevHeadersInProduction());
  app.use(resolveBearerJwtMiddleware());
  app.use(i18nMiddleware());
  app.use(globalApiLimiter());
  app.use(metricsMiddleware());

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.context?.requestId,
      customProps: (req) => ({
        requestId: req.context?.requestId,
      }),
    }),
  );

  app.use(auditHttpWritesMiddleware());
  app.use(rootRouter);
  app.use(notFoundMiddleware());
  app.use(errorHandlerMiddleware);

  return app;
}
