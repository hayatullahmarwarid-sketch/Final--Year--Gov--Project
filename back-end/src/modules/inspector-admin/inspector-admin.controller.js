import { asyncHandler, HttpStatus, sendPaginatedList, sendSuccess } from '../shared/http/index.js';
import { inspectorAdminService } from './inspector-admin.service.js';
import { inspectorAdminReportsService } from './inspector-admin-reports.service.js';
import { inspectorAdminTrackingService } from './inspector-admin-tracking.service.js';

export class InspectorAdminController {
  /**
   * @param {import('./inspector-admin.service.js').InspectorAdminService} [service]
   */
  constructor(service = inspectorAdminService) {
    this.service = service;
  }

  meta = asyncHandler(async (_req, res) => {
    return sendSuccess(res, this.service.getModuleMeta());
  });

  listTemplates = asyncHandler(async (req, res) => {
    const query = req.validated.query;
    const result = await this.service.listTemplates(query);
    return sendPaginatedList(res, result);
  });

  listTemplateCatalog = asyncHandler(async (_req, res) => {
    const result = await this.service.listTemplateCatalog();
    return sendSuccess(res, result);
  });

  createTemplate = asyncHandler(async (req, res) => {
    const created = await this.service.createTemplate(req.validated.body);
    return sendSuccess(res, created, { statusCode: HttpStatus.CREATED, message: 'Template created' });
  });

  getTemplateById = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const row = await this.service.getTemplateById(id);
    return sendSuccess(res, row);
  });

  patchTemplate = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const updated = await this.service.patchTemplate(id, req.validated.body);
    return sendSuccess(res, updated, { message: 'Template updated' });
  });

  deleteTemplate = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const result = await this.service.deleteTemplate(id);
    return sendSuccess(res, result, { message: 'Template deleted' });
  });

  listAssignments = asyncHandler(async (req, res) => {
    const query = req.validated.query;
    const result = await this.service.listAssignments(query);
    return sendPaginatedList(res, result);
  });

  createAssignment = asyncHandler(async (req, res) => {
    const body = { ...req.validated.body };
    if (req.user?.id && body.assignedByUserId === undefined) {
      body.assignedByUserId = req.user.id;
    }
    const created = await this.service.createAssignment(body);
    return sendSuccess(res, created, { statusCode: HttpStatus.CREATED, message: 'Assignment created' });
  });

  getAssignmentById = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const row = await this.service.getAssignmentById(id);
    return sendSuccess(res, row);
  });

  patchAssignment = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const updated = await this.service.patchAssignment(id, req.validated.body);
    return sendSuccess(res, updated, { message: 'Assignment updated' });
  });

  listSubmissions = asyncHandler(async (req, res) => {
    const query = req.validated.query;
    const result = await this.service.listSubmissions(query);
    return sendPaginatedList(res, result);
  });

  getSubmissionById = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const row = await this.service.getSubmissionById(id);
    return sendSuccess(res, row);
  });

  returnSubmission = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const result = await this.service.returnSubmission(id, req.validated.body);
    return sendSuccess(res, result, { message: 'Submission returned for revision' });
  });

  finalizeSubmission = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const result = await this.service.finalizeSubmission(id, req.validated.body);
    return sendSuccess(res, result, { message: 'Submission finalized' });
  });

  listExams = asyncHandler(async (req, res) => {
    const query = req.validated.query;
    const result = await this.service.listExams(query);
    return sendPaginatedList(res, result);
  });

  listQuestionBank = asyncHandler(async (req, res) => {
    const result = await this.service.listQuestionBank(req.validated.query);
    return sendPaginatedList(res, result);
  });

  createQuestionBankEntry = asyncHandler(async (req, res) => {
    const row = await this.service.createQuestionBankEntry(req.validated.body, req.user?.id ?? null);
    return sendSuccess(res, row, { statusCode: HttpStatus.CREATED, message: 'Question saved' });
  });

  patchQuestionBankEntry = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const row = await this.service.updateQuestionBankEntry(id, req.validated.body, req.user?.id ?? null);
    return sendSuccess(res, row, { message: 'Question updated' });
  });

  deleteQuestionBankEntry = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const result = await this.service.deleteQuestionBankEntry(id);
    return sendSuccess(res, result, { message: 'Question removed from bank and linked exams' });
  });

  createExam = asyncHandler(async (req, res) => {
    const created = await this.service.createExam(req.validated.body);
    return sendSuccess(res, created, { statusCode: HttpStatus.CREATED, message: 'Exam created' });
  });

  getExamById = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const row = await this.service.getExamById(id);
    return sendSuccess(res, row);
  });

  patchExam = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const updated = await this.service.patchExam(id, req.validated.body);
    return sendSuccess(res, updated, { message: 'Exam updated' });
  });

  listCertificates = asyncHandler(async (req, res) => {
    const query = req.validated.query;
    const result = await this.service.listCertificates(query);
    return sendPaginatedList(res, result);
  });

  revokeCertificate = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const updated = await this.service.revokeCertificate(id, req.validated.body);
    return sendSuccess(res, updated, { message: 'Certificate revoked' });
  });

  getDashboard = asyncHandler(async (_req, res) => {
    const dashboard = await this.service.getDashboard();
    return sendSuccess(res, dashboard);
  });

  listExamQuestions = asyncHandler(async (req, res) => {
    const { examId } = req.validated.params;
    const data = await this.service.listExamQuestions(examId);
    return sendSuccess(res, data);
  });

  createExamQuestion = asyncHandler(async (req, res) => {
    const { examId } = req.validated.params;
    const created = await this.service.createExamQuestion(examId, req.validated.body);
    return sendSuccess(res, created, { statusCode: HttpStatus.CREATED, message: 'Question created' });
  });

  patchExamQuestion = asyncHandler(async (req, res) => {
    const { examId, questionId } = req.validated.params;
    const updated = await this.service.patchExamQuestion(examId, questionId, req.validated.body);
    return sendSuccess(res, updated, { message: 'Question updated' });
  });

  deleteExamQuestion = asyncHandler(async (req, res) => {
    const { examId, questionId } = req.validated.params;
    const result = await this.service.deleteExamQuestion(examId, questionId);
    return sendSuccess(res, result, { message: 'Question deleted' });
  });

  cloneBankQuestionsToExam = asyncHandler(async (req, res) => {
    const { examId } = req.validated.params;
    const data = await this.service.cloneBankQuestionsToExam(examId, req.validated.body);
    return sendSuccess(res, data, { statusCode: HttpStatus.CREATED, message: 'Questions attached' });
  });

  listExamAttempts = asyncHandler(async (req, res) => {
    const query = req.validated.query;
    const result = await this.service.listExamAttempts(query);
    return sendPaginatedList(res, result);
  });

  gradeExamAttempt = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const updated = await this.service.gradeExamAttempt(id, req.validated.body, req.user?.id);
    return sendSuccess(res, updated, { message: 'Attempt graded' });
  });

  listInspectors = asyncHandler(async (req, res) => {
    const query = req.validated.query;
    const result = await this.service.listInspectors(query);
    return sendPaginatedList(res, result);
  });

  patchInspectorUser = asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const updated = await this.service.patchInspectorUser(id, req.validated.body);
    return sendSuccess(res, updated, { message: 'Inspector updated' });
  });

  listOperationalReports = asyncHandler(async (req, res) => {
    const query = req.validated.query;
    const result = await this.service.listOperationalReports(query);
    return sendPaginatedList(res, result);
  });

  getImplementationReport = asyncHandler(async (req, res) => {
    const data = await inspectorAdminReportsService.getImplementationReport(req.validated.query);
    return sendSuccess(res, data);
  });

  getInspectorPerformanceReport = asyncHandler(async (req, res) => {
    const data = await inspectorAdminReportsService.getInspectorPerformanceReport(req.validated.query);
    return sendSuccess(res, data);
  });

  exportReportsCsv = asyncHandler(async (req, res) => {
    const { csv, filename } = await inspectorAdminReportsService.exportCsv(req.validated.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(HttpStatus.OK).send(csv);
  });

  trackingSummary = asyncHandler(async (req, res) => {
    const data = await inspectorAdminTrackingService.getNationalTrackingSummary(req.validated.query);
    return sendSuccess(res, data);
  });

  trackingZone = asyncHandler(async (req, res) => {
    const { zoneKey } = req.validated.params;
    const data = await inspectorAdminTrackingService.getZoneTracking(zoneKey, req.validated.query);
    return sendSuccess(res, data ?? null);
  });

  trackingExportPdf = asyncHandler(async (req, res) => {
    const { pdf, filename } = await inspectorAdminTrackingService.buildNationalImplementationMatrixPdf(req.validated.query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(HttpStatus.OK).send(pdf);
  });
}

export const inspectorAdminController = new InspectorAdminController();
