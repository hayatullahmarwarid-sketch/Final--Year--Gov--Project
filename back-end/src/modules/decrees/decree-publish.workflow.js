import { decreeUploadService } from '../decree-upload/decree-upload.service.js';

/**
 * Atomic **publish decree version** workflow (pointer updates + version immutability flags).
 * Delegates to the decree-upload module (single source of truth for publication rules).
 */
export class DecreePublishWorkflow {
  /**
   * @param {{ decreeId: string, versionId: string, actorUserId?: string }} input
   */
  async publishVersion(input) {
    await decreeUploadService.publishDecree(
      input.decreeId,
      { versionId: input.versionId },
      input.actorUserId,
    );
    return { ok: true };
  }
}

export const decreePublishWorkflow = new DecreePublishWorkflow();
