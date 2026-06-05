import { DashboardMetricsSnapshotModel } from '../../../database/models/dashboard-metrics-snapshot.model.js';

/**
 * Snapshot TTLs per dashboard. Higher-traffic / heavier dashboards get longer TTLs.
 * Personalized dashboards (public) use a very short TTL.
 * @type {Readonly<Record<string, number>>}
 */
export const DASHBOARD_TTL_SECONDS = Object.freeze({
  system_admin: 300,
  decree_upload: 300,
  inspector_admin: 180,
  inspector: 120,
  public: 60,
});

/**
 * Read a cached dashboard payload from `dashboard_metrics_snapshots`. Returns `null` when
 * the snapshot is missing or older than its TTL.
 *
 * @param {string} snapshotKey e.g. `dashboard:system_admin`
 * @param {string} [dimensionsKey]  Use `global` for shared dashboards, `user:<id>` for personalized.
 * @returns {Promise<{ metrics: unknown, computedAt: Date } | null>}
 */
export async function readDashboardSnapshot(snapshotKey, dimensionsKey = 'global') {
  const row = await DashboardMetricsSnapshotModel.findOne({
    snapshotKey,
    dimensionsKey,
    isDeleted: false,
  })
    .sort({ periodStartAt: -1 })
    .lean();

  if (!row) return null;

  const role = snapshotKey.replace(/^dashboard:/, '');
  const ttl = DASHBOARD_TTL_SECONDS[role] ?? 300;
  const ageMs = Date.now() - new Date(row.computedAt ?? row.updatedAt ?? row.periodStartAt).getTime();
  if (ageMs > ttl * 1000) return null;

  return { metrics: row.metrics, computedAt: new Date(row.computedAt ?? row.updatedAt) };
}

/**
 * Upsert a dashboard snapshot row. Uses `(snapshotKey, granularity, periodStartAt, dimensionsKey, tenantId)`
 * unique index — we set `periodStartAt` to the UTC day start so one row is kept per role per day.
 *
 * @param {string} snapshotKey
 * @param {unknown} metrics
 * @param {{ dimensionsKey?: string, dimensions?: Record<string, unknown>, tenantId?: string | null }} [options]
 */
export async function writeDashboardSnapshot(snapshotKey, metrics, options = {}) {
  const periodStartAt = new Date();
  periodStartAt.setUTCHours(0, 0, 0, 0);

  await DashboardMetricsSnapshotModel.updateOne(
    {
      snapshotKey,
      granularity: 'daily',
      periodStartAt,
      dimensionsKey: options.dimensionsKey ?? 'global',
      tenantId: options.tenantId ?? null,
    },
    {
      $set: {
        metrics,
        dimensions: options.dimensions,
        computedAt: new Date(),
      },
    },
    { upsert: true },
  );
}
