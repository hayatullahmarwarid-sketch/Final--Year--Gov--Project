import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { CATEGORIES } from '@/data/public-decrees-catalog';
import { formatHeaderDate } from '@/data/system-admin-store';

export { formatHeaderDate };

/** Bump when persisted inspector-admin cache shape changes (forces clients to rehydrate from API). */
const STORAGE_KEY = '@sharia_inspector_admin_v2';

export type InspectorTab =
  | "dashboard"
  | "templates"
  | "assignments"
  | "submissions"
  | "implementation"
  | "exams"
  | "questions"
  | "results"
  | "certificates"
  | "reports"
  | "settings";

export interface TemplateField {
  id: string;
  type: "text" | "number" | "date" | "dropdown" | "checkbox" | "yes_no" | "rating" | "signature" | "photo" | "gps" | "notes";
  label: string;
  required: boolean;
  options?: string[];
}

export interface Template {
  id: string;
  name: string;
  category: string;
  /**
   * Decree targeting mode for this template.
   * - `category`: whole category
   * - `decrees`: one or more specific decrees under a category
   */
  decreeSelectionMode?: "category" | "decrees";
  /** Selected category id (preferred) or fallback category name. */
  selectedCategoryId?: string;
  /** Selected decree ids when `decreeSelectionMode` is `decrees`. */
  selectedDecreeIds?: string[];
  /** Physical / operational site for inspections using this template (e.g. "Kabul - District 4"). Copied to assignment `region` for the inspector. */
  inspectionLocation: string;
  status: "active" | "draft" | "archived";
  fields: TemplateField[];
  createdAt: string;
}

export interface Assignment {
  id: string;
  decreeTitle: string;
  templateId: string;
  inspectorId: string;
  inspectorName: string;
  region: string;
  deadline: string;
  createdAt: string;
  /**
   * Calendar days from first assignment date to the original deadline (minimum 1).
   * When returning a submission for revision, the inspector may be given 1..this many days from today.
   */
  initialInspectionWindowDays: number;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "submitted" | "overdue";
  notes: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  title: string;
  inspector: string;
  region: string;
  date: string;
  status: "pending" | "approved" | "revision";
  score: number;
  answers: Record<string, string>;
  answerDetails?: Array<{
    itemKey: string;
    label: string;
    type: string;
    valueText?: string | null;
    valueNumber?: number | null;
    valueBoolean?: boolean | null;
    valueDate?: string | null;
    selectedOptionKeys?: string[];
    evidenceFileIds?: string[];
  }>;
  categoryDecreeLabel?: string;
  evidence: string[];
  signature?: string;
  /** Latest admin instructions when status is `revision` (what to fix for acceptance). */
  revisionFocusNotes?: string;
}

export interface Incident {
  id: string;
  regionId: string;
  title: string;
  severity: "low" | "medium" | "high";
  status: "open" | "investigating" | "resolved";
  date: string;
  description: string;
}

export interface Question {
  id: string;
  /** Question stem shown to the candidate. */
  text: string;
  type: "MCQ" | "True/False";
  decree: string;
  /** Real decree category id (API / DUD taxonomy) when available. */
  decreeCategoryId?: string;
  /** `bank` = shared question bank; `exam` = legacy / per-exam copy. */
  questionSource?: "bank" | "exam";
  /** When loaded from API, the owning exam id (used for deletes / edits). */
  examId?: string;
  options?: string[];
  /**
   * Primary correct answer. For MCQ this is one of the option labels (the first
   * accepted answer); for True/False it is `"True"` / `"False"`.
   */
  correctAnswer: string;
  /**
   * Optional list of acceptable answer keys (e.g. multiple correct MCQ option
   * labels). When omitted the auto-grader falls back to `correctAnswer`.
   */
  correctAnswerKeys?: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  /** Plain-text rationale shown after submission (post-attempt review). */
  explanation?: string;
  /** Numeric weight; defaults to 1 when not set. */
  points?: number;
  /** Sort order within an exam. Lower numbers appear first. */
  ordering?: number;
  /** Hide from new attempts when explicitly set to `false`. Defaults to `true`. */
  active?: boolean;
}

export type ExamAudienceRole =
  | "inspector"
  | "inspector-admin"
  | "dept-upload"
  | "system-admin"
  | "public";

export interface Exam {
  id: string;
  /** Real decree category id when using API-backed exams. */
  decreeCategoryId?: string;
  title: string;
  /** Long-form description rendered above the question list at attempt start. */
  description?: string;
  decree: string;
  timeLimit: number;
  /** Pass percentage (0-100). */
  passCriteria: number;
  /** Maximum score expressed in points (defaults to summed question points). */
  maxScore?: number;
  /** Lifecycle: `draft` (admin-only), `published` (visible to audience), `closed` (no new attempts). */
  status: "published" | "draft" | "closed";
  /** Audience role keys allowed to take the exam. */
  audienceRoleKeys?: ExamAudienceRole[];
  /** ISO datetime — exam becomes available to candidates. */
  scheduledOpenAt?: string;
  /** ISO datetime — exam closes to new attempts. */
  scheduledCloseAt?: string;
  /** Shuffle question order at attempt start. */
  randomizeQuestions?: boolean;
  /** Shuffle MCQ option order at attempt start. */
  randomizeOptions?: boolean;
  questions: string[];
  /** Server `questionsCount` when using live API (keeps list accurate vs `questions.length`). */
  questionsCount?: number;
}

export interface ExamAttemptAnswer {
  questionId: string;
  /** Includes legacy "Short Answer" for older attempt snapshots only. */
  questionType: Question["type"] | "Short Answer";
  /** Stem snapshot (so grading still works after questions are edited). */
  questionText: string;
  /** Candidate response: option label, "True"/"False", or free text. */
  response: string;
  /** Expected answer captured at submit time. */
  expectedAnswer: string;
  /** Auto-graded points for objective questions (0..maxPoints). */
  autoScore?: number;
  /** Manual grader-assigned points when `questionType` is legacy Short Answer (0..maxPoints). */
  manualScore?: number;
  /** Maximum points awardable for this question. */
  maxPoints: number;
  /** Optional grader comment per Short-Answer question. */
  graderComment?: string;
}

export type CertificateKindKey =
  | "exam_pass"
  | "decree_literacy"
  | "inspection_qualification"
  | "other";

export interface Certificate {
  id: string;
  /** Backend-allocated certificate number (`SH-YYYY-000123`). */
  certificateNumber?: string;
  recipientName: string;
  /** Holder email shown in admin filters / detail. */
  holderEmail?: string;
  /** Backend ObjectId of the holder user. */
  holderUserId?: string;
  /** Server-issued kind enum (drives the kind filter). */
  kind?: CertificateKindKey;
  /** Exam / learning track category (e.g. Economy, Family), not a single decree title. */
  category: string;
  issueDate: string;
  expiryDate: string;
  status: "active" | "revoked";
  score: number;
  /** Reason supplied at revoke time (admin) — required by the backend. */
  revokeReason?: string;
  /** ISO timestamp when the certificate was revoked. */
  revokedAt?: string;
}

export interface FieldInspector {
  id: string;
  name: string;
  regionId: string;
  regionLabel: string;
  /** Uses the inspector mobile app in the field (phone or tablet). */
  mobileFieldAgent: boolean;
  device: "phone" | "tablet";
  /** When false, the inspector cannot receive new assignments from this admin workspace. */
  active: boolean;
}

export interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  candidateName: string;
  /** 1–3 — which attempt this row is for the user on this exam. */
  attemptNumber?: number;
  /** Final percentage 0..100. While `status` is `submitted` this is the auto portion only. */
  score: number;
  passed: boolean;
  /**
   * When the attempt reached its terminal (or last known) state. Backwards-compatible
   * mirror of `gradedAt` when available, falling back to `submittedAt`.
   */
  completedAt: string;
  /** Lifecycle of the attempt. */
  status?: "in_progress" | "submitted" | "graded";
  /** When the candidate hit Submit. */
  submittedAt?: string;
  /** When the grader finalized the attempt. */
  gradedAt?: string;
  /** Per-question grading rows (only present once the attempt is submitted). */
  answers?: ExamAttemptAnswer[];
  /** Overall grader comment shown to the candidate. */
  graderComment?: string;
  /** Certificate id when finalize-pass triggered an issue. */
  certificateId?: string;
  /** Sum of objective auto-score (in points). */
  autoGradedScore?: number;
  /** Sum of question max points used to compute the percentage. */
  maxScore?: number;
}

export interface InspectorNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface InspectorAdminState {
  templates: Template[];
  assignments: Assignment[];
  submissions: Submission[];
  incidents: Incident[];
  questions: Question[];
  exams: Exam[];
  certificates: Certificate[];
  examResults: ExamResult[];
  inspectors: FieldInspector[];
  notifications: InspectorNotification[];
}

export interface DecreeOption {
  value: string;
  label: string;
  category: string;
}

export function decreeCatalogOptions(): DecreeOption[] {
  const out: DecreeOption[] = [];
  for (const c of CATEGORIES) {
    for (const d of c.decrees) {
      const label = `${c.name}: ${d.title}`;
      out.push({ value: label, label, category: c.name });
    }
  }
  return out;
}

/** Whole calendar days between start and end (YYYY-MM-DD). At least 1. */
export function calendarInspectionWindowDays(startYmd: string, endYmd: string): number {
  const start = new Date(`${startYmd}T12:00:00`);
  const end = new Date(`${endYmd}T12:00:00`);
  const raw = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Math.max(1, raw);
}

export function addCalendarDaysFromYmd(fromYmd: string, wholeDays: number): string {
  const d = new Date(`${fromYmd}T12:00:00`);
  d.setDate(d.getDate() + wholeDays);
  return d.toISOString().slice(0, 10);
}

export function inspectionWindowDaysForAssignment(
  a: Pick<Assignment, "initialInspectionWindowDays" | "createdAt" | "deadline">,
): number {
  const stored = a.initialInspectionWindowDays;
  if (typeof stored === "number" && stored > 0 && Number.isFinite(stored)) {
    return Math.floor(stored);
  }
  const start = String(a.createdAt).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(a.deadline)) {
    return 1;
  }
  return calendarInspectionWindowDays(start, a.deadline);
}

/**
 * Seed state for the inspector-admin store — every list starts empty. Real rows are hydrated
 * by `hooks/use-inspector-admin-workspace.ts` via the API (`/api/v1/inspector-admin/*`).
 *
 * Screens read these arrays initially and re-render when the API finishes.
 */
function seedState(): InspectorAdminState {
  return {
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
}

// Workspace lists hydrate from `/api/v1/inspector-admin/*` via `hooks/use-inspector-admin-workspace.ts`.

function migrateCertificateRow(c: unknown): Certificate {
  const x = c as Record<string, unknown> & { decreeTitle?: string; category?: string };
  return {
    id: String(x.id ?? ""),
    recipientName: String(x.recipientName ?? ""),
    category:
      (typeof x.category === "string" && x.category) ||
      (typeof x.decreeTitle === "string" && x.decreeTitle) ||
      "Economy",
    issueDate: String(x.issueDate ?? ""),
    expiryDate: String(x.expiryDate ?? ""),
    status: (x.status as Certificate["status"]) === "revoked" ? "revoked" : "active",
    score: typeof x.score === "number" ? x.score : Number(x.score) || 0,
  };
}

function migrateFieldInspector(i: unknown): FieldInspector {
  const x = i as Partial<FieldInspector> & Record<string, unknown>;
  return {
    id: String(x.id ?? ""),
    name: String(x.name ?? ""),
    regionId: String(x.regionId ?? "central"),
    regionLabel: String(x.regionLabel ?? ""),
    mobileFieldAgent: x.mobileFieldAgent !== false,
    device: x.device === "tablet" ? "tablet" : "phone",
    active: x.active !== false,
  };
}

function migrateTemplateRow(t: unknown): Template {
  const x = t as Template;
  return { ...x, inspectionLocation: x.inspectionLocation ?? "" };
}

function normalizeLoaded(s: InspectorAdminState): InspectorAdminState {
  const inspectorsSrc = s.inspectors?.length ? s.inspectors : seedState().inspectors;
  const inspectors = inspectorsSrc.map((row) => migrateFieldInspector(row));
  const assignments = (s.assignments ?? []).map((a) => {
    const createdAt = a.createdAt ?? new Date().toISOString();
    const initial =
      typeof a.initialInspectionWindowDays === "number" && a.initialInspectionWindowDays > 0
        ? Math.floor(a.initialInspectionWindowDays)
        : calendarInspectionWindowDays(createdAt.slice(0, 10), a.deadline);
    return {
      ...a,
      inspectorId: a.inspectorId ?? inspectors[0]?.id ?? "insp-1",
      createdAt,
      initialInspectionWindowDays: initial,
    };
  });
  const certificates = Array.isArray(s.certificates)
    ? s.certificates.map((c) => migrateCertificateRow(c))
    : seedState().certificates;
  const templates = (s.templates?.length ? s.templates : seedState().templates).map((t) => migrateTemplateRow(t));
  return {
    ...s,
    inspectors,
    assignments,
    certificates,
    templates,
    examResults: s.examResults ?? [],
    notifications: s.notifications ?? [],
  };
}

let state: InspectorAdminState = seedState();
const listeners = new Set<() => void>();
let hydrateStarted = false;

function notifyListeners() {
  listeners.forEach((l) => l());
}

async function hydrateFromDisk() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<InspectorAdminState>;
      if (p && Array.isArray(p.templates) && Array.isArray(p.assignments)) {
        state = normalizeLoaded(p as InspectorAdminState);
        return;
      }
    }
    const s = seedState();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s)).catch(() => {});
    state = s;
  } catch {
    state = seedState();
  } finally {
    notifyListeners();
  }
}

function persist(next: InspectorAdminState) {
  state = next;
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  notifyListeners();
}

export function subscribeInspectorAdmin(listener: () => void) {
  if (!hydrateStarted) {
    hydrateStarted = true;
    void hydrateFromDisk();
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInspectorAdminState(): InspectorAdminState {
  return state;
}

export function useInspectorAdminStore(): InspectorAdminState {
  return useSyncExternalStore(subscribeInspectorAdmin, getInspectorAdminState, getInspectorAdminState);
}

function appendNotification(title: string, body: string) {
  const n: InspectorNotification = {
    id: `in-${Date.now()}`,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
  };
  return [n, ...state.notifications].slice(0, 50);
}

function inspectorById(id: string): FieldInspector | undefined {
  return state.inspectors.find((i) => i.id === id);
}

export const inspectorAdminActions = {
  addAssignment(
    input: Omit<Assignment, "id" | "createdAt" | "region" | "inspectorName" | "initialInspectionWindowDays"> & {
      inspectorId: string;
    },
  ): boolean {
    const insp = inspectorById(input.inspectorId);
    if (!insp || insp.active === false) return false;
    const tmpl = state.templates.find((t) => t.id === input.templateId);
    const fromTemplate = tmpl?.inspectionLocation?.trim();
    const id = `as-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    const row: Assignment = {
      ...input,
      id,
      inspectorName: insp.name,
      region: fromTemplate && fromTemplate.length > 0 ? fromTemplate : insp.regionLabel,
      createdAt,
      initialInspectionWindowDays: calendarInspectionWindowDays(createdAt.slice(0, 10), input.deadline),
    };
    persist({
      ...state,
      assignments: [...state.assignments, row],
      notifications: appendNotification("Assignment created", `${row.decreeTitle} → ${insp.name}`),
    });
    return true;
  },

  bulkAssign(input: {
    decreeTitle: string;
    templateId: string;
    inspectorIds: string[];
    deadline: string;
    priority: Assignment["priority"];
  }): number {
    const tmpl = state.templates.find((t) => t.id === input.templateId);
    const fromTemplate = tmpl?.inspectionLocation?.trim();
    const rows: Assignment[] = [];
    for (const inspectorId of input.inspectorIds) {
      const insp = inspectorById(inspectorId);
      if (!insp || insp.active === false) continue;
      const createdAt = new Date().toISOString();
      rows.push({
        id: `as-${Math.random().toString(36).slice(2, 8)}`,
        decreeTitle: input.decreeTitle,
        templateId: input.templateId,
        inspectorId,
        inspectorName: insp.name,
        region: fromTemplate && fromTemplate.length > 0 ? fromTemplate : insp.regionLabel,
        deadline: input.deadline,
        createdAt,
        initialInspectionWindowDays: calendarInspectionWindowDays(createdAt.slice(0, 10), input.deadline),
        priority: input.priority,
        status: "pending",
        notes: "",
      });
    }
    if (rows.length === 0) return 0;
    persist({
      ...state,
      assignments: [...state.assignments, ...rows],
      notifications: appendNotification("Bulk assignment", `${rows.length} inspectors assigned`),
    });
    return rows.length;
  },

  addTemplate(t: Omit<Template, "id" | "createdAt"> & { name: string; category: string; fields: TemplateField[] }) {
    const id = `t-${Math.random().toString(36).slice(2, 8)}`;
    const row: Template = {
      ...t,
      inspectionLocation: t.inspectionLocation?.trim() ?? "",
      id,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    persist({
      ...state,
      templates: [...state.templates, row],
      notifications: appendNotification("Template published", row.name),
    });
  },

  updateTemplate(id: string, patch: Partial<Omit<Template, "id">>) {
    persist({
      ...state,
      templates: state.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  },

  deleteTemplate(id: string) {
    persist({
      ...state,
      templates: state.templates.filter((t) => t.id !== id),
    });
  },

  setSubmissionStatus(id: string, status: Submission["status"]) {
    persist({
      ...state,
      submissions: state.submissions.map((s) => (s.id === id ? { ...s, status } : s)),
    });
  },

  /** Append evidence URI (e.g. local `file://` after picker, or remote URL after upload). */
  appendSubmissionEvidence(submissionId: string, evidenceUri: string) {
    const uri = evidenceUri.trim();
    if (!uri) return;
    persist({
      ...state,
      submissions: state.submissions.map((s) =>
        s.id === submissionId ? { ...s, evidence: [...s.evidence, uri] } : s,
      ),
    });
  },

  /**
   * Return a submission for re-inspection: required focus notes, new deadline between
   * tomorrow-at-least-1-day and today+maxDays where maxDays matches the original assignment window.
   */
  requestSubmissionRevision(input: {
    submissionId: string;
    daysAllowed: number;
    focusComment: string;
  }): { ok: true } | { ok: false; error: string } {
    const focus = input.focusComment.trim();
    if (!focus) {
      return { ok: false, error: "Describe what the inspector must fix before you can request a revision." };
    }
    const sub = state.submissions.find((s) => s.id === input.submissionId);
    if (!sub) return { ok: false, error: "Submission not found." };
    const assignment = state.assignments.find((a) => a.id === sub.assignmentId);
    if (!assignment) return { ok: false, error: "Linked assignment not found." };

    const maxDays = inspectionWindowDaysForAssignment(assignment);
    const raw = Number(input.daysAllowed);
    const days = Math.min(maxDays, Math.max(1, Number.isFinite(raw) ? Math.floor(raw) : 1));

    const todayYmd = new Date().toISOString().slice(0, 10);
    const newDeadline = addCalendarDaysFromYmd(todayYmd, days);

    persist({
      ...state,
      submissions: state.submissions.map((s) =>
        s.id === input.submissionId ? { ...s, status: "revision" as const, revisionFocusNotes: focus } : s,
      ),
      assignments: state.assignments.map((a) =>
        a.id === assignment.id ? { ...a, deadline: newDeadline, status: "in_progress" as const } : a,
      ),
      notifications: appendNotification(
        "Inspection returned for revision",
        `${sub.title}: complete within ${days} day(s), due ${newDeadline}.`,
      ),
    });
    return { ok: true };
  },

  revokeCertificate(id: string) {
    persist({
      ...state,
      certificates: state.certificates.map((c) => (c.id === id ? { ...c, status: "revoked" as const } : c)),
      notifications: appendNotification("Certificate revoked", id),
    });
  },

  setFieldInspectorActive(id: string, active: boolean) {
    persist({
      ...state,
      inspectors: state.inspectors.map((i) => (i.id === id ? { ...i, active } : i)),
    });
  },

  addQuestion(q: Omit<Question, "id">) {
    const id = `q-${Math.random().toString(36).slice(2, 8)}`;
    persist({
      ...state,
      questions: [...state.questions, { ...q, id }],
    });
  },

  updateQuestion(id: string, patch: Partial<Omit<Question, "id">>) {
    persist({
      ...state,
      questions: state.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    });
  },

  deleteQuestion(id: string) {
    persist({
      ...state,
      questions: state.questions.filter((q) => q.id !== id),
      exams: state.exams.map((e) => ({ ...e, questions: e.questions.filter((qid) => qid !== id) })),
    });
  },

  addExam(e: Omit<Exam, "id">) {
    const id = `e-${Math.random().toString(36).slice(2, 8)}`;
    persist({
      ...state,
      exams: [...state.exams, { ...e, id }],
      notifications: appendNotification("Exam saved", e.title),
    });
  },

  updateExam(id: string, patch: Partial<Omit<Exam, "id">>) {
    persist({
      ...state,
      exams: state.exams.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      examResults:
        patch.title === undefined
          ? state.examResults
          : state.examResults.map((r) =>
              r.examId === id ? { ...r, examTitle: patch.title as string } : r,
            ),
    });
  },

  deleteExam(id: string) {
    persist({
      ...state,
      exams: state.exams.filter((e) => e.id !== id),
      examResults: state.examResults.filter((r) => r.examId !== id),
    });
  },

  setExamQuestionIds(examId: string, questionIds: string[]) {
    persist({
      ...state,
      exams: state.exams.map((e) => (e.id === examId ? { ...e, questions: questionIds } : e)),
    });
  },

  addExamResult(row: Omit<ExamResult, "id">) {
    const id = `er-${Math.random().toString(36).slice(2, 8)}`;
    persist({
      ...state,
      examResults: [{ ...row, id }, ...state.examResults],
    });
  },

  /**
   * Update one Short-Answer grading row inside an attempt: per-question score
   * (clamped to its max) and grader comment. Caller still needs to run
   * `finalizeExamResult` to recompute totals and (if pass) auto-issue a certificate.
   */
  gradeShortAnswer(
    resultId: string,
    questionId: string,
    score: number | null,
    comment: string,
  ) {
    persist({
      ...state,
      examResults: state.examResults.map((r) => {
        if (r.id !== resultId || !Array.isArray(r.answers)) return r;
        const answers = r.answers.map((a) => {
          if (a.questionId !== questionId) return a;
          const max = Math.max(0, a.maxPoints || 0);
          const clamped =
            typeof score === "number" && Number.isFinite(score)
              ? Math.max(0, Math.min(max, score))
              : undefined;
          return { ...a, manualScore: clamped, graderComment: comment.trim() || undefined };
        });
        return { ...r, answers };
      }),
    });
  },

  /**
   * Recompute totals from `answers`, transition the attempt to `graded`, and
   * (when the candidate passed and no certificate was issued yet) mint a
   * Certificate row. Returns the updated attempt + any newly minted cert.
   */
  finalizeExamResult(
    resultId: string,
    overallComment?: string,
  ): { ok: true; attempt: ExamResult; certificate?: Certificate } | { ok: false; error: string } {
    const result = state.examResults.find((r) => r.id === resultId);
    if (!result) return { ok: false, error: "Attempt not found." };
    const answers = result.answers ?? [];
    const exam = state.exams.find((e) => e.id === result.examId);
    const passPct = exam?.passCriteria ?? 70;

    let earned = 0;
    let max = 0;
    for (const a of answers) {
      const m = Math.max(0, a.maxPoints || 0);
      max += m;
      if (a.questionType === "Short Answer") {
        earned += typeof a.manualScore === "number" ? a.manualScore : 0;
      } else {
        earned += typeof a.autoScore === "number" ? a.autoScore : 0;
      }
    }
    if (max <= 0) max = result.maxScore && result.maxScore > 0 ? result.maxScore : 100;
    const pct = Math.max(0, Math.min(100, Math.round((earned / max) * 100)));
    const passed = pct >= passPct;
    const gradedAt = new Date().toISOString();

    let issuedCert: Certificate | undefined;
    let certificateId = result.certificateId;
    if (passed && !certificateId) {
      issuedCert = {
        id: `CRT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        recipientName: result.candidateName,
        category: exam?.decree || "General",
        issueDate: gradedAt.slice(0, 10),
        expiryDate: addCalendarDaysFromYmd(gradedAt.slice(0, 10), 365 * 2),
        status: "active",
        score: pct,
      };
      certificateId = issuedCert.id;
    }

    const finalized: ExamResult = {
      ...result,
      score: pct,
      passed,
      status: "graded",
      gradedAt,
      completedAt: gradedAt,
      maxScore: max,
      autoGradedScore:
        answers.reduce(
          (s, a) => (a.questionType !== "Short Answer" ? s + (a.autoScore ?? 0) : s),
          0,
        ) || result.autoGradedScore,
      certificateId,
      graderComment:
        overallComment !== undefined ? overallComment.trim() || undefined : result.graderComment,
    };

    persist({
      ...state,
      examResults: state.examResults.map((r) => (r.id === resultId ? finalized : r)),
      certificates: issuedCert ? [issuedCert, ...state.certificates] : state.certificates,
      notifications: appendNotification(
        passed ? "Exam passed" : "Exam graded",
        passed
          ? `${result.candidateName} passed ${result.examTitle} (${pct}%) — certificate ${certificateId} issued.`
          : `${result.candidateName} did not pass ${result.examTitle} (${pct}%).`,
      ),
    });
    return { ok: true, attempt: finalized, certificate: issuedCert };
  },

  /** Add a new attempt row locally (admin tooling / offline flows). */
  startExamAttempt(input: {
    examId: string;
    examTitle: string;
    candidateName: string;
    answers: ExamAttemptAnswer[];
    autoGradedScore: number;
    maxScore: number;
  }): ExamResult {
    const id = `er-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const row: ExamResult = {
      id,
      examId: input.examId,
      examTitle: input.examTitle,
      candidateName: input.candidateName,
      score: 0,
      passed: false,
      completedAt: now,
      submittedAt: now,
      status: "submitted",
      answers: input.answers,
      autoGradedScore: input.autoGradedScore,
      maxScore: input.maxScore,
    };
    persist({ ...state, examResults: [row, ...state.examResults] });
    return row;
  },

  /** Add a Certificate row directly (used by finalizeExamResult and tests). */
  addCertificate(c: Omit<Certificate, "id">): Certificate {
    const id = `CRT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const row: Certificate = { ...c, id };
    persist({
      ...state,
      certificates: [row, ...state.certificates],
    });
    return row;
  },

  updateIncidentStatus(id: string, status: Incident["status"]) {
    persist({
      ...state,
      incidents: state.incidents.map((i) => (i.id === id ? { ...i, status } : i)),
    });
  },

  markNotificationRead(id: string) {
    persist({
      ...state,
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    });
  },

  markAllNotificationsRead() {
    persist({
      ...state,
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    });
  },
};

/** Compliance % per map region id; decreases when open incidents accumulate. */
export function complianceByRegionFromIncidents(incidents: Incident[]): Record<string, number> {
  const regionIds = Array.from(
    new Set(incidents.map((i) => String(i.regionId || "").trim()).filter(Boolean)),
  );
  if (regionIds.length === 0) return {};
  const out: Record<string, number> = {};
  for (const id of regionIds) {
    const open = incidents.filter((i) => i.regionId === id && i.status !== "resolved");
    const penalty = open.reduce(
      (s, i) => s + (i.severity === "high" ? 12 : i.severity === "medium" ? 6 : 2),
      0,
    );
    out[id] = Math.max(0, Math.round(100 - penalty));
  }
  return out;
}

export function buildDashboardAreaData(
  submissions: Submission[],
  assignments: Assignment[],
): { day: string; val: number }[] {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const result: { day: string; val: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    let val = 0;
    for (const s of submissions) {
      if (String(s.date).slice(0, 10) === key) val += 1;
    }
    for (const a of assignments) {
      if (String(a.createdAt).slice(0, 10) === key) val += 1;
    }
    result.push({
      day: dayNames[d.getDay()],
      // Real counts only (no demo scaling/baseline).
      val,
    });
  }
  return result;
}

export function trendFromSeries(values: number[]): { label: string; up: boolean } {
  if (values.length < 2) return { label: "—", up: true };
  const mid = Math.floor(values.length / 2);
  const a = values.slice(0, mid).reduce((s, v) => s + v, 0);
  const b = values.slice(mid).reduce((s, v) => s + v, 0);
  if (a === 0) return { label: b > 0 ? "New" : "0%", up: b >= 0 };
  const pct = Math.round(((b - a) / a) * 100);
  return { label: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

export function averageSubmissionScorePct(submissions: Submission[]): string {
  if (submissions.length === 0) return "0%";
  const m = submissions.reduce((s, x) => s + x.score, 0) / submissions.length;
  return `${Math.round(m)}%`;
}

export function nationalAvgScorePct(incidents: Incident[], submissions: Submission[]): string {
  const scores = submissions.map((s) => (typeof s.score === "number" ? s.score : Number(s.score) || 0));
  if (scores.length === 0) return "—";
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const clamped = Math.max(0, Math.min(100, avg));
  return `${clamped.toFixed(1)}%`;
}

export function buildQuarterlyImplementation(
  submissions: Submission[],
): { q: string; imp: number }[] {
  // No demo baselines: compute a simple "implementation index" from real submission statuses.
  const total = submissions.length;
  if (total === 0) return [];
  const approved = submissions.filter((s) => s.status === "approved").length;
  const revision = submissions.filter((s) => s.status === "revision").length;
  const pending = submissions.filter((s) => s.status === "pending").length;
  const pct = Math.max(0, Math.min(100, Math.round(((approved + revision * 0.5 + pending * 0.25) / total) * 100)));
  return [1, 2, 3, 4].map((n) => ({ q: `Q${n}`, imp: pct }));
}

export function implementationDeltaLabel(series: { imp: number }[]): { label: string; up: boolean } {
  if (series.length < 2) return { label: "—", up: true };
  const first = series[0].imp;
  const last = series[series.length - 1].imp;
  if (first <= 0) return { label: "+0%", up: true };
  const pct = Math.round(((last - first) / first) * 100);
  return { label: `Net Gain ${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

export function displayFromUsername(u: string): string {
  const s = u.trim();
  if (!s) return "Inspector Admin";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function initialsFromInspectorName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "IA";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}


