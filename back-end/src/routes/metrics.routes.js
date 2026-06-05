import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { getEnv } from '../config/env.js';
import { metricsContentType, renderMetrics } from '../middlewares/metrics.middleware.js';

export const metricsRouter = Router();

/**
 * Gated Prometheus scrape endpoint. Set `METRICS_TOKEN` in env; scrapers must send
 * `Authorization: Bearer <METRICS_TOKEN>`. When unset, the endpoint returns 404 so we don't
 * expose metrics accidentally.
 */
metricsRouter.get('/', async (req, res) => {
  const env = getEnv();
  if (!env.METRICS_TOKEN) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  const auth = req.get('authorization') ?? '';
  const match = /^bearer\s+(.+)$/i.exec(auth);
  const presented = match?.[1]?.trim() ?? '';
  const a = Buffer.from(presented);
  const b = Buffer.from(env.METRICS_TOKEN);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const body = await renderMetrics();
  res.setHeader('Content-Type', metricsContentType());
  res.status(200).send(body);
});
