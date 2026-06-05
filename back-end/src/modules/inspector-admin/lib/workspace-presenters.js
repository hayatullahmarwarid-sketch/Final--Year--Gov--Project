import { InspectionAssignmentStatus } from '../../shared/enums/inspection-assignment-status.js';

/**
 * Map free-text region (assignment.region) to dashboard map bucket ids.
 * @param {string | null | undefined} text
 */
export function regionKeyFromText(text) {
  const t = String(text ?? '').toLowerCase();
  if (/kabul|central|parwan|logar|wardak/.test(t)) return 'central';
  if (/kandahar|helmand|uruzgan|zabul|south/.test(t)) return 'south';
  if (/herat|ghor|farah|badghis|west/.test(t)) return 'west';
  if (/balkh|mazar|kunduz|badakhshan|takhar|baghlan|north/.test(t)) return 'north';
  if (/nangarhar|jalalabad|kunar|laghman|east/.test(t)) return 'east';
  return 'central';
}

/**
 * @param {string} createdIso
 * @param {string} dueYmd
 */
export function calendarInspectionWindowDays(createdIso, dueYmd) {
  const start = new Date(`${String(createdIso).slice(0, 10)}T12:00:00.000Z`);
  const end = new Date(`${dueYmd}T12:00:00.000Z`);
  const raw = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Math.max(1, Number.isFinite(raw) ? raw : 1);
}

/**
 * @param {Record<string, unknown>} row
 * @param {Date} now
 */
export function assignmentUiStatus(row, now) {
  const st = String(row.status ?? '');
  const due = row.dueAt ? new Date(row.dueAt) : null;
  const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const overdue =
    due &&
    due < startToday &&
    st !== InspectionAssignmentStatus.FINALIZED &&
    st !== InspectionAssignmentStatus.SUBMITTED &&
    st !== InspectionAssignmentStatus.RETURNED_FOR_REVISION;

  if (overdue) return 'overdue';
  if (st === InspectionAssignmentStatus.FINALIZED) return 'submitted';
  if (st === InspectionAssignmentStatus.SUBMITTED) return 'submitted';
  if (st === InspectionAssignmentStatus.RETURNED_FOR_REVISION) return 'in_progress';
  if (st === InspectionAssignmentStatus.ASSIGNED) return 'pending';
  return 'in_progress';
}

/** @param {string | null | undefined} p */
export function priorityToUi(p) {
  if (p === 'normal') return 'medium';
  return p ?? 'medium';
}

/**
 * @param {Record<string, unknown>} submission
 * @param {Record<string, unknown> | undefined} assignment
 */
export function submissionUiStatus(submission, assignment) {
  const st = assignment ? String(assignment.status ?? '') : '';
  if (st === InspectionAssignmentStatus.FINALIZED) return 'approved';
  if (st === InspectionAssignmentStatus.RETURNED_FOR_REVISION) return 'revision';
  if (st === InspectionAssignmentStatus.SUBMITTED) return 'pending';
  return 'pending';
}

/**
 * @param {Array<Record<string, unknown>> | undefined} answers
 */
export function answersArrayToRecord(answers) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const a of answers ?? []) {
    const key = String(a.itemKey ?? '');
    if (!key) continue;
    let v = '';
    if (a.valueText != null && String(a.valueText).length) v = String(a.valueText);
    else if (a.valueNumber != null && Number.isFinite(Number(a.valueNumber))) v = String(a.valueNumber);
    else if (a.valueBoolean != null) v = a.valueBoolean ? 'Yes' : 'No';
    else if (a.valueDate) v = new Date(a.valueDate).toISOString().slice(0, 10);
    else if (Array.isArray(a.selectedOptionKeys) && a.selectedOptionKeys.length)
      v = a.selectedOptionKeys.join(', ');
    else if (Array.isArray(a.evidenceFileIds) && a.evidenceFileIds.length)
      v = `(${a.evidenceFileIds.length} file(s) — see photos below)`;
    out[key] = v;
  }
  return out;
}
