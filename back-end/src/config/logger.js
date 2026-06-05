import pino from 'pino';
import { getEnv } from './env.js';

let logger;

/**
 * @returns {import('pino').Logger}
 */
export function getLogger() {
  if (logger) return logger;
  const env = getEnv();
  logger = pino({
    level: env.LOG_LEVEL,
    base: { service: 'sharia-decrees-api' },
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie'],
      remove: true,
    },
  });
  return logger;
}
