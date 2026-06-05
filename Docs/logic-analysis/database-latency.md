# Database latency (system admin health)

## What is measured

**MongoDB round-trip latency** for a single administrative **`ping`** command:

```59:62:back-end/src/modules/system-admin/system-admin.service.js
async function measureDatabasePingMs(conn) {
  const t0 = Date.now();
  await conn.db.admin().command({ ping: 1 });
  return Date.now() - t0;
}
```

## Where it runs

- **Not** Express middleware for ordinary requests.
- Invoked inside `SystemAdminService.getSystemSummary()` when building the **system admin** summary payload, **only if** `mongoose.connection.readyState === 1` and `mongoose.connection.db` exists.

## Interpretation thresholds

From `getSystemSummary()`:

- `databaseLatencyMs` is assigned from `measureDatabasePingMs`.
- **`databaseState`**: `'ok'` if latency **≤ 800 ms**, else `'slow'`. On exception → `'down'`.
- These feed **`health.status`**, **`health.database`**, and **`health.api`** together with **HTTP error-rate logic** (see [dashboards-and-metrics.md](./dashboards-and-metrics.md)).

## Display

The React Native **system admin** overview reads summary fields such as `health.databaseLatencyMs` and renders them (e.g. `systemAdminHealthMetricDb` / `systemAdminHealthDbMs` in `app/system-admin/index.tsx`).

## What this is *not*

- **Not** average query duration across all DB operations.
- **Not** per-request measurement of Mongoose calls.
- **Not** the Prometheus histogram for HTTP duration (`metrics.middleware.js`); that is separate instrumentation.

## Inferred / needs verification

- Whether **`ping`** latency correlates with heavy aggregation workloads (typically it only reflects connection/control-plane responsiveness).
