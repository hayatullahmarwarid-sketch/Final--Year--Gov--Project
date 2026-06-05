import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpHistogram = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const httpCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpInflight = new promClient.Gauge({
  name: 'http_requests_inflight',
  help: 'Currently in-flight HTTP requests',
  labelNames: ['method'],
  registers: [register],
});

/**
 * Normalize `:id`-heavy routes so we don't explode cardinality. We take `req.route?.path` when
 * available, else the mounted `baseUrl + path`.
 *
 * @param {import('express').Request} req
 */
function resolveRoute(req) {
  const routePath = /** @type {string | undefined} */ (/** @type {any} */ (req).route?.path);
  if (routePath) {
    const base = /** @type {string} */ (req.baseUrl || '');
    return `${base}${routePath}`.replace(/\/+$/, '') || '/';
  }
  // Fallback: strip obvious ObjectId segments to reduce cardinality.
  const raw = `${req.baseUrl || ''}${req.path || ''}` || '/';
  return raw.replace(/\/[a-f0-9]{24}(?=\/|$)/gi, '/:id');
}

/**
 * Express middleware that measures request duration and increments counters.
 * @returns {import('express').RequestHandler}
 */
export function metricsMiddleware() {
  return (req, res, next) => {
    httpInflight.inc({ method: req.method });
    const end = httpHistogram.startTimer();
    res.on('finish', () => {
      const route = resolveRoute(req);
      const labels = { method: req.method, route, status: String(res.statusCode) };
      end(labels);
      httpCounter.inc(labels);
      httpInflight.dec({ method: req.method });
    });
    next();
  };
}

export async function renderMetrics() {
  return register.metrics();
}

export function metricsContentType() {
  return register.contentType;
}
