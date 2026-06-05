import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppPressable } from '@/components/ui/AppPressable';
import type { ExamAttemptAnswer, ExamResult } from '@/data/inspector-admin-store';
import { useAppTranslation } from '@/hooks/use-app-translation';
import {
  Brand,
  FormColors,
  palette,
  radius,
  shadowCard,
  spacing,
  touchTarget,
  typography,
} from '@/lib/theme';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

export type FinalizeOutcome = {
  ok: boolean;
  message?: string;
  passed?: boolean;
  certificateId?: string;
};

type Props = {
  visible: boolean;
  attempt: ExamResult | null;
  passCriteria?: number;
  onClose: () => void;
  /**
   * Persist a Short-Answer manual score + grader comment.
   * Caller is expected to update the underlying attempt before resolving.
   */
  onGradeShortAnswer?: (questionId: string, score: number | null, comment: string) => Promise<void>;
  /**
   * Recompute totals, mark the attempt graded, and (when passed) issue a certificate.
   */
  onFinalize?: (overallComment: string) => Promise<FinalizeOutcome>;
};

function statusLabel(status: ExamResult['status'] | undefined, t: TFunc): string {
  if (status === 'in_progress') return t('attemptStatusInProgress');
  if (status === 'graded') return t('attemptStatusGraded');
  return t('attemptStatusSubmitted');
}

function answerTypeLabel(type: ExamAttemptAnswer['questionType'], t: TFunc): string {
  if (type === 'MCQ') return t('qbankTypeBadgeMcq');
  if (type === 'True/False') return t('qbankTypeBadgeTF');
  return t('qbankTypeBadgeShort');
}

export function ExamAttemptReviewSheet({
  visible,
  attempt,
  passCriteria = 70,
  onClose,
  onGradeShortAnswer,
  onFinalize,
}: Props) {
  const { t, number, dateMedium } = useAppTranslation();
  const [drafts, setDrafts] = useState<
    Record<string, { score: string; comment: string; saving?: boolean; saved?: boolean }>
  >({});
  const [overallComment, setOverallComment] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const answers = useMemo<ExamAttemptAnswer[]>(
    () => attempt?.answers ?? [],
    [attempt?.answers],
  );
  const shortAnswers = useMemo(
    () => answers.filter((a) => a.questionType === 'Short Answer'),
    [answers],
  );
  const objectiveAnswers = useMemo(
    () => answers.filter((a) => a.questionType !== 'Short Answer'),
    [answers],
  );

  useEffect(() => {
    if (!visible || !attempt) return;
    const next: Record<string, { score: string; comment: string }> = {};
    for (const a of attempt.answers ?? []) {
      next[a.questionId] = {
        score:
          typeof a.manualScore === 'number'
            ? String(a.manualScore)
            : a.questionType !== 'Short Answer' && typeof a.autoScore === 'number'
              ? String(a.autoScore)
              : '',
        comment: a.graderComment ?? '',
      };
    }
    setDrafts(next);
    setOverallComment(attempt.graderComment ?? '');
    setErrorMsg(null);
    setFinalizing(false);
  }, [visible, attempt]);

  const liveTotals = useMemo(() => {
    let earned = 0;
    let max = 0;
    for (const a of answers) {
      const m = Math.max(0, a.maxPoints || 0);
      max += m;
      if (a.questionType === 'Short Answer') {
        const draft = drafts[a.questionId];
        const v = draft?.score?.trim();
        const num = v ? Number(v) : NaN;
        if (Number.isFinite(num)) earned += Math.max(0, Math.min(m, num));
        else if (typeof a.manualScore === 'number') earned += a.manualScore;
      } else {
        earned += typeof a.autoScore === 'number' ? a.autoScore : 0;
      }
    }
    if (max <= 0) max = attempt?.maxScore ?? 100;
    const pct = Math.max(0, Math.min(100, Math.round((earned / max) * 100)));
    const passes = pct >= passCriteria;
    return { earned, max, pct, passes };
  }, [answers, drafts, attempt, passCriteria]);

  const allShortGraded = useMemo(() => {
    if (shortAnswers.length === 0) return true;
    for (const a of shortAnswers) {
      const v = drafts[a.questionId]?.score?.trim();
      if (!v) return false;
      const num = Number(v);
      if (!Number.isFinite(num)) return false;
    }
    return true;
  }, [shortAnswers, drafts]);

  const onScoreChange = useCallback((questionId: string, score: string) => {
    if (!onGradeShortAnswer) return;
    setDrafts((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? { score: '', comment: '' }), score, saved: false },
    }));
  }, [onGradeShortAnswer]);

  const onCommentChange = useCallback((questionId: string, comment: string) => {
    if (!onGradeShortAnswer) return;
    setDrafts((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? { score: '', comment: '' }), comment, saved: false },
    }));
  }, [onGradeShortAnswer]);

  const persistAnswer = useCallback(
    async (a: ExamAttemptAnswer) => {
      if (!onGradeShortAnswer) return;
      const draft = drafts[a.questionId];
      if (!draft) return;
      setDrafts((prev) => ({
        ...prev,
        [a.questionId]: { ...prev[a.questionId], saving: true },
      }));
      const v = draft.score.trim();
      const num = v ? Number(v) : NaN;
      const score = Number.isFinite(num) ? Math.max(0, Math.min(a.maxPoints, num)) : null;
      await onGradeShortAnswer(a.questionId, score, draft.comment.trim());
      setDrafts((prev) => ({
        ...prev,
        [a.questionId]: { ...prev[a.questionId], saving: false, saved: true },
      }));
    },
    [drafts, onGradeShortAnswer],
  );

  const persistAll = useCallback(async () => {
    for (const a of shortAnswers) {
      await persistAnswer(a);
    }
  }, [shortAnswers, persistAnswer]);

  const handleFinalize = useCallback(async () => {
    if (finalizing || !attempt) return;
    if (!onFinalize || !onGradeShortAnswer) {
      setErrorMsg(t('attemptReviewFinalizeUnavailable'));
      return;
    }
    setErrorMsg(null);
    if (!allShortGraded) {
      setErrorMsg(t('attemptReviewMissingScores'));
      return;
    }
    setFinalizing(true);
    await persistAll();
    const r = await onFinalize(overallComment.trim());
    setFinalizing(false);
    if (!r.ok) {
      if (r.message) setErrorMsg(r.message);
      return;
    }
    onClose();
  }, [
    finalizing,
    attempt,
    allShortGraded,
    persistAll,
    onFinalize,
    onGradeShortAnswer,
    overallComment,
    onClose,
    t,
  ]);

  if (!attempt) return null;

  const status = attempt.status ?? 'submitted';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <AppPressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={t('a11yClose')}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.headerEyebrow} maxFontSizeMultiplier={1.15}>
                {t('attemptReviewEyebrow').toUpperCase()}
              </Text>
              <Text style={styles.headerTitle} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                {attempt.examTitle}
              </Text>
              <Text style={styles.headerSub} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {attempt.candidateName}
              </Text>
            </View>
            <AppPressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t('a11yClose')}>
              <Ionicons name="close" size={20} color={FormColors.subtitle} />
            </AppPressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* Summary card */}
            <View style={[styles.summaryCard, shadowCard()]}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.15}>
                  {t('attemptReviewStatusLabel').toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    status === 'graded'
                      ? styles.statusPillGraded
                      : status === 'submitted'
                        ? styles.statusPillSubmitted
                        : styles.statusPillInProgress,
                  ]}>
                  <Text
                    style={[
                      styles.statusPillText,
                      status === 'graded'
                        ? styles.statusPillTextGraded
                        : status === 'submitted'
                          ? styles.statusPillTextSubmitted
                          : styles.statusPillTextInProgress,
                    ]}
                    maxFontSizeMultiplier={1.15}>
                    {statusLabel(status, t).toUpperCase()}
                  </Text>
                </View>
              </View>
              {attempt.submittedAt ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.15}>
                    {t('attemptReviewSubmittedAt').toUpperCase()}
                  </Text>
                  <Text style={styles.summaryValue} maxFontSizeMultiplier={1.15}>
                    {dateMedium(new Date(attempt.submittedAt))}
                  </Text>
                </View>
              ) : null}
              {attempt.gradedAt ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.15}>
                    {t('attemptReviewGradedAt').toUpperCase()}
                  </Text>
                  <Text style={styles.summaryValue} maxFontSizeMultiplier={1.15}>
                    {dateMedium(new Date(attempt.gradedAt))}
                  </Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.15}>
                  {t('attemptReviewLiveScore').toUpperCase()}
                </Text>
                <Text style={styles.scoreValue} maxFontSizeMultiplier={1.2}>
                  {number(liveTotals.earned)}/{number(liveTotals.max)}
                  {'  '}
                  <Text
                    style={[
                      styles.pctValue,
                      liveTotals.passes ? styles.pctValuePass : styles.pctValueFail,
                    ]}>
                    {number(liveTotals.pct)}%
                  </Text>
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.15}>
                  {t('attemptReviewPassMark').toUpperCase()}
                </Text>
                <Text style={styles.summaryValue} maxFontSizeMultiplier={1.15}>
                  {number(passCriteria)}%
                </Text>
              </View>
              {attempt.certificateId ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.15}>
                    {t('attemptReviewCertificateLabel').toUpperCase()}
                  </Text>
                  <Text style={styles.certValue} maxFontSizeMultiplier={1.15}>
                    {attempt.certificateId}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Auto-graded objective questions */}
            {objectiveAnswers.length > 0 ? (
              <>
                <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>
                  {t('attemptReviewAutoGradedSection').toUpperCase()}
                </Text>
                {objectiveAnswers.map((a, idx) => {
                  const correct = a.autoScore != null && a.autoScore >= a.maxPoints;
                  return (
                    <View
                      key={a.questionId}
                      style={[
                        styles.qCard,
                        correct ? styles.qCardCorrect : styles.qCardIncorrect,
                      ]}>
                      <View style={styles.qHead}>
                        <Text style={styles.qNumber} maxFontSizeMultiplier={1.15}>
                          {t('attemptReviewQNumber', { n: number(idx + 1) })}
                        </Text>
                        <View style={styles.qTypeBadge}>
                          <Text style={styles.qTypeText} maxFontSizeMultiplier={1.15}>
                            {answerTypeLabel(a.questionType, t).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.qPoints} maxFontSizeMultiplier={1.15}>
                          {number(a.autoScore ?? 0)}/{number(a.maxPoints)}
                        </Text>
                      </View>
                      <Text style={styles.qStem} maxFontSizeMultiplier={1.15}>
                        {a.questionText}
                      </Text>
                      <View style={styles.qAnswerRow}>
                        <Text style={styles.qAnswerLabel} maxFontSizeMultiplier={1.15}>
                          {t('attemptReviewCandidateAnswer').toUpperCase()}
                        </Text>
                        <Text style={styles.qAnswerValue} maxFontSizeMultiplier={1.15}>
                          {a.response || '—'}
                        </Text>
                      </View>
                      {!correct ? (
                        <View style={styles.qAnswerRow}>
                          <Text style={styles.qAnswerLabel} maxFontSizeMultiplier={1.15}>
                            {t('attemptReviewExpected').toUpperCase()}
                          </Text>
                          <Text
                            style={[styles.qAnswerValue, styles.qAnswerExpected]}
                            maxFontSizeMultiplier={1.15}>
                            {a.expectedAnswer}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </>
            ) : null}

            {/* Manual grading: short answers */}
            {shortAnswers.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { marginTop: spacing.md }]} maxFontSizeMultiplier={1.2}>
                  {t('attemptReviewManualSection').toUpperCase()}
                </Text>
                {!onGradeShortAnswer ? (
                  <View style={styles.readOnlyNotice}>
                    <Ionicons name="lock-closed-outline" size={16} color={palette.neutral500} />
                    <Text style={styles.readOnlyText} maxFontSizeMultiplier={1.15}>
                      {t('attemptReviewReadOnlyNotice')}
                    </Text>
                  </View>
                ) : null}
                {shortAnswers.map((a, idx) => {
                  const draft = drafts[a.questionId];
                  return (
                    <View key={a.questionId} style={styles.qCard}>
                      <View style={styles.qHead}>
                        <Text style={styles.qNumber} maxFontSizeMultiplier={1.15}>
                          {t('attemptReviewQNumber', { n: number(idx + 1) })}
                        </Text>
                        <View style={[styles.qTypeBadge, styles.qTypeBadgeManual]}>
                          <Text
                            style={[styles.qTypeText, styles.qTypeTextManual]}
                            maxFontSizeMultiplier={1.15}>
                            {answerTypeLabel(a.questionType, t).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.qPoints} maxFontSizeMultiplier={1.15}>
                          {t('attemptReviewMaxPoints', { points: number(a.maxPoints) }).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.qStem} maxFontSizeMultiplier={1.15}>
                        {a.questionText}
                      </Text>
                      <View style={styles.qAnswerRow}>
                        <Text style={styles.qAnswerLabel} maxFontSizeMultiplier={1.15}>
                          {t('attemptReviewCandidateAnswer').toUpperCase()}
                        </Text>
                        <Text style={styles.qAnswerValue} maxFontSizeMultiplier={1.15}>
                          {a.response || '—'}
                        </Text>
                      </View>
                      {a.expectedAnswer ? (
                        <View style={styles.qAnswerRow}>
                          <Text style={styles.qAnswerLabel} maxFontSizeMultiplier={1.15}>
                            {t('attemptReviewModelAnswer').toUpperCase()}
                          </Text>
                          <Text
                            style={[styles.qAnswerValue, styles.qAnswerExpected]}
                            maxFontSizeMultiplier={1.15}>
                            {a.expectedAnswer}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.gradeRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.15}>
                            {t('attemptReviewScoreLabel', { max: number(a.maxPoints) }).toUpperCase()}
                          </Text>
                          <TextInput
                            value={draft?.score ?? ''}
                            onChangeText={(v) => onScoreChange(a.questionId, v)}
                            onBlur={() => void persistAnswer(a)}
                            keyboardType="number-pad"
                            style={styles.input}
                            placeholder="0"
                            placeholderTextColor={palette.neutral400}
                            editable={!!onGradeShortAnswer}
                            maxFontSizeMultiplier={1.15}
                          />
                        </View>
                        {draft?.saved && !draft?.saving ? (
                          <View style={styles.savedTick}>
                            <Ionicons name="checkmark-circle" size={18} color={Brand.green} />
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]} maxFontSizeMultiplier={1.15}>
                        {t('attemptReviewCommentLabel').toUpperCase()}
                      </Text>
                      <TextInput
                        value={draft?.comment ?? ''}
                        onChangeText={(v) => onCommentChange(a.questionId, v)}
                        onBlur={() => void persistAnswer(a)}
                        multiline
                        numberOfLines={2}
                        style={[styles.input, styles.textarea]}
                        placeholder={t('attemptReviewCommentPlaceholder')}
                        placeholderTextColor={palette.neutral400}
                        editable={!!onGradeShortAnswer}
                        maxLength={500}
                        maxFontSizeMultiplier={1.15}
                      />
                    </View>
                  );
                })}
              </>
            ) : null}

            {/* Overall comment + finalize */}
            <Text style={[styles.sectionTitle, { marginTop: spacing.md }]} maxFontSizeMultiplier={1.2}>
              {t('attemptReviewOverallSection').toUpperCase()}
            </Text>
            <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.15}>
              {t('attemptReviewOverallCommentLabel').toUpperCase()}
            </Text>
            <TextInput
              value={overallComment}
              onChangeText={setOverallComment}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textarea]}
              placeholder={t('attemptReviewOverallPlaceholder')}
              placeholderTextColor={palette.neutral400}
              editable={!!onFinalize}
              maxLength={1000}
              maxFontSizeMultiplier={1.15}
            />

            {errorMsg ? (
              <Text style={styles.errorText} maxFontSizeMultiplier={1.15}>
                {errorMsg}
              </Text>
            ) : null}

            <View style={styles.predictionCard}>
              <Ionicons
                name={liveTotals.passes ? 'trophy-outline' : 'alert-circle-outline'}
                size={18}
                color={liveTotals.passes ? Brand.green : '#B91C1C'}
              />
              <Text
                style={[
                  styles.predictionText,
                  liveTotals.passes ? styles.predictionPass : styles.predictionFail,
                ]}
                maxFontSizeMultiplier={1.15}>
                {liveTotals.passes
                  ? t('attemptReviewPredictPass', {
                      pct: number(liveTotals.pct),
                      pass: number(passCriteria),
                    })
                  : t('attemptReviewPredictFail', {
                      pct: number(liveTotals.pct),
                      pass: number(passCriteria),
                    })}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <AppPressable
              onPress={onClose}
              style={styles.cancelBtn}
              accessibilityRole="button"
              accessibilityLabel={t('attemptReviewClose')}>
              <Text style={styles.cancelText} maxFontSizeMultiplier={1.15}>
                {t('attemptReviewClose').toUpperCase()}
              </Text>
            </AppPressable>
            <AppPressable
              onPress={() => void handleFinalize()}
              disabled={finalizing || status === 'graded' || !onFinalize || !onGradeShortAnswer}
              style={[
                styles.finalizeBtn,
                (finalizing || status === 'graded' || !onFinalize || !onGradeShortAnswer) &&
                  styles.finalizeBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityState={{
                disabled: finalizing || status === 'graded' || !onFinalize || !onGradeShortAnswer,
              }}
              accessibilityLabel={t('attemptReviewFinalize')}>
              <Text style={styles.finalizeText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {(status === 'graded'
                  ? t('attemptReviewAlreadyGraded')
                  : !onFinalize || !onGradeShortAnswer
                    ? t('attemptReviewReadOnlyCta')
                  : t('attemptReviewFinalize')
                ).toUpperCase()}
              </Text>
            </AppPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: palette.overlayScrim,
  },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '94%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutral200,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: Brand.green,
  },
  headerTitle: {
    marginTop: 2,
    ...typography.subtitle,
    fontWeight: '800',
    color: FormColors.title,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: FormColors.subtitle,
  },
  closeBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  /* Summary card */
  summaryCard: {
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.neutral500,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: FormColors.title,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '800',
    color: FormColors.title,
  },
  pctValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  pctValuePass: {
    color: Brand.green,
  },
  pctValueFail: {
    color: '#B91C1C',
  },
  certValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.gold,
    letterSpacing: 0.4,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusPillSubmitted: {
    backgroundColor: palette.primaryWash,
    borderColor: palette.primaryWashBorder,
  },
  statusPillGraded: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  statusPillInProgress: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  statusPillTextSubmitted: {
    color: palette.primaryShade2,
  },
  statusPillTextGraded: {
    color: '#166534',
  },
  statusPillTextInProgress: {
    color: '#B45309',
  },

  /* Section heading */
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: Brand.green,
  },

  /* Question card */
  qCard: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  qCardCorrect: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  qCardIncorrect: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  qHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  qNumber: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.neutral500,
  },
  qTypeBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
  },
  qTypeBadgeManual: {
    backgroundColor: '#E0E7FF',
  },
  qTypeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#B45309',
  },
  qTypeTextManual: {
    color: '#3730A3',
  },
  qPoints: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '800',
    color: FormColors.title,
  },
  qStem: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: FormColors.title,
  },
  qAnswerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  qAnswerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.neutral500,
    paddingTop: 2,
    minWidth: 90,
  },
  qAnswerValue: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: FormColors.title,
  },
  qAnswerExpected: {
    color: Brand.green,
  },

  /* manual grade row */
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: palette.neutral400,
    marginBottom: spacing.xxs,
  },
  input: {
    backgroundColor: palette.neutral100,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: FormColors.title,
    minHeight: touchTarget.min,
  },
  textarea: {
    minHeight: 76,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  savedTick: {
    paddingBottom: spacing.sm,
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    backgroundColor: palette.neutral50,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: palette.neutral600,
  },

  predictionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    backgroundColor: palette.neutral50,
  },
  predictionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  predictionPass: {
    color: Brand.green,
  },
  predictionFail: {
    color: '#B91C1C',
  },

  errorText: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.neutral200,
    backgroundColor: palette.white,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.neutral300,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    color: FormColors.title,
  },
  finalizeBtn: {
    flex: 2,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  finalizeBtnDisabled: {
    opacity: 0.5,
  },
  finalizeText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
