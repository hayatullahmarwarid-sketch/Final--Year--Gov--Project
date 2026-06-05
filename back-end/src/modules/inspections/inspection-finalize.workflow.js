import { inspectionSubmissionReviewWorkflow } from './inspection-submission-review.workflow.js';

/**
 * Atomic **finalize inspection** workflow (assignment status, submission linkage, reporting snapshot).
 * Prefer {@link inspectionSubmissionReviewWorkflow} for return + finalize entry points.
 */
export class InspectionFinalizeWorkflow {
  /**
   * @param {{ assignmentId: string, submissionId: string, actorUserId?: string, score?: number | null, comment?: string | null }} input
   */
  async finalize(input) {
    return inspectionSubmissionReviewWorkflow.finalize({
      assignmentId: input.assignmentId,
      submissionId: input.submissionId,
      reviewerUserId: input.actorUserId ?? null,
      score: input.score,
      comment: input.comment ?? null,
    });
  }
}

export const inspectionFinalizeWorkflow = new InspectionFinalizeWorkflow();
