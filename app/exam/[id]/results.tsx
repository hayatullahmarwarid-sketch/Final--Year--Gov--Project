import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { I18nManager, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { ExamScoreRing } from '@/components/exam/ExamScoreRing';
import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { HomeColors } from '@/constants/home';
import { usePublicUserData } from '@/contexts/public-user-data-context';
import type { ExamListItem } from '@/data/exams';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { getPublicExamAttemptById, getPublicExamById } from '@/lib/api/public-user';
import { apiExamSummaryToListItem } from '@/lib/public/exam-cert-adapters';
import { palette } from '@/lib/theme';

const HEADER_RADIUS = 22;
const CATEGORY_PILL_BG = palette.primaryAlpha.a16;
const CATEGORY_PILL_TEXT = palette.primaryShade2;

function parseIntParam(v: string | string[] | undefined, fallback: number): number {
  const s = Array.isArray(v) ? v[0] : v;
  const n = parseInt(s ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Treat missing or empty query values as absent so stored attempts are used after `/exam/{id}/results`. */
function paramString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  if (s === undefined || s === '') return undefined;
  return s;
}

function normalizeId(p: string | string[] | undefined): string {
  if (Array.isArray(p)) return p[0] ?? '';
  return p ?? '';
}

export default function ExamResultsScreen() {
  const raw = useLocalSearchParams<{
    id: string | string[];
    attemptId?: string;
    certificateId?: string;
    scorePct?: string;
    correct?: string;
    incorrect?: string;
    unanswered?: string;
    passed?: string;
  }>();
  const id = normalizeId(raw.id);
  const { scorePct, correct, incorrect, unanswered, passed, attemptId, certificateId } = raw;
  const { data } = usePublicUserData();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t, number } = useAppTranslation();
  const horizontal = width < 360 ? 14 : 18;

  type QuestionDetail = {
    questionId: string;
    order: number;
    stem: string;
    type: string;
    points: number;
    pointsEarned: number | null;
    options: { optionKey: string; label: string }[];
    correctOptionKeys: string[];
    selectedOptionKeys: string[];
    isCorrect: boolean | null;
    wasAnswered: boolean;
  };

  const [exam, setExam] = useState<ExamListItem | null>(null);
  const [remoteCertId, setRemoteCertId] = useState<string | null>(null);
  const [remotePct, setRemotePct] = useState<number | null>(null);
  const [remotePassed, setRemotePassed] = useState<boolean | null>(null);
  const [questionsWithAnswers, setQuestionsWithAnswers] = useState<QuestionDetail[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const r = await getPublicExamById(id);
      if (cancelled) return;
      if (r.ok) setExam(apiExamSummaryToListItem(r.data as Record<string, unknown>));
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const aid = paramString(attemptId);
  useFocusEffect(
    useCallback(() => {
      if (!aid) return;
      let cancelled = false;
      void (async () => {
        const r = await getPublicExamAttemptById(aid);
        if (cancelled || !r.ok) return;
        const d = r.data as Record<string, unknown>;
        const att = d.attempt as Record<string, unknown> | undefined;
        const score = typeof att?.score === 'number' ? att.score : null;
        const maxScore = typeof att?.maxScore === 'number' ? att.maxScore : null;
        const pct =
          score != null && maxScore != null && maxScore > 0 ? Math.round((score / maxScore) * 100) : null;
        const p = att?.passed === true ? '1' : att?.passed === false ? '0' : undefined;
        const cid = typeof d.certificateId === 'string' && d.certificateId ? d.certificateId : null;
        if (cid) setRemoteCertId(cid);
        if (pct != null) setRemotePct(pct);
        if (p === '1') setRemotePassed(true);
        else if (p === '0') setRemotePassed(false);
        if (Array.isArray(d.questionsWithAnswers)) {
          setQuestionsWithAnswers(d.questionsWithAnswers as QuestionDetail[]);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [aid]),
  );

  const toggleQuestion = (qid: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };

  const stored = id ? data.examAttempts[id] : undefined;

  const scoreS = paramString(scorePct);
  const correctS = paramString(correct);
  const incorrectS = paramString(incorrect);
  const unansweredS = paramString(unanswered);
  const passedS = paramString(passed);

  const pct =
    remotePct != null
      ? remotePct
      : scoreS !== undefined
        ? parseIntParam(scoreS, 0)
        : stored?.scorePct ?? 0;
  const nCorrect = correctS !== undefined ? parseIntParam(correctS, 0) : stored?.correct ?? 0;
  const nIncorrect = incorrectS !== undefined ? parseIntParam(incorrectS, 0) : stored?.incorrect ?? 0;
  const nUnanswered = unansweredS !== undefined ? parseIntParam(unansweredS, 0) : stored?.unanswered ?? 0;
  const isPass =
    remotePassed != null
      ? remotePassed
      : passedS !== undefined
        ? passedS === '1'
        : (stored?.passed ?? false);

  const totalQs = exam?.questionCount ?? nCorrect + nIncorrect + nUnanswered;
  const passMark = exam?.passMarkPct ?? 55;

  const examOrFallback =
    exam ??
    ({
      id,
      category: t('examsTitle'),
      status: 'completed',
      title: t('examStackTitle'),
      durationMin: 45,
      questionCount: totalQs,
      passMarkPct: passMark,
      rewardCertificateId: null,
    } as ExamListItem);

  const backToExams = () => {
    void Haptics.selectionAsync();
    router.replace('/(tabs)/exams' as Href);
  };

  const retry = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace(`/exam/${examOrFallback.id}/instructions` as Href);
  };

  if (!id) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>{t('examResultsUnavailable')}</Text>
        <Pressable onPress={backToExams} accessibilityRole="button">
          <Text style={styles.fallbackLink}>{t('examBackToExams')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingBottom: 18 }]}>
        <View style={[styles.headerRow, { paddingHorizontal: horizontal }]}>
          <Pressable
            onPress={backToExams}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t('a11yGoBack')}>
            <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={1.15}>
            {t('examResultsTitle')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontal, paddingBottom: 28 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.ringWrap}>
            <ExamScoreRing percent={pct} passed={isPass} />
          </View>
          <View style={[styles.statusBadge, isPass ? styles.statusPass : styles.statusFail]}>
            <MaterialCommunityIcons
              name="trophy-outline"
              size={18}
              color={isPass ? Brand.green : '#DC2626'}
            />
            <Text style={[styles.statusText, isPass ? styles.statusTextPass : styles.statusTextFail]}>
              {isPass ? t('examPassed') : t('examFailed')}
            </Text>
          </View>
          {isPass ? (
            <View style={styles.certRow}>
              <MaterialCommunityIcons name="ribbon" size={18} color={Brand.green} />
              <Text style={styles.certText} maxFontSizeMultiplier={1.05}>
                {t('examIntermediateCertificate')}
              </Text>
            </View>
          ) : null}
          <View style={styles.scoreDivider} />
          <View style={styles.scoreLine}>
            <Text style={styles.scoreLabel} maxFontSizeMultiplier={1.05}>
              {t('examScoreLabel')}
            </Text>
            <Text style={styles.scoreValue} maxFontSizeMultiplier={1.1}>
              <Text style={[styles.scoreNum, !isPass && styles.scoreNumFail]}>{number(nCorrect)}</Text>
              <Text style={styles.scoreSlash}> / {number(totalQs)}</Text>
              <Text style={styles.scorePassHint}>{t('examPassMarkInline', { percent: number(passMark) })}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.breakdownTitle} maxFontSizeMultiplier={1.1}>
            {t('examBreakdownTitle')}
          </Text>
          <BreakdownRow
            icon="checkmark-circle"
            iconBg={palette.primaryAlpha.a14}
            iconColor={palette.primaryShade1}
            label={t('examCorrect')}
            value={nCorrect}
            valueColor={palette.primaryShade1}
          />
          <View style={styles.bdDivider} />
          <BreakdownRow
            icon="close-circle"
            iconBg="rgba(239, 68, 68, 0.16)"
            iconColor="#DC2626"
            label={t('examIncorrect')}
            value={nIncorrect}
            valueColor="#DC2626"
          />
          <View style={styles.bdDivider} />
          <BreakdownRow
            icon="remove-circle-outline"
            iconBg="#F3F4F6"
            iconColor="#6B7280"
            label={t('examUnanswered')}
            value={nUnanswered}
            valueColor="#6B7280"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText} maxFontSizeMultiplier={1.05}>
              {examOrFallback.category}
            </Text>
          </View>
          <Text style={styles.examTitle} maxFontSizeMultiplier={1.1}>
            {examOrFallback.title}
          </Text>
        </View>

        {questionsWithAnswers.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.reviewSectionTitle}>{t('examQuestionReview')}</Text>
            {questionsWithAnswers.map((q, idx) => {
              const expanded = expandedQuestions.has(q.questionId);
              const isCorrect = q.isCorrect === true;
              const isWrong = q.isCorrect === false;
              const isSkipped = !q.wasAnswered;
              return (
                <View key={q.questionId}>
                  {idx > 0 ? <View style={styles.qDivider} /> : null}
                  <Pressable
                    style={styles.qRow}
                    onPress={() => toggleQuestion(q.questionId)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}>
                    <View style={[
                      styles.qBadge,
                      isCorrect && styles.qBadgePass,
                      isWrong && styles.qBadgeFail,
                      isSkipped && styles.qBadgeSkip,
                    ]}>
                      {isCorrect ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : isWrong ? (
                        <Ionicons name="close" size={14} color="#fff" />
                      ) : (
                        <Ionicons name="remove" size={14} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.qStem} numberOfLines={expanded ? undefined : 2} maxFontSizeMultiplier={1.1}>
                      {number(idx + 1)}. {q.stem}
                    </Text>
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#94A3B8"
                    />
                  </Pressable>
                  {expanded ? (
                    <View style={styles.qDetail}>
                      {q.options.map((opt) => {
                        const isUserAnswer = q.selectedOptionKeys.includes(opt.optionKey);
                        const isCorrectOpt = q.correctOptionKeys.includes(opt.optionKey);
                        return (
                          <View
                            key={opt.optionKey}
                            style={[
                              styles.qOption,
                              isCorrectOpt && styles.qOptionCorrect,
                              isUserAnswer && !isCorrectOpt && styles.qOptionWrong,
                            ]}>
                            <View style={[
                              styles.qOptDot,
                              isCorrectOpt && styles.qOptDotCorrect,
                              isUserAnswer && !isCorrectOpt && styles.qOptDotWrong,
                            ]}>
                              {isCorrectOpt ? (
                                <Ionicons name="checkmark" size={11} color="#fff" />
                              ) : isUserAnswer ? (
                                <Ionicons name="close" size={11} color="#fff" />
                              ) : null}
                            </View>
                            <Text style={[
                              styles.qOptLabel,
                              isCorrectOpt && styles.qOptLabelCorrect,
                              isUserAnswer && !isCorrectOpt && styles.qOptLabelWrong,
                            ]}>
                              {opt.label}
                            </Text>
                          </View>
                        );
                      })}
                      {!q.wasAnswered ? (
                        <Text style={styles.qSkipNote}>{t('examNotAnswered')}</Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {isPass ? (
          <View style={{ gap: 12 }}>
            {(paramString(certificateId) || remoteCertId) && (
              <Pressable
                style={styles.primaryFull}
                onPress={() =>
                  router.push(`/certificate/${encodeURIComponent(paramString(certificateId) || remoteCertId || '')}` as Href)
                }
                accessibilityRole="button">
                <MaterialCommunityIcons name="ribbon" size={22} color="#fff" />
                <Text style={styles.primaryFullLabel} maxFontSizeMultiplier={1.1}>
                  {t('notificationsViewCertificate')}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.primaryFull, { backgroundColor: palette.primaryShade1 }]}
              onPress={backToExams}
              accessibilityRole="button"
              accessibilityLabel={t('a11yBackToExams')}>
              <Ionicons name="home-outline" size={22} color="#fff" />
              <Text style={styles.primaryFullLabel} maxFontSizeMultiplier={1.1}>
                {t('examBackToExams')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.failActions}>
            <Pressable
              style={styles.outlineBtn}
              onPress={retry}
              accessibilityRole="button"
              accessibilityLabel={t('a11yRetryExam')}>
              <Ionicons name="refresh" size={22} color={HomeColors.decreeTitle} />
              <Text style={styles.outlineBtnLabel} maxFontSizeMultiplier={1.05}>
                {t('examRetry')}
              </Text>
            </Pressable>
            <Pressable
              style={styles.primaryHalf}
              onPress={backToExams}
              accessibilityRole="button"
              accessibilityLabel={t('a11yBackToExams')}>
              <Ionicons name="home-outline" size={22} color="#fff" />
              <Text style={styles.primaryHalfLabel} maxFontSizeMultiplier={1.05}>
                {t('examBackToExams')}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function BreakdownRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  valueColor: string;
}) {
  const { number } = useAppTranslation();
  return (
    <View style={styles.bdRow}>
      <View style={[styles.bdIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.bdLabel} maxFontSizeMultiplier={1.05}>
        {label}
      </Text>
      <Text style={[styles.bdValue, { color: valueColor }]} maxFontSizeMultiplier={1.1}>
        {number(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: HomeColors.pageBg,
  },
  header: {
    backgroundColor: Brand.green,
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerSpacer: { width: 44 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 18 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  ringWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 12,
  },
  statusPass: {
    backgroundColor: FormColors.iconMint,
  },
  statusFail: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  statusTextPass: {
    color: Brand.green,
  },
  statusTextFail: {
    color: '#DC2626',
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  certText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.green,
  },
  scoreDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: FormColors.dividerMuted,
    marginVertical: 16,
  },
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  scoreLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: FormColors.label,
  },
  scoreValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  scoreNum: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.green,
  },
  scoreNumFail: {
    color: '#DC2626',
  },
  scoreSlash: {
    color: FormColors.label,
    fontWeight: '600',
  },
  scorePassHint: {
    color: FormColors.placeholder,
    fontWeight: '500',
    fontSize: 13,
  },
  breakdownTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: HomeColors.decreeTitle,
    marginBottom: 14,
  },
  bdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  bdIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bdLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: FormColors.title,
  },
  bdValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  bdDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: FormColors.dividerMuted,
    marginVertical: 12,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: CATEGORY_PILL_BG,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: CATEGORY_PILL_TEXT,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: HomeColors.decreeTitle,
    lineHeight: 22,
  },
  primaryFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Brand.green,
    paddingVertical: 16,
    borderRadius: 999,
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: Brand.green,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  primaryFullLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  failActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: FormColors.border,
    backgroundColor: '#fff',
  },
  outlineBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: HomeColors.decreeTitle,
  },
  primaryHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Brand.green,
  },
  primaryHalfLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HomeColors.pageBg,
    padding: 24,
  },
  fallbackText: {
    fontSize: 16,
    color: FormColors.label,
    marginBottom: 12,
  },
  fallbackLink: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.green,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: FormColors.label,
    marginBottom: 14,
  },
  qDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: FormColors.dividerMuted,
    marginVertical: 2,
  },
  qRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
  },
  qBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  qBadgePass: { backgroundColor: Brand.green },
  qBadgeFail: { backgroundColor: '#DC2626' },
  qBadgeSkip: { backgroundColor: '#9CA3AF' },
  qStem: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: FormColors.label,
    lineHeight: 20,
  },
  qDetail: {
    paddingLeft: 34,
    paddingBottom: 10,
    gap: 6,
  },
  qOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  qOptionCorrect: { backgroundColor: '#F0FDF4' },
  qOptionWrong: { backgroundColor: '#FEF2F2' },
  qOptDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  qOptDotCorrect: { backgroundColor: Brand.green, borderColor: Brand.green },
  qOptDotWrong: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  qOptLabel: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  qOptLabelCorrect: { color: '#166534', fontWeight: '600' },
  qOptLabelWrong: { color: '#DC2626', fontWeight: '600' },
  qSkipNote: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
