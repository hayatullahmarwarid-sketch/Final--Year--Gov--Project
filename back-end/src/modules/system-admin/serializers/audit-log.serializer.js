/**
 * @param {unknown} payload
 */
function buildHttpWriteFields(payload) {
  if (!payload || typeof payload !== 'object') {
    return { httpMethod: null, httpPath: null, httpStatus: null };
  }
  const p = /** @type {Record<string, unknown>} */ (payload);
  const method = typeof p.method === 'string' ? p.method : null;
  const path = typeof p.path === 'string' ? p.path : null;
  const statusCode = typeof p.statusCode === 'number' ? p.statusCode : null;
  return { httpMethod: method, httpPath: path, httpStatus: statusCode };
}

/**
 * @param {string} email
 */
function humanizeEmailLocalPart(email) {
  const local = String(email).split('@')[0]?.trim() ?? '';
  if (!local) return '';
  const words = local.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

/**
 * @param {string} key
 */
function titleCaseRoleKey(key) {
  return String(key)
    .trim()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * @param {unknown} actorUser
 * @param {unknown} actorRoleKey
 * @param {unknown} actorType
 */
function actorLabelFrom(actorUser, actorRoleKey, actorType) {
  if (actorUser && typeof actorUser === 'object') {
    const u = /** @type {Record<string, unknown>} */ (actorUser);
    const dn = typeof u.displayName === 'string' ? u.displayName.trim() : '';
    if (dn) return dn;
    const em = typeof u.email === 'string' ? u.email.trim() : '';
    if (em) {
      const pretty = humanizeEmailLocalPart(em);
      if (pretty.length >= 2) return pretty;
      return em;
    }
  }
  if (actorType === 'system') return 'System';
  if (typeof actorRoleKey === 'string' && actorRoleKey.length) {
    return titleCaseRoleKey(actorRoleKey);
  }
  if (actorType === 'integration') return 'Integration';
  return 'User';
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ httpMethod: string | null, httpPath: string | null, httpStatus: number | null }} httpFields
 */
function buildDisplaySummary(row, httpFields) {
  const actionKey = String(row.actionKey ?? '');
  if (actionKey === 'http.write' && httpFields.httpMethod && httpFields.httpPath != null) {
    const st = httpFields.httpStatus != null ? String(httpFields.httpStatus) : '?';
    return `API write: ${httpFields.httpMethod} ${httpFields.httpPath} — ${st}`;
  }
  if (typeof row.summary === 'string' && row.summary.trim()) {
    return row.summary.trim();
  }
  return actionKey || 'Event';
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function serializeAuditLog(row) {
  if (!row) return null;

  const payload = row.payload;
  const httpFields = buildHttpWriteFields(payload);
  const actorUser = row.actorUser;
  const actorLabel = actorLabelFrom(actorUser, row.actorRoleKey, row.actorType);
  const displaySummary = buildDisplaySummary(row, httpFields);

  return {
    id: row._id ? String(row._id) : null,
    actionKey: row.actionKey ?? null,
    entityType: row.entityType ?? null,
    entityId: row.entityId ?? null,
    summary: row.summary ?? null,
    payload: row.payload ?? undefined,
    actorUserId: row.actorUserId ? String(row.actorUserId) : null,
    actorRoleKey: row.actorRoleKey ?? null,
    actorType: row.actorType ?? 'user',
    actorLabel,
    displaySummary,
    httpMethod: httpFields.httpMethod,
    httpPath: httpFields.httpPath,
    httpStatus: httpFields.httpStatus,
    correlationId: row.correlationId ?? null,
    sessionId: row.sessionId ?? null,
    ipAddress: row.ipAddress ?? null,
    userAgent: row.userAgent ?? null,
    integrityHash: row.integrityHash ?? null,
    occurredAt: row.occurredAt ? new Date(row.occurredAt).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
  };
}
