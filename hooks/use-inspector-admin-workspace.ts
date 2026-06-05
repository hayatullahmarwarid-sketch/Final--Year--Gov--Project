import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { getApiBaseUrl } from '@/constants/api';
import {
  addCalendarDaysFromYmd,
  type Assignment,
  type Certificate,
  type CertificateKindKey,
  type Exam,
  type ExamAttemptAnswer,
  type ExamResult,
  type Incident,
  type InspectorAdminState,
  type InspectorNotification,
  type Question,
  type Submission,
  type Template,
  type TemplateField,
} from '@/data/inspector-admin-store';
import { examAudienceKeysFromApi } from '@/lib/api/exam-audience-roles';
import { buildMcqForApi } from '@/lib/mcq-label-utils';
import { getInspectorDashboard, inspectorAdminApi } from '@/lib/api/inspector-admin';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';

const EMPTY: InspectorAdminState = {
  templates: [],
  assignments: [],
  submissions: [],
  incidents: [],
  questions: [],
  exams: [],
  certificates: [],
  examResults: [],
  inspectors: [],
  notifications: [],
};

function decodeJwtSub(token: string): string | null {
  try {
    const p = token.split('.');
    if (p.length < 2) return null;
    const seg = p[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = seg.length % 4 ? '='.repeat(4 - (seg.length % 4)) : '';
    const json = JSON.parse(atob(seg + pad)) as { sub?: string };
    return typeof json.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
}

function priorityToApi(p: Assignment['priority']): string {
  if (p === 'medium') return 'normal';
  return p;
}

function apiItemTypeToFieldType(t: string): TemplateField['type'] {
  switch (t) {
    case 'checklist':
      return 'yes_no';
    case 'photo_required':
      return 'photo';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'dropdown':
      return 'dropdown';
    case 'checkbox':
      return 'checkbox';
    case 'rating':
      return 'rating';
    case 'signature':
      return 'signature';
    case 'gps':
      return 'gps';
    case 'text':
    default:
      return 'text';
  }
}

type TemplateSelectionMeta = {
  mode: 'category' | 'decrees';
  categoryId: string;
  categoryName: string;
  decreeIds: string[];
};

type DecreeCatalogCategory = {
  id: string;
  name: string;
  decrees: { id: string; title: string; decreeVersionId: string }[];
};

const TEMPLATE_SELECTION_PREFIX = 'SelectionMeta:';

function parseTemplateDescriptionMeta(description: string): TemplateSelectionMeta | null {
  const lines = description.split('\n').map((line) => line.trim());
  const raw = lines.find((line) => line.startsWith(TEMPLATE_SELECTION_PREFIX));
  if (!raw) return null;
  const payload = raw.slice(TEMPLATE_SELECTION_PREFIX.length).trim();
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as Partial<TemplateSelectionMeta>;
    if (
      !parsed ||
      (parsed.mode !== 'category' && parsed.mode !== 'decrees') ||
      typeof parsed.categoryId !== 'string' ||
      typeof parsed.categoryName !== 'string'
    ) {
      return null;
    }
    const decreeIds = Array.isArray(parsed.decreeIds)
      ? parsed.decreeIds.map((x) => String(x)).filter(Boolean)
      : [];
    return {
      mode: parsed.mode,
      categoryId: parsed.categoryId,
      categoryName: parsed.categoryName,
      decreeIds,
    };
  } catch {
    return null;
  }
}

function buildTemplateDescription(input: {
  inspectionLocation: string;
  categoryName: string;
  mode: 'category' | 'decrees';
  categoryId: string;
  decreeIds: string[];
  includeSelectionMeta?: boolean;
}): string {
  const selection: TemplateSelectionMeta = {
    mode: input.mode,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    decreeIds: input.decreeIds,
  };
  return [
    input.inspectionLocation.trim() ? `Location: ${input.inspectionLocation.trim()}` : null,
    `Category: ${input.categoryName.trim() || 'General'}`,
    input.includeSelectionMeta === false
      ? null
      : `${TEMPLATE_SELECTION_PREFIX} ${JSON.stringify(selection)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function mapTemplateFromApi(x: Record<string, unknown>): Template {
  const sections = Array.isArray(x.sections) ? (x.sections as Record<string, unknown>[]) : [];
  const desc = typeof x.description === 'string' ? x.description : '';
  const selection = parseTemplateDescriptionMeta(desc);
  let inspectionLocation = '';
  if (typeof x.location === 'string' && x.location.trim()) {
    inspectionLocation = x.location.trim();
  } else if (desc.startsWith('Location:')) {
    const line = desc.split('\n')[0] ?? '';
    inspectionLocation = line.replace(/^Location:\s*/i, '').trim();
  }
  const first = sections[0] as { title?: string } | undefined;
  const fields: TemplateField[] = [];
  for (const s of sections) {
    const items = Array.isArray((s as { items?: unknown[] }).items)
      ? ((s as { items: Record<string, unknown>[] }).items ?? [])
      : [];
    for (const it of items) {
      const itemKey = String(it.itemKey ?? `f_${fields.length}`);
      const optLabels = Array.isArray(it.options)
        ? (it.options as { label?: string }[]).map((o) => String(o.label ?? '').trim()).filter(Boolean)
        : undefined;
      fields.push({
        id: itemKey,
        type: apiItemTypeToFieldType(String(it.type ?? 'text')),
        label: String(it.label ?? 'Field'),
        required: it.required === true,
        options: optLabels && optLabels.length ? optLabels : undefined,
      });
    }
  }
  return {
    id: String(x.id ?? ''),
    name: String(x.name ?? ''),
    category: selection?.categoryName ?? String(first?.title ?? 'General'),
    decreeSelectionMode: selection?.mode,
    selectedCategoryId: selection?.categoryId,
    selectedDecreeIds: selection?.decreeIds ?? [],
    inspectionLocation,
    status: x.isActive === false ? 'archived' : 'active',
    fields,
    createdAt: String(x.createdAt ?? '').slice(0, 10),
  };
}

function buildTemplateSectionsFromBuilderFields(category: string, fields: TemplateField[]): unknown[] {
  const sectionTitle = category.trim() || 'General';
  const items: unknown[] = fields.map((f, i) => {
    const rawKey = f.id?.trim() || `field_${i}`;
    const itemKey = rawKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    const base: Record<string, unknown> = {
      itemKey,
      label: (f.label ?? 'Field').trim().slice(0, 200) || 'Field',
      required: !!f.required,
      sortOrder: i,
    };
    switch (f.type) {
      case 'number':
        return { ...base, type: 'number' };
      case 'date':
        return { ...base, type: 'date' };
      case 'dropdown': {
        const opts = (f.options?.length ? f.options : ['Option A', 'Option B']).map((label, j) => ({
          optionKey: `o${j}`,
          label: label.slice(0, 200),
        }));
        return { ...base, type: 'dropdown', options: opts };
      }
      case 'checkbox': {
        const opts = (f.options?.length ? f.options : ['Yes', 'No']).map((label, j) => ({
          optionKey: `c${j}`,
          label: label.slice(0, 200),
        }));
        return { ...base, type: 'checkbox', options: opts };
      }
      case 'yes_no':
        return {
          ...base,
          type: 'checklist',
          options: [
            { optionKey: 'yes', label: 'Yes' },
            { optionKey: 'no', label: 'No' },
          ],
        };
      case 'rating':
        return { ...base, type: 'rating' };
      case 'signature':
        return { ...base, type: 'signature' };
      case 'photo':
        return { ...base, type: 'photo_required' };
      case 'gps':
        return { ...base, type: 'gps' };
      case 'notes':
      case 'text':
      default:
        return { ...base, type: 'text' };
    }
  });
  if (items.length === 0) {
    items.push({
      itemKey: 'compliance_confirm',
      type: 'checklist',
      label: 'Compliance confirmation',
      required: true,
      sortOrder: 0,
      options: [
        { optionKey: 'yes', label: 'Yes' },
        { optionKey: 'no', label: 'No' },
      ],
    });
  }
  return [
    {
      sectionKey: 'main',
      title: sectionTitle,
      sortOrder: 0,
      items,
    },
  ];
}

function mapBankQuestionToQuestion(q: Record<string, unknown>): Question {
  const t = String(q.type ?? '');
  const catName = String(q.decreeCategoryName ?? '').trim();
  const expl = q.explanation;
  const base = {
    id: String(q.id ?? ''),
    text: String(q.stem ?? ''),
    decree: catName || '—',
    decreeCategoryId: q.decreeCategoryId != null ? String(q.decreeCategoryId) : undefined,
    questionSource: 'bank' as const,
    explanation: typeof expl === 'string' && expl.trim() ? expl : undefined,
    difficulty: 'Medium' as const,
  };
  if (t === 'true_false') {
    return {
      ...base,
      type: 'True/False',
      correctAnswer: q.correctBoolean === true ? 'True' : 'False',
    };
  }
  if (t === 'short_text') {
    const line = String(q.correctTextNormalized ?? '').trim() || '—';
    return {
      ...base,
      type: 'MCQ',
      options: [line, '—'],
      correctAnswer: line,
    };
  }
  const opts = Array.isArray(q.options)
    ? (q.options as { label: string }[]).map((o) => String(o.label ?? ''))
    : undefined;
  let correctAnswer = '';
  let correctAnswerKeys: string[] | undefined;
  if (t === 'multiple_choice' && Array.isArray(q.correctOptionKeys) && Array.isArray(q.options)) {
    const keySet = new Set((q.correctOptionKeys as string[]).map(String));
    const labels = (q.options as { optionKey: string; label: string }[])
      .filter((o) => keySet.has(String(o.optionKey)))
      .map((o) => String(o.label ?? ''));
    correctAnswer = labels[0] ?? '';
    correctAnswerKeys = labels.length > 0 ? labels : undefined;
  } else {
    correctAnswer = String(q.correctTextNormalized ?? '');
  }
  return {
    ...base,
    type: 'MCQ',
    options: opts,
    correctAnswer,
    correctAnswerKeys,
  };
}

function mapExamFromApi(x: Record<string, unknown>, questionIds: string[]): Exam {
  const catRaw = String(x.catalogStatus ?? (String(x.status ?? '') === 'draft' ? 'draft' : 'published'));
  const status: Exam['status'] =
    catRaw === 'archived' || catRaw === 'closed' ? 'closed' : catRaw === 'draft' ? 'draft' : 'published';
  const aud = Array.isArray(x.audienceRoleKeys) ? (x.audienceRoleKeys as string[]).map(String) : [];
  const audienceRoleKeys = aud.length > 0 ? examAudienceKeysFromApi(aud) : undefined;
  const close =
    typeof x.scheduledCloseAt === 'string'
      ? x.scheduledCloseAt
      : typeof x.scheduledClosesAt === 'string'
        ? x.scheduledClosesAt
        : undefined;
  const qc = x.questionsCount;
  const questionsCount = typeof qc === 'number' && !Number.isNaN(qc) ? qc : undefined;
  return {
    id: String(x.id ?? ''),
    title: String(x.title ?? ''),
    description: typeof x.description === 'string' ? x.description : undefined,
    decree: String(x.decree ?? x.decreeCategoryName ?? ''),
    decreeCategoryId: typeof x.decreeCategoryId === 'string' ? x.decreeCategoryId : undefined,
    timeLimit: typeof x.timeLimit === 'number' ? x.timeLimit : Number(x.timeLimitMinutes) || 0,
    passCriteria: typeof x.passCriteria === 'number' ? x.passCriteria : Number(x.passingScore) || 0,
    maxScore: typeof x.maxScore === 'number' ? x.maxScore : undefined,
    status,
    audienceRoleKeys,
    scheduledOpenAt: undefined,
    scheduledCloseAt: close,
    randomizeQuestions: x.randomizeQuestions === true,
    randomizeOptions: x.randomizeOptions === true,
    questions: questionIds,
    questionsCount,
  };
}

function mapCertificateFromApi(c: Record<string, unknown>): Certificate {
  const kindRaw = String(c.kind ?? '');
  const kind: CertificateKindKey | undefined =
    kindRaw === 'exam_pass' ||
    kindRaw === 'decree_literacy' ||
    kindRaw === 'inspection_qualification' ||
    kindRaw === 'other'
      ? kindRaw
      : undefined;
  const certNumber = typeof c.certificateNumber === 'string' ? c.certificateNumber : undefined;
  const idRaw = String(c.id ?? '');
  return {
    id: idRaw,
    certificateNumber: certNumber,
    holderUserId: typeof c.holderUserId === 'string' ? c.holderUserId : undefined,
    holderEmail: typeof c.holderEmail === 'string' ? c.holderEmail : undefined,
    recipientName: String(c.recipientName ?? c.holderDisplayName ?? ''),
    category: String(c.category ?? ''),
    kind,
    issueDate: String(c.issueDate ?? ''),
    expiryDate: String(c.expiryDate ?? ''),
    status: (c.status as Certificate['status']) ?? 'active',
    score: typeof c.score === 'number' ? c.score : 0,
    revokeReason: typeof c.revokeReason === 'string' ? c.revokeReason : undefined,
    revokedAt: typeof c.revokedAt === 'string' ? c.revokedAt : undefined,
  };
}

function mapAttemptToResult(x: Record<string, unknown>): ExamResult {
  const rawStatus = String(x.status ?? '');
  const status: ExamResult['status'] =
    rawStatus === 'in_progress' || rawStatus === 'submitted' || rawStatus === 'graded'
      ? rawStatus
      : x.gradedAt
        ? 'graded'
        : x.submittedAt
          ? 'submitted'
          : 'in_progress';
  const answers: ExamAttemptAnswer[] | undefined = Array.isArray(x.answers)
    ? (x.answers as Record<string, unknown>[]).map((a) => {
        const qt: ExamAttemptAnswer['questionType'] =
          a.questionType === 'True/False'
            ? 'True/False'
            : a.questionType === 'Short Answer'
              ? 'Short Answer'
              : 'MCQ';
        return {
          questionId: String(a.questionId ?? ''),
          questionType: qt,
          questionText: String(a.questionText ?? ''),
          response: String(a.response ?? ''),
          expectedAnswer: String(a.expectedAnswer ?? ''),
          autoScore: typeof a.autoScore === 'number' ? a.autoScore : undefined,
          manualScore: typeof a.manualScore === 'number' ? a.manualScore : undefined,
          maxPoints: typeof a.maxPoints === 'number' ? a.maxPoints : 1,
          graderComment: typeof a.graderComment === 'string' ? a.graderComment : undefined,
        };
      })
    : undefined;
  return {
    id: String(x.id ?? ''),
    examId: String(x.examId ?? ''),
    examTitle: String(x.examTitle ?? ''),
    candidateName: String(x.examineeDisplayName ?? ''),
    attemptNumber: typeof x.attemptNumber === 'number' ? x.attemptNumber : undefined,
    score: typeof x.score === 'number' ? x.score : 0,
    passed: !!x.passed,
    completedAt: String(x.gradedAt ?? x.submittedAt ?? x.createdAt ?? ''),
    status,
    submittedAt: typeof x.submittedAt === 'string' ? x.submittedAt : undefined,
    gradedAt: typeof x.gradedAt === 'string' ? x.gradedAt : undefined,
    answers,
    graderComment: typeof x.graderComment === 'string' ? x.graderComment : undefined,
    certificateId: typeof x.certificateId === 'string' ? x.certificateId : undefined,
    autoGradedScore: typeof x.autoGradedScore === 'number' ? x.autoGradedScore : undefined,
    maxScore: typeof x.maxScore === 'number' ? x.maxScore : undefined,
  };
}

export type InspectorAdminDashboard = Record<string, unknown> | null;

export function useInspectorAdminWorkspace(): InspectorAdminState & {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  usesLiveApi: boolean;
  dashboard: InspectorAdminDashboard;
  decreeCatalog: DecreeCatalogCategory[];
  actions: {
    createAssignment: (input: {
      decreeId: string;
      decreeVersionId: string;
      templateId: string;
      inspectorUserId?: string;
      inspectorIds?: string[];
      deadlineYmd: string;
      priority: Assignment['priority'];
      notes: string;
    }) => Promise<{ ok: true } | { ok: false; message: string }>;
    createTemplate: (input: {
      name: string;
      category: string;
      categoryId: string;
      decreeSelectionMode: 'category' | 'decrees';
      selectedDecreeIds: string[];
      inspectionLocation: string;
      status: Template['status'];
      fields: TemplateField[];
    }) => Promise<{ ok: true } | { ok: false; message: string }>;
    updateTemplate: (
      id: string,
      input: {
        name: string;
        category: string;
        categoryId: string;
        decreeSelectionMode: 'category' | 'decrees';
        selectedDecreeIds: string[];
        inspectionLocation: string;
        status: Template['status'];
        fields: TemplateField[];
      },
    ) => Promise<{ ok: true } | { ok: false; message: string }>;
    deleteTemplate: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
    createExam: (
      input: Omit<Exam, 'id' | 'questions'>,
    ) => Promise<{ ok: true; examId: string } | { ok: false; message: string }>;
    addQuestion: (input: {
      examId: string;
      text: string;
      type: Question['type'];
      options?: string[];
      correctAnswer: string;
    }) => Promise<{ ok: true } | { ok: false; message: string }>;
    createQuestionBankEntry: (input: {
      decreeCategoryId: string;
      text: string;
      type: Question['type'];
      options?: string[];
      correctAnswer: string;
      correctAnswerKeys?: string[];
      explanation?: string;
      isActive?: boolean;
    }) => Promise<{ ok: true } | { ok: false; message: string }>;
    updateQuestionBankEntry: (
      id: string,
      input: {
        decreeCategoryId: string;
        text: string;
        type: Question['type'];
        options?: string[];
        correctAnswer: string;
        correctAnswerKeys?: string[];
        explanation?: string;
        isActive?: boolean;
      },
    ) => Promise<{ ok: true } | { ok: false; message: string }>;
    deleteQuestionBankEntry: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
    deleteQuestion: (examId: string, questionId: string) => Promise<{ ok: true } | { ok: false; message: string }>;
    returnSubmission: (input: {
      submissionId: string;
      daysAllowed: number;
      focusComment: string;
      maxDays: number;
    }) => Promise<{ ok: true } | { ok: false; message: string }>;
    finalizeSubmission: (submissionId: string) => Promise<{ ok: true } | { ok: false; message: string }>;
    revokeCertificate: (id: string, reason: string) => Promise<{ ok: true } | { ok: false; message: string }>;
    /**
     * Re-fetch the certificates list with admin filters (status / holder name / search).
     * Updates the in-memory state used by the certificates screen.
     */
    loadCertificatesPage: (filters: {
      status?: 'issued' | 'revoked';
      holderName?: string;
      holderUserId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => Promise<
      | { ok: true; items: Certificate[]; total: number }
      | { ok: false; message: string }
    >;
    patchExam: (id: string, body: unknown) => Promise<{ ok: true } | { ok: false; message: string }>;
    setInspectorActive: (id: string, active: boolean) => Promise<{ ok: true } | { ok: false; message: string }>;
  };
} {
  const [state, setState] = useState<InspectorAdminState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usesLiveApi, setUsesLiveApi] = useState(false);
  const [dashboard, setDashboard] = useState<InspectorAdminDashboard>(null);
  const [decreeCatalog, setDecreeCatalog] = useState<DecreeCatalogCategory[]>([]);

  const load = useCallback(async () => {
    const base = getApiBaseUrl();
    const token = await getJwtAccessToken();
    if (!base || !token) {
      setUsesLiveApi(false);
      setDashboard(null);
      setState(EMPTY);
      setError(!base ? 'Configure EXPO_PUBLIC_API_BASE_URL to load live data.' : 'Sign in with API access (JWT).');
      setLoading(false);
      return;
    }

    setUsesLiveApi(true);
    setLoading(true);
    setError(null);

    try {
      const [dash, tmpl, asg, sub, exm, cert, insp, rep, att, catalogRes, bankRes] = await Promise.all([
        getInspectorDashboard(),
        inspectorAdminApi.listTemplates({ limit: 100 }),
        inspectorAdminApi.listAssignments({ limit: 100 }),
        inspectorAdminApi.listSubmissions({ limit: 100, submissionKind: 'final' }),
        inspectorAdminApi.listExams({ limit: 100 }),
        inspectorAdminApi.listCertificates({ limit: 100 }),
        inspectorAdminApi.listInspectors({ limit: 100 }),
        inspectorAdminApi.listOperationalReports({ limit: 100 }),
        inspectorAdminApi.listExamAttempts({ limit: 100 }),
        inspectorAdminApi.listTemplateCatalog(),
        inspectorAdminApi.listQuestionBank({ limit: 500 }),
      ]);

      if (!dash.ok) setError(dash.message);
      else setDashboard(dash.data as Record<string, unknown>);
      if (!insp.ok) setError((prev) => prev ?? insp.message);
      if (!sub.ok) setError((prev) => prev ?? sub.message);

      const templates: Template[] =
        tmpl.ok && tmpl.items ? tmpl.items.map((x) => mapTemplateFromApi(x as Record<string, unknown>)) : [];

      const assignments: Assignment[] =
        asg.ok && asg.items
          ? (asg.items as Record<string, unknown>[]).map((a) => ({
              id: String(a.id ?? ''),
              decreeTitle: String(a.decreeTitle ?? '—'),
              templateId: String(a.templateId ?? ''),
              inspectorId: String(a.inspectorId ?? a.inspectorUserId ?? ''),
              inspectorName: String(a.inspectorName ?? '—'),
              region: String(a.region ?? ''),
              deadline: String(a.deadline ?? ''),
              createdAt: String(a.createdAt ?? ''),
              initialInspectionWindowDays:
                typeof a.initialInspectionWindowDays === 'number' ? a.initialInspectionWindowDays : 7,
              priority:
                String(a.priority ?? 'medium') === 'normal'
                  ? 'medium'
                  : ((a.priority as Assignment['priority']) ?? 'medium'),
              status: (a.status as Assignment['status']) ?? 'pending',
              notes: String(a.notes ?? ''),
            }))
          : [];

      const submissions: Submission[] =
        sub.ok && sub.items
          ? (sub.items as Record<string, unknown>[]).map((s) => ({
              id: String(s.id ?? ''),
              assignmentId: String(s.assignmentId ?? ''),
              title: String(s.title ?? ''),
              inspector: String(s.inspector ?? ''),
              region: String(s.region ?? ''),
              date: String(s.date ?? ''),
              status: (s.status as Submission['status']) ?? 'pending',
              score: typeof s.score === 'number' ? s.score : 0,
              answers: (s.answers as Record<string, string>) ?? {},
              answerDetails: Array.isArray(s.answerDetails)
                ? (s.answerDetails as Submission['answerDetails'])
                : undefined,
              categoryDecreeLabel:
                typeof s.categoryDecreeLabel === 'string' ? s.categoryDecreeLabel : undefined,
              evidence: Array.isArray(s.evidence) ? (s.evidence as string[]) : [],
              signature: typeof s.signature === 'string' ? s.signature : undefined,
              revisionFocusNotes:
                typeof s.revisionFocusNotes === 'string' ? s.revisionFocusNotes : undefined,
            }))
          : [];

      const examsRaw = exm.ok && exm.items ? (exm.items as Record<string, unknown>[]) : [];
      const questionLists = await Promise.all(
        examsRaw.slice(0, 40).map(async (ex) => {
          const id = String(ex.id ?? '');
          const qr = await inspectorAdminApi.listExamQuestions(id);
          if (!qr.ok || !qr.data) return { examId: id, items: [] as Record<string, unknown>[], title: String(ex.title ?? '') };
          const data = qr.data as { items?: Record<string, unknown>[] };
          return { examId: id, items: data.items ?? [], title: String(ex.title ?? '') };
        }),
      );
      const qByExam = new Map(questionLists.map((x) => [x.examId, x]));
      const bankRaw = bankRes.ok && bankRes.items ? (bankRes.items as Record<string, unknown>[]) : [];
      const questions: Question[] = bankRaw.map((q) => mapBankQuestionToQuestion(q));

      const exams: Exam[] = examsRaw.map((ex) => {
        const id = String(ex.id ?? '');
        const ql = qByExam.get(id);
        const qids = (ql?.items ?? []).map((q) => {
          const row = q as { id?: string; sourceBankQuestionId?: string | null };
          /** Bank clones: use source id so the exam builder matches the question-bank list. */
          if (row.sourceBankQuestionId) return String(row.sourceBankQuestionId);
          return String(row.id ?? '');
        });
        return mapExamFromApi(ex, qids);
      });

      const certificates: Certificate[] =
        cert.ok && cert.items
          ? (cert.items as Record<string, unknown>[]).map((c) => mapCertificateFromApi(c))
          : [];

      const inspectors =
        insp.ok && insp.items
          ? (insp.items as Record<string, unknown>[]).map((u) => ({
              id: String(u.id ?? ''),
              name: String(u.name ?? ''),
              regionId: String(u.regionId ?? 'central'),
              regionLabel: String(u.regionLabel ?? ''),
              mobileFieldAgent: u.mobileFieldAgent !== false,
              device: (u.device === 'tablet' ? 'tablet' : 'phone') as 'phone' | 'tablet',
              active: !!u.active,
            }))
          : [];

      const incidents: Incident[] =
        rep.ok && rep.items
          ? (rep.items as Record<string, unknown>[]).map((i) => ({
              id: String(i.id ?? ''),
              regionId: String(i.regionId ?? 'central'),
              title: String(i.title ?? ''),
              severity: (i.severity as Incident['severity']) ?? 'medium',
              status: (i.status as Incident['status']) ?? 'open',
              date: String(i.date ?? ''),
              description: String(i.description ?? ''),
            }))
          : [];

      const examResults: ExamResult[] =
        att.ok && att.items ? (att.items as Record<string, unknown>[]).map((a) => mapAttemptToResult(a)) : [];

      const notifications: InspectorNotification[] = [];
      const categoriesById = new Map<string, DecreeCatalogCategory>();
      if (catalogRes.ok && Array.isArray(catalogRes.data)) {
        for (const c of catalogRes.data as Record<string, unknown>[]) {
          const cid = String(c.id ?? '').trim();
          if (!cid) continue;
          const name = String(c.name ?? '').trim() || 'General';
          const decreesRaw = Array.isArray(c.decrees) ? (c.decrees as Record<string, unknown>[]) : [];
          const decrees = decreesRaw
            .map((d) => ({
              id: String(d.id ?? '').trim(),
              title: String(d.title ?? '').trim() || 'Untitled decree',
              decreeVersionId: String(d.decreeVersionId ?? '').trim(),
            }))
            .filter((d) => d.id && d.decreeVersionId);
          categoriesById.set(cid, { id: cid, name, decrees });
        }
      }
      const nextCatalog = [...categoriesById.values()]
        .map((c) => ({
          ...c,
          decrees: [...c.decrees].sort((a, b) => a.title.localeCompare(b.title)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setDecreeCatalog(nextCatalog);

      setState({
        templates,
        assignments,
        submissions,
        incidents,
        questions,
        exams,
        certificates,
        examResults,
        inspectors,
        notifications,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inspector admin data');
      setState(EMPTY);
      setDecreeCatalog([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const actions = useMemo(
    () => ({
      createAssignment: async (input: {
        decreeId: string;
        decreeVersionId: string;
        templateId: string;
        inspectorUserId?: string;
        inspectorIds?: string[];
        deadlineYmd: string;
        priority: Assignment['priority'];
        notes: string;
      }) => {
        const dueAt = new Date(`${input.deadlineYmd}T23:59:59.999Z`).toISOString();
        const ids =
          input.inspectorIds && input.inspectorIds.length > 0
            ? input.inspectorIds
            : input.inspectorUserId
              ? [input.inspectorUserId]
              : [];
        if (!ids.length) return { ok: false as const, message: 'Inspector is required.' };
        const body: Record<string, unknown> = {
          decreeId: input.decreeId,
          decreeVersionId: input.decreeVersionId,
          templateId: input.templateId,
          dueAt,
          priority: priorityToApi(input.priority),
          notes: input.notes?.trim() ? input.notes.trim() : null,
        };
        if (ids.length === 1) body.inspectorUserId = ids[0];
        else body.inspectorIds = ids;
        const res = await inspectorAdminApi.createAssignment(body);
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },

      createTemplate: async (input: {
        name: string;
        category: string;
        categoryId: string;
        decreeSelectionMode: 'category' | 'decrees';
        selectedDecreeIds: string[];
        inspectionLocation: string;
        status: Template['status'];
        fields: TemplateField[];
      }) => {
        const location = input.inspectionLocation.trim();
        const description = buildTemplateDescription({
          inspectionLocation: input.inspectionLocation,
          categoryName: input.category,
          mode: input.decreeSelectionMode,
          categoryId: input.categoryId,
          decreeIds: input.selectedDecreeIds,
        });
        const sections = buildTemplateSectionsFromBuilderFields(input.category, input.fields);
        let res = await inspectorAdminApi.createTemplate({
          name: input.name.trim(),
          description,
          location: location.length ? location : null,
          isActive: input.status !== 'archived',
          sections,
        });
        if (!res.ok && res.status >= 500) {
          // Fallback for strict backend validators: save core fields even when metadata line fails.
          const fallbackDescription = buildTemplateDescription({
            inspectionLocation: input.inspectionLocation,
            categoryName: input.category,
            mode: input.decreeSelectionMode,
            categoryId: input.categoryId,
            decreeIds: input.selectedDecreeIds,
            includeSelectionMeta: false,
          });
          res = await inspectorAdminApi.createTemplate({
            name: input.name.trim(),
            description: fallbackDescription,
            location: location.length ? location : null,
            isActive: input.status !== 'archived',
            sections,
          });
        }
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },

      updateTemplate: async (
        id: string,
        input: {
          name: string;
          category: string;
          categoryId: string;
          decreeSelectionMode: 'category' | 'decrees';
          selectedDecreeIds: string[];
          inspectionLocation: string;
          status: Template['status'];
          fields: TemplateField[];
        },
      ) => {
        const location = input.inspectionLocation.trim();
        const description = buildTemplateDescription({
          inspectionLocation: input.inspectionLocation,
          categoryName: input.category,
          mode: input.decreeSelectionMode,
          categoryId: input.categoryId,
          decreeIds: input.selectedDecreeIds,
        });
        const sections = buildTemplateSectionsFromBuilderFields(input.category, input.fields);
        let res = await inspectorAdminApi.patchTemplate(id, {
          name: input.name.trim(),
          description,
          location: location.length ? location : null,
          isActive: input.status !== 'archived',
          sections,
        });
        if (!res.ok && res.status >= 500) {
          const fallbackDescription = buildTemplateDescription({
            inspectionLocation: input.inspectionLocation,
            categoryName: input.category,
            mode: input.decreeSelectionMode,
            categoryId: input.categoryId,
            decreeIds: input.selectedDecreeIds,
            includeSelectionMeta: false,
          });
          res = await inspectorAdminApi.patchTemplate(id, {
            name: input.name.trim(),
            description: fallbackDescription,
            location: location.length ? location : null,
            isActive: input.status !== 'archived',
            sections,
          });
        }
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },

      deleteTemplate: async (id: string) => {
        const res = await inspectorAdminApi.deleteTemplate(id);
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },

      createExam: async (input: Omit<Exam, 'id' | 'questions'>) => {
        const body: Record<string, unknown> = {
          title: input.title,
          passingScore: input.passCriteria,
          timeLimitMinutes: input.timeLimit,
        };
        if (input.description) body.description = input.description;
        if (typeof input.maxScore === 'number') body.maxScore = input.maxScore;
        /** Public availability starts on publish; optional end date only. */
        body.scheduledOpensAt = null;
        if (input.scheduledCloseAt) body.scheduledClosesAt = input.scheduledCloseAt;
        if (typeof input.randomizeQuestions === 'boolean')
          body.randomizeQuestions = input.randomizeQuestions;
        if (typeof input.randomizeOptions === 'boolean') body.randomizeOptions = input.randomizeOptions;
        if (input.status) {
          body.catalogStatus =
            input.status === 'closed' ? 'archived' : input.status === 'published' ? 'published' : 'draft';
        }
        if (input.decreeCategoryId) body.decreeCategoryId = input.decreeCategoryId;
        const res = await inspectorAdminApi.createExam(body);
        if (!res.ok) return { ok: false as const, message: res.message };
        const data = res.data as { id?: string } | null | undefined;
        const examId = data && typeof data.id === 'string' ? data.id : '';
        if (!examId) return { ok: false as const, message: 'Invalid create exam response.' };
        await load();
        return { ok: true as const, examId };
      },

      createQuestionBankEntry: async (input: {
        decreeCategoryId: string;
        text: string;
        type: Question['type'];
        options?: string[];
        correctAnswer: string;
        correctAnswerKeys?: string[];
        explanation?: string;
        isActive?: boolean;
      }) => {
        let type = 'multiple_choice';
        let options: { optionKey: string; label: string }[] | undefined;
        let correctOptionKeys: string[] | undefined;
        let correctBoolean: boolean | null | undefined;
        if (input.type === 'True/False') {
          type = 'true_false';
          correctBoolean = /^t/i.test(input.correctAnswer.trim());
        } else {
          const m = buildMcqForApi(input.options ?? [], input.correctAnswer, input.correctAnswerKeys);
          if (!m.ok) return { ok: false as const, message: m.error };
          options = m.options;
          correctOptionKeys = m.correctOptionKeys;
        }
        const res = await inspectorAdminApi.createQuestionBankEntry({
          decreeCategoryId: input.decreeCategoryId,
          type,
          stem: input.text,
          explanation: input.explanation || null,
          options,
          correctOptionKeys,
          correctBoolean,
          correctTextNormalized: null,
          points: 1,
          isActive: input.isActive !== false,
        });
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },

      updateQuestionBankEntry: async (
        id: string,
        input: {
          decreeCategoryId: string;
          text: string;
          type: Question['type'];
          options?: string[];
          correctAnswer: string;
          correctAnswerKeys?: string[];
          explanation?: string;
          isActive?: boolean;
        },
      ) => {
        let type = 'multiple_choice';
        let options: { optionKey: string; label: string }[] | undefined;
        let correctOptionKeys: string[] | undefined;
        let correctBoolean: boolean | null | undefined;
        if (input.type === 'True/False') {
          type = 'true_false';
          correctBoolean = /^t/i.test(input.correctAnswer.trim());
        } else {
          const m = buildMcqForApi(input.options ?? [], input.correctAnswer, input.correctAnswerKeys);
          if (!m.ok) return { ok: false as const, message: m.error };
          options = m.options;
          correctOptionKeys = m.correctOptionKeys;
        }
        const res = await inspectorAdminApi.patchQuestionBankEntry(id, {
          decreeCategoryId: input.decreeCategoryId,
          type,
          stem: input.text,
          explanation: input.explanation || null,
          options,
          correctOptionKeys,
          correctBoolean,
          correctTextNormalized: null,
          points: 1,
          isActive: input.isActive !== false,
        });
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },

      deleteQuestionBankEntry: async (id: string) => {
        const res = await inspectorAdminApi.deleteQuestionBankEntry(id);
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },

      addQuestion: async (input: {
        examId: string;
        text: string;
        type: Question['type'];
        options?: string[];
        correctAnswer: string;
      }) => {
        let type = 'multiple_choice';
        let options: { optionKey: string; label: string }[] | undefined;
        let correctOptionKeys: string[] | undefined;
        let correctBoolean: boolean | null | undefined;
        if (input.type === 'True/False') {
          type = 'true_false';
          correctBoolean = /^t/i.test(input.correctAnswer.trim());
        } else {
          const m = buildMcqForApi(input.options ?? [], input.correctAnswer, undefined);
          if (!m.ok) return { ok: false as const, message: m.error };
          options = m.options;
          correctOptionKeys = m.correctOptionKeys;
        }
        const res = await inspectorAdminApi.createExamQuestion(input.examId, {
          type,
          stem: input.text,
          options,
          correctOptionKeys,
          correctBoolean,
          correctTextNormalized: null,
        });
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },

      deleteQuestion: async (examId: string, questionId: string) => {
        const res = await inspectorAdminApi.deleteExamQuestion(examId, questionId);
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },

      returnSubmission: async (input: {
        submissionId: string;
        daysAllowed: number;
        focusComment: string;
        maxDays: number;
      }) => {
        const token = (await getJwtAccessToken()) ?? '';
        const reviewer = decodeJwtSub(token);
        const days = Math.min(input.maxDays, Math.max(1, Math.floor(input.daysAllowed)));
        const todayYmd = new Date().toISOString().slice(0, 10);
        const newDay = addCalendarDaysFromYmd(todayYmd, days);
        const extendDueAt = new Date(`${newDay}T23:59:59.999Z`).toISOString();
        const res = await inspectorAdminApi.returnSubmission(input.submissionId, {
          notes: input.focusComment.trim(),
          reviewerUserId: reviewer,
          extendDueAt,
        });
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },

      finalizeSubmission: async (submissionId: string) => {
        const token = (await getJwtAccessToken()) ?? '';
        const reviewer = decodeJwtSub(token);
        const res = await inspectorAdminApi.finalizeSubmission(submissionId, { reviewerUserId: reviewer });
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },

      revokeCertificate: async (id: string, reason: string) => {
        const token = (await getJwtAccessToken()) ?? '';
        const reviewer = decodeJwtSub(token);
        const trimmed = reason.trim();
        if (!trimmed) {
          return { ok: false as const, message: 'A revocation reason is required.' };
        }
        const res = await inspectorAdminApi.revokeCertificate(id, {
          reason: trimmed,
          revokedByUserId: reviewer,
        });
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },

      loadCertificatesPage: async (filters: {
        status?: 'issued' | 'revoked';
        holderName?: string;
        holderUserId?: string;
        search?: string;
        page?: number;
        limit?: number;
      }) => {
        const res = await inspectorAdminApi.listCertificates({
          page: filters.page ?? 1,
          limit: filters.limit ?? 100,
          search: filters.search,
          status: filters.status,
          holderUserId: filters.holderUserId,
          holderName: filters.holderName,
        });
        if (!res.ok) return { ok: false as const, message: res.message };
        const items = (res.items as Record<string, unknown>[]).map((c) => mapCertificateFromApi(c));
        setState((prev) => ({ ...prev, certificates: items }));
        return { ok: true as const, items, total: res.meta.total };
      },

      patchExam: async (id: string, body: unknown) => {
        const res = await inspectorAdminApi.patchExam(id, body);
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },

      setInspectorActive: async (id: string, active: boolean) => {
        const res = await inspectorAdminApi.patchInspector(id, { status: active ? 'active' : 'suspended' });
        if (!res.ok) return { ok: false as const, message: res.message };
        await load();
        return { ok: true as const };
      },
    }),
    [load],
  );

  return {
    ...state,
    loading,
    error,
    refresh: load,
    usesLiveApi,
    dashboard,
    decreeCatalog,
    actions,
  };
}
