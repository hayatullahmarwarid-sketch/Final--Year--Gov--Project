import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { HomeColors } from '@/constants/home';
import { usePublicUserData } from '@/contexts/public-user-data-context';
import type { ExamQuestion } from '@/data/exam-content';
import type { ExamListItem } from '@/data/exams';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useAppLanguage } from '@/contexts/app-language-context';
import { showToast } from '@/lib/adapters/toast';
import { getPublicExamById, postPublicExamAttempt, postPublicExamAttemptSubmit } from '@/lib/api/public-user';
import { apiExamSummaryToListItem } from '@/lib/public/exam-cert-adapters';
import { buildExamAttemptAnswersPayload, mapPublicExamQuestionsToExamQuestions } from '@/lib/public/exam-api-questions';
import { palette } from '@/lib/theme';

const TIMER_BG = '#E6F4EF';
const TAG_MCQ_BG = palette.primaryAlpha.a16;
const TAG_MCQ_TEXT = palette.primaryShade2;
const TAG_TYPE_BG = '#F3F4F6';
const LETTER_BG = palette.primaryAlpha.a22;
const FLAG_ACTIVE_BG = '#FFF9E6';
const HEADER_TOP_RADIUS = 20;

function formatMmSs(
  totalSec: number,
  number: (n: number, options?: Intl.NumberFormatOptions) => string,
): string {
  const m = Math.floor(Math.max(0, totalSec) / 60);
  const s = Math.max(0, totalSec) % 60;
  return `${number(m)}:${number(s, { minimumIntegerDigits: 2 })}`;
}

function normalizeId(p: string | string[] | undefined): string {
  if (Array.isArray(p)) return p[0] ?? '';
  return p ?? '';
}

export default function ExamTakeScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const examId = normalizeId(params.id);
  const { recordExamAttempt, addEarnedCertificates } = usePublicUserData();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t, number } = useAppTranslation();
  const { language } = useAppLanguage();
  const horizontal = width < 360 ? 14 : 18;

  const [exam, setExam] = useState<ExamListItem | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootNonce, setBootNonce] = useState(0);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | boolean | null)[]>([]);
  const [flagged, setFlagged] = useState<boolean[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timeLimited, setTimeLimited] = useState(false);

  const submittedRef = useRef(false);
  const timeExpiredAutoSubmitRef = useRef(false);
  const previousSecondsLeftRef = useRef<number | null>(null);
  const serverOffsetMsRef = useRef(0);
  const expiresAtMsRef = useRef<number | null>(null);
  const submitExamRef = useRef<() => void>(() => {});

  const answersRef = useRef<(string | boolean | null)[]>(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      submittedRef.current = false;
      timeExpiredAutoSubmitRef.current = false;
      previousSecondsLeftRef.current = null;
      serverOffsetMsRef.current = 0;
      expiresAtMsRef.current = null;
      setTimeLimited(false);

      const examR = await getPublicExamById(examId);
      if (cancelled) return;
      if (!examR.ok) {
        setLoadError(examR.message);
        setExam(null);
        setQuestions([]);
        setAttemptId(null);
        setLoading(false);
        return;
      }
      const listItemFallback = apiExamSummaryToListItem(examR.data as Record<string, unknown>);
      const startR = await postPublicExamAttempt({ examId, locale: language === 'prs' ? 'fa' : language });
      if (cancelled) return;
      if (!startR.ok) {
        setLoadError(startR.message);
        setExam(listItemFallback);
        setQuestions([]);
        setAttemptId(null);
        setLoading(false);
        return;
      }
      const payload = startR.data as Record<string, unknown>;
      const att = payload.attempt as Record<string, unknown> | undefined;
      const aid = typeof att?.id === 'string' ? att.id : '';
      const rawQs = payload.questions;
      const mapped = Array.isArray(rawQs) ? mapPublicExamQuestionsToExamQuestions(rawQs, { t }) : [];
      const examRow =
        payload.exam && typeof payload.exam === 'object' ? (payload.exam as Record<string, unknown>) : null;
      const listItem = examRow ? apiExamSummaryToListItem(examRow) : listItemFallback;

      const serverTime = typeof payload.serverTime === 'string' ? payload.serverTime : '';
      const timeLimitExpiresAt = typeof payload.timeLimitExpiresAt === 'string' ? payload.timeLimitExpiresAt : null;
      if (serverTime) {
        serverOffsetMsRef.current = Date.parse(serverTime) - Date.now();
      } else {
        serverOffsetMsRef.current = 0;
      }
      if (timeLimitExpiresAt) {
        expiresAtMsRef.current = Date.parse(timeLimitExpiresAt);
        setTimeLimited(true);
        const rem = Math.max(
          0,
          Math.floor(
            (expiresAtMsRef.current - (Date.now() + serverOffsetMsRef.current)) / 1000,
          ),
        );
        setSecondsLeft(rem);
      } else {
        expiresAtMsRef.current = null;
        setTimeLimited(false);
        setSecondsLeft(0);
      }
      if (!aid || mapped.length === 0) {
        setLoadError(mapped.length === 0 ? t('examNoQuestionsLoaded') : t('alertRequestFailed'));
        setExam(listItem);
        setQuestions([]);
        setAttemptId(null);
        setLoading(false);
        return;
      }
      setExam(listItem);
      setQuestions(mapped);
      setAttemptId(aid);
      const empty = Array(mapped.length).fill(null) as (string | boolean | null)[];
      setAnswers(empty);
      answersRef.current = empty;
      setFlagged(Array(mapped.length).fill(false));
      setIndex(0);
      submittedRef.current = false;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, bootNonce, t, language]);

  const submitExam = useCallback(async () => {
    if (!exam || !attemptId || submittedRef.current || questions.length === 0) return;
    submittedRef.current = true;
    const body = buildExamAttemptAnswersPayload(questions, answersRef.current);
    const r = await postPublicExamAttemptSubmit(attemptId, { answers: body });
    if (!r.ok) {
      submittedRef.current = false;
      timeExpiredAutoSubmitRef.current = false;
      showToast(r.message, 'error');
      return;
    }
    const d = r.data as Record<string, unknown>;
    const score = typeof d.score === 'number' ? d.score : 0;
    const maxScore = typeof d.maxScore === 'number' ? d.maxScore : 0;
    const scorePct =
      typeof d.passPct === 'number'
        ? Math.round(d.passPct)
        : maxScore > 0
          ? Math.round((score / maxScore) * 100)
          : 0;
    const passedBool = d.passed === true;
    const passed = passedBool ? '1' : '0';
    const rawCert = d.certificateId;
    const certId =
      typeof rawCert === 'string' && rawCert.trim()
        ? rawCert.trim()
        : rawCert != null && String(rawCert).trim()
          ? String(rawCert).trim()
          : '';

    const total = questions.length;
    const unanswered = answersRef.current.filter((a) => a === null || a === undefined).length;
    const answered = Math.max(0, total - unanswered);
    const correct =
      answered > 0 && maxScore > 0 ? Math.min(answered, Math.round((score / maxScore) * answered)) : 0;
    const incorrect = Math.max(0, answered - correct);

    recordExamAttempt({
      examId: exam.id,
      scorePct,
      correct,
      incorrect,
      unanswered,
      passed: passedBool,
    });
    if (passedBool && certId) {
      addEarnedCertificates([certId]);
    }

    router.replace({
      pathname: `/exam/${exam.id}/results`,
      params: {
        attemptId: attemptId ?? '',
        scorePct: String(scorePct),
        correct: String(correct),
        incorrect: String(incorrect),
        unanswered: String(unanswered),
        passed,
        certificateId: certId,
      },
    } as Href);
  }, [exam, questions, attemptId, recordExamAttempt, addEarnedCertificates]);

  useEffect(() => {
    submitExamRef.current = () => {
      void submitExam();
    };
  }, [submitExam]);

  useEffect(() => {
    if (!exam || questions.length === 0 || !timeLimited) return;
    const tick = () => {
      const exp = expiresAtMsRef.current;
      if (exp == null) return;
      const rem = Math.max(0, Math.floor((exp - (Date.now() + serverOffsetMsRef.current)) / 1000));
      setSecondsLeft(rem);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [exam, questions.length, timeLimited]);

  /** Only fire when the clock actually reaches 0, not when the screen opens already at 0 (stale/orphan state). */
  useEffect(() => {
    if (!timeLimited) {
      previousSecondsLeftRef.current = null;
      return;
    }
    if (submittedRef.current) return;
    if (timeExpiredAutoSubmitRef.current) return;
    const prev = previousSecondsLeftRef.current;
    const hitZeroFromRunning = prev !== null && prev > 0 && secondsLeft === 0;
    previousSecondsLeftRef.current = secondsLeft;
    if (!hitZeroFromRunning) return;
    timeExpiredAutoSubmitRef.current = true;
    submitExamRef.current();
  }, [secondsLeft, timeLimited]);

  const questionCount = questions.length;
  const progressIndexes = useMemo(() => {
    const base = Array.from({ length: questionCount }).map((_, i) => i);
    return I18nManager.isRTL ? base.reverse() : base;
  }, [questionCount]);

  if (loading) {
    return (
      <View style={styles.fallback}>
        <ActivityIndicator size="large" color={Brand.green} />
        <Text style={[styles.fallbackText, { marginTop: 16 }]}>{t('examPreparing')}</Text>
      </View>
    );
  }

  if (loadError || !exam || questions.length === 0) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>{loadError || t('examNotFound')}</Text>
        <Pressable onPress={() => setBootNonce((n) => n + 1)} accessibilityRole="button">
          <Text style={styles.fallbackLink}>{t('certRetry')}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={{ marginTop: 16 }}>
          <Text style={styles.fallbackLink}>{t('btnGoBack')}</Text>
        </Pressable>
      </View>
    );
  }

  const q = questions[index] as ExamQuestion;
  const total = questions.length;
  const currentAnswer = answers[index];
  const isFlagged = flagged[index];
  const flaggedCount = flagged.filter(Boolean).length;

  const jumpToNextFlagged = () => {
    if (flaggedCount === 0) return;
    for (let step = 1; step <= total; step++) {
      const j = (index + step) % total;
      if (flagged[j]) {
        setIndex(j);
        void Haptics.selectionAsync();
        return;
      }
    }
  };

  const canNext =
    q.type === 'mcq'
      ? typeof currentAnswer === 'string' && currentAnswer.length > 0
      : typeof currentAnswer === 'boolean';

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
    void Haptics.selectionAsync();
  };

  const onNext = () => {
    if (!canNext) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (index >= total - 1) {
      submitExam();
    } else {
      setIndex((i) => i + 1);
    }
  };

  const progressFilled = index + 1;

  return (
    <View style={styles.shell}>
      <StatusBar style="dark" />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            paddingHorizontal: horizontal,
            paddingBottom: 12,
          },
        ]}>
        <View style={styles.headerRow}>
          <View style={styles.timerPill}>
            <Ionicons name="time-outline" size={18} color={Brand.green} />
            <Text style={styles.timerText} maxFontSizeMultiplier={1.1}>
              {timeLimited ? formatMmSs(secondsLeft, number) : t('examNoTimeLimit')}
            </Text>
          </View>
          <Text style={styles.counterText} maxFontSizeMultiplier={1.1}>
            <Text style={styles.counterCurrent}>{number(index + 1)}</Text>
            <Text style={styles.counterSlash}> / </Text>
            <Text style={styles.counterTotal}>{number(total)}</Text>
          </Text>
          <Pressable
            onPress={toggleFlag}
            style={[styles.flagBtn, isFlagged && styles.flagBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={isFlagged ? t('examUnflagQuestion') : t('examFlagQuestion')}
            accessibilityHint={t('examFlagQuestion')}>
            <Ionicons
              name={isFlagged ? 'flag' : 'flag-outline'}
              size={20}
              color={isFlagged ? Brand.gold : '#6B7280'}
            />
          </Pressable>
        </View>
        {flaggedCount > 0 ? (
          <View style={styles.reviewRow}>
            <Text style={styles.reviewSummary} maxFontSizeMultiplier={1.05}>
              {t('examFlaggedForReviewCount', { count: flaggedCount })}
            </Text>
            <Pressable
              onPress={jumpToNextFlagged}
              style={styles.reviewLinkBtn}
              accessibilityRole="button"
              accessibilityLabel={t('examNextFlagged')}>
              <Text style={styles.reviewLinkText} maxFontSizeMultiplier={1.05}>
                {t('examNextFlagged')}
              </Text>
              <Ionicons
                name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
                size={16}
                color={Brand.green}
              />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.progressTrack}>
          {progressIndexes.map((i) => (
            <Pressable
              key={i}
              onPress={() => {
                setIndex(i);
                void Haptics.selectionAsync();
              }}
              style={({ pressed }) => [
                styles.progressCell,
                i !== progressIndexes[0] && styles.progressCellGap,
                (I18nManager.isRTL
                  ? total - i <= progressFilled
                  : i < progressFilled)
                  ? styles.progressCellFill
                  : undefined,
                flagged[i] && styles.progressCellFlagged,
                pressed && styles.progressCellPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${t('examTapQuestionDot')} ${number(i + 1)}`}
            />
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontal, paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.questionCard}>
          <View style={styles.tagRow}>
            <View style={styles.tagBlue}>
              <Text style={styles.tagBlueText} maxFontSizeMultiplier={1.05}>
                {t('examQuestionNumber', { index: number(index + 1) })}
              </Text>
            </View>
            <View style={styles.tagGray}>
              <Text style={styles.tagGrayText} maxFontSizeMultiplier={1.05}>
                {q.type === 'mcq' ? t('examMultipleChoice') : t('examTrueFalse')}
              </Text>
            </View>
          </View>
          <Text style={styles.questionText} maxFontSizeMultiplier={1.15}>
            {q.text}
          </Text>
        </View>

        {q.type === 'mcq' ? (
          <View style={styles.optionsCol}>
            {q.options.map((opt) => {
              const value = opt.serverKey ?? opt.key;
              const selected = currentAnswer === value || currentAnswer === opt.key;
              return (
                <Pressable
                  key={`${opt.key}-${value}`}
                  onPress={() => {
                    setAnswers((prev) => {
                      const next = [...prev];
                      next[index] = value;
                      return next;
                    });
                    void Haptics.selectionAsync();
                  }}
                  style={({ pressed }) => [
                    styles.mcqRow,
                    selected && styles.mcqRowSelected,
                    pressed && styles.mcqRowPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}>
                  <View style={[styles.radioOuter, selected && styles.radioOuterOn]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                  <View style={styles.letterBadge}>
                    <Text style={styles.letterBadgeText} maxFontSizeMultiplier={1.1}>
                      {opt.key}
                    </Text>
                  </View>
                  <Text style={styles.mcqLabel} maxFontSizeMultiplier={1.1}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.tfRow}>
            <Pressable
              onPress={() => {
                setAnswers((prev) => {
                  const next = [...prev];
                  next[index] = true;
                  return next;
                });
                void Haptics.selectionAsync();
              }}
              style={({ pressed }) => [
                styles.tfCard,
                currentAnswer === true && styles.tfCardSelected,
                pressed && styles.tfCardPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: currentAnswer === true }}>
              {currentAnswer === true ? <View style={styles.tfCornerDot} /> : null}
              <View style={[styles.tfIconCircle, currentAnswer === true && styles.tfIconCircleOn]}>
                <Ionicons name="checkmark" size={28} color={currentAnswer === true ? '#fff' : '#9CA3AF'} />
              </View>
              <Text
                style={[styles.tfLabel, currentAnswer === true && styles.tfLabelSelected]}
                maxFontSizeMultiplier={1.1}>
                {t('btnTrue')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setAnswers((prev) => {
                  const next = [...prev];
                  next[index] = false;
                  return next;
                });
                void Haptics.selectionAsync();
              }}
              style={({ pressed }) => [
                styles.tfCard,
                currentAnswer === false && styles.tfCardSelected,
                pressed && styles.tfCardPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: currentAnswer === false }}>
              {currentAnswer === false ? <View style={styles.tfCornerDot} /> : null}
              <View style={[styles.tfIconCircle, currentAnswer === false && styles.tfIconCircleOn]}>
                <Ionicons name="close" size={28} color={currentAnswer === false ? '#fff' : '#9CA3AF'} />
              </View>
              <Text
                style={[styles.tfLabel, currentAnswer === false && styles.tfLabelSelected]}
                maxFontSizeMultiplier={1.1}>
                {t('btnFalse')}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom, paddingHorizontal: horizontal }]}>
        <Pressable
          style={[styles.nextBtn, !canNext && styles.nextBtnDisabled]}
          disabled={!canNext}
          onPress={onNext}
          accessibilityRole="button">
          <Text style={[styles.nextLabel, !canNext && styles.nextLabelDisabled]} maxFontSizeMultiplier={1.1}>
            {index >= total - 1 ? t('examSubmit') : t('examNextQuestion')}
          </Text>
          <Ionicons
            name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
            size={22}
            color={canNext ? '#fff' : FormColors.disabledButtonText}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: HomeColors.pageBg,
  },
  header: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: HEADER_TOP_RADIUS,
    borderBottomRightRadius: HEADER_TOP_RADIUS,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TIMER_BG,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  timerText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.green,
    fontVariant: ['tabular-nums'],
  },
  counterText: {
    fontSize: 16,
    fontWeight: '600',
  },
  counterCurrent: {
    color: HomeColors.decreeTitle,
    fontWeight: '800',
  },
  counterSlash: {
    color: '#9CA3AF',
  },
  counterTotal: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  flagBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  flagBtnActive: {
    backgroundColor: FLAG_ACTIVE_BG,
    borderColor: '#1F2937',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reviewSummary: {
    fontSize: 12,
    fontWeight: '600',
    color: FormColors.label,
  },
  reviewLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.green,
  },
  progressTrack: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#EEEEEE',
  },
  progressCell: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  progressCellGap: {
    marginStart: 2,
  },
  progressCellFill: {
    backgroundColor: Brand.green,
  },
  progressCellFlagged: {
    borderWidth: 1.5,
    borderColor: Brand.gold,
  },
  progressCellPressed: {
    opacity: 0.8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 18,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tagBlue: {
    backgroundColor: TAG_MCQ_BG,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagBlueText: {
    fontSize: 12,
    fontWeight: '700',
    color: TAG_MCQ_TEXT,
  },
  tagGray: {
    backgroundColor: TAG_TYPE_BG,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagGrayText: {
    fontSize: 12,
    fontWeight: '600',
    color: FormColors.label,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: FormColors.title,
    lineHeight: 24,
  },
  optionsCol: {
    gap: 12,
  },
  mcqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  mcqRowSelected: {
    borderColor: Brand.green,
  },
  mcqRowPressed: {
    opacity: 0.92,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: FormColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterOn: {
    borderColor: Brand.green,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Brand.green,
  },
  letterBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LETTER_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: TAG_MCQ_TEXT,
  },
  mcqLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: FormColors.title,
  },
  tfRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tfCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: FormColors.border,
    position: 'relative',
  },
  tfCardSelected: {
    borderColor: Brand.green,
  },
  tfCardPressed: {
    opacity: 0.92,
  },
  tfCornerDot: {
    position: 'absolute',
    top: 10,
    end: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.green,
  },
  tfIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: LETTER_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tfIconCircleOn: {
    backgroundColor: Brand.green,
  },
  tfLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  tfLabelSelected: {
    color: Brand.green,
  },
  footer: {
    backgroundColor: HomeColors.pageBg,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: FormColors.dividerMuted,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.green,
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 54,
    ...Platform.select({
      ios: {
        shadowColor: Brand.green,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  nextBtnDisabled: {
    backgroundColor: FormColors.disabledButtonBg,
    elevation: 0,
    shadowOpacity: 0,
  },
  nextLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  nextLabelDisabled: {
    color: FormColors.disabledButtonText,
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
});
