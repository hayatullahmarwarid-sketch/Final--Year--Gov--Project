import mongoose from 'mongoose';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

/**
 * Pre-aggregated metrics for heavy dashboards and exports.
 * Writers are typically cron/workers; documents are treated as append-only.
 */
const dashboardMetricsSnapshotSchema = new Schema(
  {
    snapshotKey: { type: String, required: true, trim: true, index: true },

    /** `hourly` | `daily` | `monthly` — kept as string for forward compatibility. */
    granularity: { type: String, required: true, trim: true, default: 'daily', index: true },

    /** UTC period start (normalized to bucket start in the writer). */
    periodStartAt: { type: Date, required: true, index: true },

    /**
     * Serialized dimension map (e.g. `{ "categoryId": "…", "region": "…" }`)
     * hashed for uniqueness without MongoDB object key ordering pitfalls.
     */
    dimensionsKey: { type: String, required: true, trim: true, default: 'global', index: true },
    dimensions: { type: Schema.Types.Mixed, default: undefined },

    metrics: { type: Schema.Types.Mixed, required: true },

    computedAt: { type: Date, default: () => new Date(), index: true },
    computeVersion: { type: Number, default: 1, min: 1 },

    tenantId: { type: String, trim: true, default: null, index: true, sparse: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'dashboard_metrics_snapshots' },
);

dashboardMetricsSnapshotSchema.plugin(standardDomainPlugin, { withTenant: false });

dashboardMetricsSnapshotSchema.index(
  { snapshotKey: 1, granularity: 1, periodStartAt: 1, dimensionsKey: 1, tenantId: 1 },
  { unique: true },
);

dashboardMetricsSnapshotSchema.index({ tenantId: 1, periodStartAt: -1, snapshotKey: 1 });
dashboardMetricsSnapshotSchema.index({ tenantId: 1, isDeleted: 1, snapshotKey: 1 });

export const DashboardMetricsSnapshotModel =
  mongoose.models.DashboardMetricsSnapshot ??
  mongoose.model('DashboardMetricsSnapshot', dashboardMetricsSnapshotSchema);
