/**
 * Kabul calendar year (department portal timezone is fixed to Asia/Kabul).
 * @returns {number}
 */
export function kabulCalendarYear(now = new Date()) {
  const y = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kabul', year: 'numeric' }).format(now);
  const n = Number.parseInt(String(y), 10);
  return Number.isFinite(n) ? n : now.getUTCFullYear();
}

/**
 * @param {string | undefined | null} raw
 * @returns {string}
 */
export function normalizeDeptCode(raw) {
  const u = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return u.slice(0, 10);
}

/**
 * Government reference prefix (decree / certificate / report numbering).
 * @param {string | undefined | null} raw
 * @returns {string}
 */
export function normalizeRefPrefix(raw) {
  const u = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return u.slice(0, 10);
}

/**
 * @param {string} deptCode
 * @param {number} year
 * @param {number} seq
 * @param {{ pad?: number }} [opts]
 */
export function formatDepartmentCodeReference(deptCode, year, seq, opts = {}) {
  const pad = opts.pad ?? 5;
  const c = normalizeDeptCode(deptCode);
  return `${c}-${year}-${String(seq).padStart(pad, '0')}`;
}

/**
 * @param {string} prefix
 * @param {number} year
 * @param {number} seq
 * @param {{ pad?: number }} [opts]
 */
export function formatOfficialDecreeReference(prefix, year, seq, opts = {}) {
  const pad = opts.pad ?? 5;
  const p = normalizeRefPrefix(prefix);
  return `${p}-${year}-${String(seq).padStart(pad, '0')}`;
}

/**
 * @param {string} prefix
 * @param {number} year
 * @param {number} seq
 */
export function formatCertificateReference(prefix, year, seq) {
  const p = normalizeRefPrefix(prefix);
  return `${p}-CERT-${year}-${String(seq).padStart(4, '0')}`;
}

/**
 * @param {string} prefix
 * @param {number} year
 * @param {number} seq
 */
export function formatReportReference(prefix, year, seq) {
  const p = normalizeRefPrefix(prefix);
  return `${p}-REP-${year}-${String(seq).padStart(4, '0')}`;
}
