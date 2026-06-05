import { certificateIssueWorkflow } from '../../modules/certificates/certificate-issue.workflow.js';

/**
 * Renders the PDF for a newly-issued certificate and links it back to the Certificate row.
 *
 * @param {{ id?: string, name: string, data: { certificateId: string } }} job
 */
export async function certificateIssueHandler(job) {
  const certificateId = job.data?.certificateId;
  if (!certificateId) return;
  await certificateIssueWorkflow.renderAndAttachPdf(certificateId);
}
