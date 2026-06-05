import { Router } from 'express';
import { validateRequest } from '../shared/http/index.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { inspectorAdminController } from './inspector-admin.controller.js';
import {
  createAssignmentBodySchema,
  cloneBankQuestionsToExamBodySchema,
  createExamBodySchema,
  createExamQuestionBodySchema,
  createQuestionBankEntryBodySchema,
  patchQuestionBankBodySchema,
  questionBankIdParamSchema,
  createTemplateBodySchema,
  examIdParamSchema,
  examQuestionParamsSchema,
  finalizeSubmissionBodySchema,
  gradeExamAttemptBodySchema,
  idParamSchema,
  implementationReportQuerySchema,
  exportReportsCsvQuerySchema,
  inspectorPerformanceReportQuerySchema,
  trackingQuerySchema,
  zoneKeyParamSchema,
  listAssignmentsQuerySchema,
  listCertificatesQuerySchema,
  listExamAttemptsQuerySchema,
  listExamsQuerySchema,
  listQuestionBankQuerySchema,
  listInspectorsQuerySchema,
  listOperationalReportsQuerySchema,
  listSubmissionsQuerySchema,
  listTemplatesQuerySchema,
  patchAssignmentBodySchema,
  patchExamBodySchema,
  patchExamQuestionBodySchema,
  patchInspectorBodySchema,
  patchTemplateBodySchema,
  returnSubmissionBodySchema,
  revokeCertificateBodySchema,
} from './inspector-admin.validation.js';

export const inspectorAdminRouter = Router();

inspectorAdminRouter.get('/_meta', inspectorAdminController.meta);

inspectorAdminRouter.use(authenticate(), authorize(['inspector_admin']));

inspectorAdminRouter.get(
  '/templates',
  validateRequest({ query: listTemplatesQuerySchema }),
  inspectorAdminController.listTemplates,
);

inspectorAdminRouter.get('/template-catalog', inspectorAdminController.listTemplateCatalog);

inspectorAdminRouter.post(
  '/templates',
  validateRequest({ body: createTemplateBodySchema }),
  inspectorAdminController.createTemplate,
);

inspectorAdminRouter.get(
  '/templates/:id',
  validateRequest({ params: idParamSchema }),
  inspectorAdminController.getTemplateById,
);

inspectorAdminRouter.patch(
  '/templates/:id',
  validateRequest({ params: idParamSchema, body: patchTemplateBodySchema }),
  inspectorAdminController.patchTemplate,
);

inspectorAdminRouter.delete(
  '/templates/:id',
  validateRequest({ params: idParamSchema }),
  inspectorAdminController.deleteTemplate,
);

/** Aliases for mobile “forms” wording (same handlers as `/templates`). */
inspectorAdminRouter.get(
  '/forms',
  validateRequest({ query: listTemplatesQuerySchema }),
  inspectorAdminController.listTemplates,
);
inspectorAdminRouter.post(
  '/forms',
  validateRequest({ body: createTemplateBodySchema }),
  inspectorAdminController.createTemplate,
);
inspectorAdminRouter.get(
  '/forms/:id',
  validateRequest({ params: idParamSchema }),
  inspectorAdminController.getTemplateById,
);
inspectorAdminRouter.patch(
  '/forms/:id',
  validateRequest({ params: idParamSchema, body: patchTemplateBodySchema }),
  inspectorAdminController.patchTemplate,
);
inspectorAdminRouter.delete(
  '/forms/:id',
  validateRequest({ params: idParamSchema }),
  inspectorAdminController.deleteTemplate,
);

inspectorAdminRouter.get(
  '/assignments',
  validateRequest({ query: listAssignmentsQuerySchema }),
  inspectorAdminController.listAssignments,
);

inspectorAdminRouter.post(
  '/assignments',
  validateRequest({ body: createAssignmentBodySchema }),
  inspectorAdminController.createAssignment,
);

inspectorAdminRouter.get(
  '/assignments/:id',
  validateRequest({ params: idParamSchema }),
  inspectorAdminController.getAssignmentById,
);

inspectorAdminRouter.patch(
  '/assignments/:id',
  validateRequest({ params: idParamSchema, body: patchAssignmentBodySchema }),
  inspectorAdminController.patchAssignment,
);

inspectorAdminRouter.get(
  '/submissions',
  validateRequest({ query: listSubmissionsQuerySchema }),
  inspectorAdminController.listSubmissions,
);

inspectorAdminRouter.get(
  '/submissions/:id',
  validateRequest({ params: idParamSchema }),
  inspectorAdminController.getSubmissionById,
);

inspectorAdminRouter.post(
  '/submissions/:id/return',
  validateRequest({ params: idParamSchema, body: returnSubmissionBodySchema }),
  inspectorAdminController.returnSubmission,
);

inspectorAdminRouter.post(
  '/submissions/:id/finalize',
  validateRequest({ params: idParamSchema, body: finalizeSubmissionBodySchema }),
  inspectorAdminController.finalizeSubmission,
);

inspectorAdminRouter.get(
  '/question-bank',
  validateRequest({ query: listQuestionBankQuerySchema }),
  inspectorAdminController.listQuestionBank,
);

inspectorAdminRouter.post(
  '/question-bank',
  validateRequest({ body: createQuestionBankEntryBodySchema }),
  inspectorAdminController.createQuestionBankEntry,
);

inspectorAdminRouter.patch(
  '/question-bank/:id',
  validateRequest({ params: questionBankIdParamSchema, body: patchQuestionBankBodySchema }),
  inspectorAdminController.patchQuestionBankEntry,
);

inspectorAdminRouter.delete(
  '/question-bank/:id',
  validateRequest({ params: questionBankIdParamSchema }),
  inspectorAdminController.deleteQuestionBankEntry,
);

inspectorAdminRouter.get(
  '/exams',
  validateRequest({ query: listExamsQuerySchema }),
  inspectorAdminController.listExams,
);

inspectorAdminRouter.post(
  '/exams',
  validateRequest({ body: createExamBodySchema }),
  inspectorAdminController.createExam,
);

inspectorAdminRouter.get(
  '/exams/:examId/questions',
  validateRequest({ params: examIdParamSchema }),
  inspectorAdminController.listExamQuestions,
);

inspectorAdminRouter.post(
  '/exams/:examId/questions',
  validateRequest({ params: examIdParamSchema, body: createExamQuestionBodySchema }),
  inspectorAdminController.createExamQuestion,
);

inspectorAdminRouter.patch(
  '/exams/:examId/questions/:questionId',
  validateRequest({ params: examQuestionParamsSchema, body: patchExamQuestionBodySchema }),
  inspectorAdminController.patchExamQuestion,
);

inspectorAdminRouter.delete(
  '/exams/:examId/questions/:questionId',
  validateRequest({ params: examQuestionParamsSchema }),
  inspectorAdminController.deleteExamQuestion,
);

inspectorAdminRouter.post(
  '/exams/:examId/questions/clone-from-bank',
  validateRequest({ params: examIdParamSchema, body: cloneBankQuestionsToExamBodySchema }),
  inspectorAdminController.cloneBankQuestionsToExam,
);

inspectorAdminRouter.get(
  '/exams/:id',
  validateRequest({ params: idParamSchema }),
  inspectorAdminController.getExamById,
);

inspectorAdminRouter.patch(
  '/exams/:id',
  validateRequest({ params: idParamSchema, body: patchExamBodySchema }),
  inspectorAdminController.patchExam,
);

inspectorAdminRouter.get(
  '/certificates',
  validateRequest({ query: listCertificatesQuerySchema }),
  inspectorAdminController.listCertificates,
);

inspectorAdminRouter.post(
  '/certificates/:id/revoke',
  validateRequest({ params: idParamSchema, body: revokeCertificateBodySchema }),
  inspectorAdminController.revokeCertificate,
);

inspectorAdminRouter.get(
  '/exam-attempts',
  validateRequest({ query: listExamAttemptsQuerySchema }),
  inspectorAdminController.listExamAttempts,
);

inspectorAdminRouter.patch(
  '/exam-attempts/:id/grade',
  validateRequest({ params: idParamSchema, body: gradeExamAttemptBodySchema }),
  inspectorAdminController.gradeExamAttempt,
);

inspectorAdminRouter.post(
  '/exam-attempts/:id/grade',
  validateRequest({ params: idParamSchema, body: gradeExamAttemptBodySchema }),
  inspectorAdminController.gradeExamAttempt,
);

inspectorAdminRouter.get(
  '/inspectors',
  validateRequest({ query: listInspectorsQuerySchema }),
  inspectorAdminController.listInspectors,
);

inspectorAdminRouter.patch(
  '/inspectors/:id',
  validateRequest({ params: idParamSchema, body: patchInspectorBodySchema }),
  inspectorAdminController.patchInspectorUser,
);

inspectorAdminRouter.get(
  '/operational-reports',
  validateRequest({ query: listOperationalReportsQuerySchema }),
  inspectorAdminController.listOperationalReports,
);

inspectorAdminRouter.get(
  '/reports/implementation',
  validateRequest({ query: implementationReportQuerySchema }),
  inspectorAdminController.getImplementationReport,
);

inspectorAdminRouter.get(
  '/reports/inspector-performance',
  validateRequest({ query: inspectorPerformanceReportQuerySchema }),
  inspectorAdminController.getInspectorPerformanceReport,
);

inspectorAdminRouter.get(
  '/reports/export-csv',
  validateRequest({ query: exportReportsCsvQuerySchema }),
  inspectorAdminController.exportReportsCsv,
);

inspectorAdminRouter.get('/dashboard', inspectorAdminController.getDashboard);

// --- Tracking (8-zone implementation matrix) ---
inspectorAdminRouter.get(
  '/tracking/summary',
  validateRequest({ query: trackingQuerySchema }),
  inspectorAdminController.trackingSummary,
);

inspectorAdminRouter.get(
  '/tracking/zones/:zoneKey',
  validateRequest({ params: zoneKeyParamSchema, query: trackingQuerySchema }),
  inspectorAdminController.trackingZone,
);

inspectorAdminRouter.get(
  '/tracking/export-pdf',
  validateRequest({ query: trackingQuerySchema }),
  inspectorAdminController.trackingExportPdf,
);
