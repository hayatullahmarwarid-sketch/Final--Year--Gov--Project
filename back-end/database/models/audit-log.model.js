import mongoose from 'mongoose';

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    actionKey: { type: String, required: true, trim: true, index: true },

    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, required: true, trim: true, index: true },

    /** Human-readable summary for admin grids (keep small). */
    summary: { type: String, trim: true, default: null },

    /** Structured diff / payload; prefer storing redacted shapes. */
    payload: { type: Schema.Types.Mixed, default: undefined },

    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorRoleKey: { type: String, trim: true, default: null, index: true, sparse: true },
    actorType: {
      type: String,
      enum: ['user', 'system', 'integration'],
      default: 'user',
      index: true,
    },

    /** Reserved for tracing across services / gateways. */
    correlationId: { type: String, trim: true, default: null, index: true, sparse: true },
    /** Reserved for session binding once auth ships. */
    sessionId: { type: String, trim: true, default: null, index: true, sparse: true },

    ipAddress: { type: String, trim: true, default: null },
    userAgent: { type: String, trim: true, default: null },

    /**
     * HMAC over canonical event fields when `AUDIT_LOG_INTEGRITY_SECRET` is set.
     * Enables offline tamper checks (recompute from stored payload + metadata).
     */
    integrityHash: { type: String, trim: true, default: null, index: true, sparse: true },

    /** Business-time of the event (defaults to ingest time). */
    occurredAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true, collection: 'audit_logs' },
);

auditLogSchema.index({ entityType: 1, entityId: 1, occurredAt: -1 });
auditLogSchema.index({ actorUserId: 1, occurredAt: -1 });
auditLogSchema.index({ actionKey: 1, occurredAt: -1 });

export const AuditLogModel = mongoose.models.AuditLog ?? mongoose.model('AuditLog', auditLogSchema);
