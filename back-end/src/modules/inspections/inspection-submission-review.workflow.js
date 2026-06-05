import mongoose from 'mongoose';
import { withMongoTransaction } from '../../core/database/mongo-session.js';
import { InspectionAssignmentModel } from '../../../database/models/inspection-assignment.model.js';
import { InspectionSubmissionModel } from '../../../database/models/inspection-submission.model.js';
import { ConflictError, NotFoundError } from '../shared/http/index.js';
import { InspectionAssignmentStatus } from '../shared/enums/inspection-assignment-status.js';

/**
 * @param {Array<Record<string, unknown>> | undefined} answers
 */
function buildImplementationSignals(answers) {
  const sectionKeys = new Set();
  let evidenceFileCount = 0;
  for (const a of answers ?? []) {
    if (typeof a.sectionKey === 'string' && a.sectionKey) sectionKeys.add(a.sectionKey);
    const files = a.evidenceFileIds;
    if (Array.isArray(files)) evidenceFileCount += files.length;
  }
  return {
    answerCount: answers?.length ?? 0,
    sectionsTouchedCount: sectionKeys.size,
    evidenceFileCount,
  };
}

/**
 * @param {string | null | undefined} previous
 * @param {string} incoming
 */
function mergeReviewComments(previous, incoming) {
  const stamp = `[Return ${new Date().toISOString()}]`;
  if (!previous) return `${stamp}\n${incoming}`;
  return `${previous}\n\n${stamp}\n${incoming}`;
}

export class InspectionSubmissionReviewWorkflow {
  /**
   * @param {{
   *   assignmentId: string,
   *   submissionId: string,
   *   notes: string,
   *   reviewerUserId?: string | null,
   *   score?: number | null,
   *   extendDueAt?: Date | null,
   * }} input
   */
  async returnForRevision(input) {
    const { assignmentId, submissionId, notes, reviewerUserId, score, extendDueAt } = input;

    return withMongoTransaction(async (session) => {
      const assignment = await InspectionAssignmentModel.findById(assignmentId)
        .session(session)
        .lean();
      const submission = await InspectionSubmissionModel.findById(submissionId).session(session).lean();

      if (!assignment || assignment.isDeleted) throw new NotFoundError('Assignment not found');
      if (!submission || submission.isDeleted) throw new NotFoundError('Submission not found');

      if (String(submission.assignmentId) !== String(assignment._id)) {
        throw new ConflictError('Submission does not belong to this assignment');
      }

      if (assignment.status !== InspectionAssignmentStatus.SUBMITTED) {
        throw new ConflictError('Only submitted assignments can be returned for revision', {
          currentStatus: assignment.status,
        });
      }

      if (String(assignment.latestSubmissionId) !== String(submission._id)) {
        throw new ConflictError('Submission is not the latest submission for this assignment');
      }

      if (submission.submissionKind !== 'final') {
        throw new ConflictError('Only final submissions can enter the review workflow');
      }

      const prevComment =
        submission.review && typeof submission.review === 'object'
          ? /** @type {{ comment?: string | null }} */ (submission.review).comment
          : null;

      const nextComment = mergeReviewComments(prevComment ?? null, notes);

      const now = new Date();
      const reviewerOid = reviewerUserId ? new mongoose.Types.ObjectId(reviewerUserId) : null;

      await InspectionSubmissionModel.findByIdAndUpdate(
        submissionId,
        {
          $set: {
            review: {
              reviewerUserId: reviewerOid,
              score: score ?? (submission.review && submission.review.score) ?? null,
              comment: nextComment,
              reviewedAt: now,
            },
            reviewedByUserId: reviewerOid,
            updatedAt: now,
          },
        },
        { session, runValidators: true },
      );

      const nextRevisionCount = (assignment.revisionCount ?? 0) + 1;

      /** @type {Record<string, unknown>} */
      const assignmentSet = {
        status: InspectionAssignmentStatus.RETURNED_FOR_REVISION,
        returnReason: notes,
        revisionCount: nextRevisionCount,
        reviewedByUserId: reviewerOid,
        updatedAt: now,
      };
      if (extendDueAt !== undefined) {
        assignmentSet.dueAt = extendDueAt;
      }

      await InspectionAssignmentModel.findByIdAndUpdate(
        assignmentId,
        {
          $set: assignmentSet,
        },
        { session, runValidators: true },
      );

      const updatedAssignment = await InspectionAssignmentModel.findById(assignmentId).session(session).lean();
      const updatedSubmission = await InspectionSubmissionModel.findById(submissionId).session(session).lean();

      return { assignment: updatedAssignment, submission: updatedSubmission };
    });
  }

  /**
   * @param {{
   *   assignmentId: string,
   *   submissionId: string,
   *   reviewerUserId?: string | null,
   *   score?: number | null,
   *   comment?: string | null,
   * }} input
   */
  async finalize(input) {
    const { assignmentId, submissionId, reviewerUserId, score, comment } = input;

    return withMongoTransaction(async (session) => {
      const assignment = await InspectionAssignmentModel.findById(assignmentId)
        .session(session)
        .lean();
      const submission = await InspectionSubmissionModel.findById(submissionId).session(session).lean();

      if (!assignment || assignment.isDeleted) throw new NotFoundError('Assignment not found');
      if (!submission || submission.isDeleted) throw new NotFoundError('Submission not found');

      if (String(submission.assignmentId) !== String(assignment._id)) {
        throw new ConflictError('Submission does not belong to this assignment');
      }

      if (assignment.status !== InspectionAssignmentStatus.SUBMITTED) {
        throw new ConflictError('Only submitted assignments can be finalized', {
          currentStatus: assignment.status,
        });
      }

      if (String(assignment.latestSubmissionId) !== String(submission._id)) {
        throw new ConflictError('Submission is not the latest submission for this assignment');
      }

      if (submission.submissionKind !== 'final') {
        throw new ConflictError('Only final submissions can be finalized');
      }

      const now = new Date();
      const reviewerOid = reviewerUserId ? new mongoose.Types.ObjectId(reviewerUserId) : null;

      const implementationSignals = buildImplementationSignals(
        /** @type {Array<Record<string, unknown>>} */ (submission.answers),
      );

      const prevReview =
        submission.review && typeof submission.review === 'object'
          ? /** @type {{ comment?: string | null, score?: number | null }} */ (submission.review)
          : {};

      const mergedComment =
        comment !== undefined && comment !== null && String(comment).length > 0
          ? comment
          : prevReview.comment ?? null;

      const mergedScore = score !== undefined && score !== null ? score : prevReview.score ?? null;

      await InspectionSubmissionModel.findByIdAndUpdate(
        submissionId,
        {
          $set: {
            review: {
              reviewerUserId: reviewerOid,
              score: mergedScore,
              comment: mergedComment,
              reviewedAt: now,
            },
            reviewedByUserId: reviewerOid,
            approvedByUserId: reviewerOid,
            updatedAt: now,
          },
        },
        { session, runValidators: true },
      );

      await InspectionAssignmentModel.findByIdAndUpdate(
        assignmentId,
        {
          $set: {
            status: InspectionAssignmentStatus.FINALIZED,
            finalizedAt: now,
            reviewedByUserId: reviewerOid,
            reporting: {
              finalizedSubmissionId: new mongoose.Types.ObjectId(submissionId),
              finalizedAt: now,
              implementationSignals,
              reviewScore: mergedScore,
              reviewComment: mergedComment,
            },
            updatedAt: now,
          },
        },
        { session, runValidators: true },
      );

      const updatedAssignment = await InspectionAssignmentModel.findById(assignmentId).session(session).lean();
      const updatedSubmission = await InspectionSubmissionModel.findById(submissionId).session(session).lean();

      return { assignment: updatedAssignment, submission: updatedSubmission };
    });
  }
}

export const inspectionSubmissionReviewWorkflow = new InspectionSubmissionReviewWorkflow();
