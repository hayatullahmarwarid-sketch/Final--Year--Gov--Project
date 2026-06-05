export const InspectionAssignmentStatus = Object.freeze({
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  DRAFT_SAVED: 'draft_saved',
  SUBMITTED: 'submitted',
  RETURNED_FOR_REVISION: 'returned_for_revision',
  FINALIZED: 'finalized',
});

/** @type {readonly string[]} */
export const INSPECTION_ASSIGNMENT_STATUS_KEYS = Object.freeze(
  Object.values(InspectionAssignmentStatus),
);
