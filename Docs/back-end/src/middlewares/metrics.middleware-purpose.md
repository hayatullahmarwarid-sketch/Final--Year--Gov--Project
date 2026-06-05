<!-- purpose-doc: normalized -->
# Prometheus Metrics Middleware (`metrics.middleware.js`)

## Scenario
The operations team needs visibility into the API’s performance: request rates, response times, error rates, and memory usage. This middleware exposes a `/metrics` endpoint that Prometheus can scrape, and automatically collects HTTP‑level metrics for every request without any manual instrumentation in route handlers.

## What it does
Exports three items:

- **`metricsMiddleware()`** – Express middleware that records every HTTP request: increments a counter for the route and method, observes the response duration in a histogram, and tracks in‑flight requests. It also labels each metric by status code, method, and route pattern.
- **`renderMetrics()`** – an async route handler that queries the Prometheus client registry and returns the current metrics in the Prometheus text format. This is mounted on the `/metrics` endpoint.
- **`metricsContentType()`** – returns the correct `Content‑Type` header (`text/plain`) for the Prometheus format.

## Libraries used
- **prom-client** – the Prometheus client for Node.js, providing counters, histograms, and a register.

## Logic implemented
1. In `metricsMiddleware`, a `Histogram` and `Counter` are created (or reused via `prom-client`’s built‑in `collectDefaultMetrics` if desired, or custom ones).
   - The middleware records `req.startTime`.
   - On response finish, it observes `Date.now() - req.startTime` in the histogram with labels `{ method, route, status_code }`.
   - It increments the counter.
2. `renderMetrics`:
   - Calls `prometheus.register.metrics()` to get the current metric strings.
   - Sets `Content‑Type` and sends the string.
3. `metricsContentType` simply returns the appropriate header value.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
