# Dashboard snapshots and operational metrics

## Cached dashboard payloads

`dashboard-snapshot.service.js`:

- Snapshots stored in **`dashboard_metrics_snapshots`** with keys like `dashboard:<role>` (e.g. `dashboard:system_admin`).
- **TTL (seconds):** `system_admin` / `decree_upload` **300**, `inspector_admin` **180**, `inspector` **120**, `public` **60**.
- **Stale snapshots:** `readDashboardSnapshot` returns `null` if age exceeds TTL → callers recompute.
- **Writes:** `writeDashboardSnapshot` upserts by `(snapshotKey, granularity=daily, periodStartAt=UTC midnight, dimensionsKey, tenantId)`.

`DashboardsService.#snapshotOrCompute` reads cache first; on miss, runs the heavy `compute` function and **async** writes the snapshot (failures logged only).

## System admin dashboard composition

`#computeSystemAdminDashboard` merges:

- `systemAdmin.getDashboard()` (base cards/headline — see `system-admin.service.js`),
- `collectAuditDailyTrend(14)` — counts **all** `audit_logs` by UTC day (not filtered by action),
- `collectPlatformEntityTotals` — raw `countDocuments` totals for decrees, assignments, submissions, exams, certificates, public users.

## Prometheus HTTP metrics (separate from DB ping)

`metrics.middleware.js`:

- **Histogram** `http_request_duration_seconds` with labels `method`, `route`, `status`.
- **Counter** `http_requests_total`.
- **Gauge** `http_requests_inflight`.
- Route normalization uses `req.route.path` when present; otherwise replaces 24-char hex ids with `:id` to limit cardinality.
- Timer stops on **`res.finish`**.

This path is **not** wired into the React admin “DB ms” chip; that chip uses **Mongo ping** (see [database-latency.md](./database-latency.md)).

## HTTP error rate in system summary

`getSystemSummary` uses `auditLogs.aggregateHttpStatusStatsSince(since1h)` where `since1h` is **now − 1 hour**.

### Important implementation note (needs verification)

`aggregateHttpStatusStatsSince` aggregates audit rows with **top-level** field `httpStatus` of type number:

```195:214:back-end/database/repositories/audit-log.repository.js
  async aggregateHttpStatusStatsSince(since) {
    const rows = await this.model
      .aggregate([
        {
          $match: {
            occurredAt: { $gte: since },
            httpStatus: { $type: 'number' },
          },
        },
```

However, `auditService.logHttpWrite` stores the status code inside **`payload.details.statusCode`** (via `log` → `payload`), and the **Mongoose schema** for `audit_logs` shown in `audit-log.model.js` does **not** declare a root `httpStatus` field.

**Inferred from partial code:** unless another writer denormalizes `httpStatus` onto audit documents, **this aggregation may match zero rows**, causing `httpErrorRatePct` to stay at **0** despite real traffic.

The **serializer** (`audit-log.serializer.js`) **reads** HTTP status from **`payload.statusCode`** for display purposes—consistent with storage under `payload`, not root `httpStatus`.

**Action for operators:** treat **dashboard HTTP error %** as **unverified** until schema/pipeline alignment is confirmed in your deployment’s Mongo data.

## Mutating-request audit trail

`audit-http-writes.middleware.js` logs **`http.write`** after non-GET/HEAD/OPTIONS responses (subject to path skips like `/health`, `/metrics`, static assets). That drives **volume** of audit rows but, per above, may not align with `httpStatus` aggregation without further mapping.
