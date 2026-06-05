import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  ExamAttemptReviewSheet,
  type FinalizeOutcome,
} from '@/components/inspector-admin/ExamAttemptReviewSheet';
import { AppPressable } from '@/components/ui/AppPressable';
import { CollapsibleFilters } from '@/components/ui/CollapsibleFilters';
import type { Exam, ExamResult } from '@/data/inspector-admin-store';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useInspectorAdminWorkspace } from '@/hooks/use-inspector-admin-workspace';
import { showToast } from '@/lib/adapters/toast';
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

const CATEGORY_KEYS = [
  'all',
  'Economy',
  'Family',
  'Finance',
  'Worship',
  'Trade',
  'Property',
  'Criminal',
  'Civil',
] as const;

type TFunc = (key: string, options?: Record<string, unknown>) => string;

function categoryLabel(key: string, t: TFunc): string {
  if (key === 'all') return t('reportsRegionAll') || 'All categories';
  const map: Record<string, string> = {
    Economy: t('categoryEconomy'),
    Family: t('categoryFamily'),
    Finance: t('categoryFinance'),
    Worship: t('categoryWorship'),
    Trade: t('categoryTrade'),
    Property: t('categoryProperty'),
    Criminal: t('categoryCriminal'),
    Civil: t('categoryCivil'),
  };
  return map[key] ?? key;
}

type OutcomeFilter = 'all' | 'passed' | 'failed';
type StatusFilter = 'all' | 'in_progress' | 'submitted' | 'graded';

function statusLabel(s: ExamResult['status'] | undefined, t: TFunc): string {
  if (s === 'in_progress') return t('attemptStatusInProgress');
  if (s === 'graded') return t('attemptStatusGraded');
  return t('attemptStatusSubmitted');
}

function statusFilterLabel(s: StatusFilter, t: TFunc): string {
  if (s === 'in_progress') return t('attemptStatusInProgress');
  if (s === 'submitted') return t('attemptStatusSubmitted');
  if (s === 'graded') return t('attemptStatusGraded');
  return t('attemptStatusAll');
}

function relativeTime(iso: string, t: TFunc): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) {
    const hours = Math.floor(diffMs / 3600000);
    if (hours <= 0) return t('relativeToday');
    return t('relativeHoursAgo', { hours });
  }
  if (days === 1) return t('relativeYesterday');
  return t('relativeDaysAgo', { days });
}

function examCategory(exams: Exam[], result: ExamResult): string {
  const e = exams.find((x) => x.id === result.examId);
  return e?.decree || 'General';
}

export default function InspectorAdminResultsScreen() {
  const { t, number } = useAppTranslation();
  const { examResults, exams } = useInspectorAdminWorkspace();

  const [candidateSearch, setCandidateSearch] = useState('');
  const [examSearch, setExamSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [catOpen, setCatOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [scoreMin, setScoreMin] = useState('0');
  const [scoreMax, setScoreMax] = useState('100');
  const [reviewing, setReviewing] = useState<ExamResult | null>(null);
  const [examIdFilter, setExamIdFilter] = useState<string>('all');
  const [examPickOpen, setExamPickOpen] = useState(false);

  const openReview = useCallback((row: ExamResult) => setReviewing(row), []);
  const closeReview = useCallback(() => setReviewing(null), []);

  const handleFinalizeUnavailable = useCallback(async (): Promise<FinalizeOutcome> => {
    showToast(t('attemptReviewFinalizeUnavailable'), 'error');
    return { ok: false, message: t('attemptReviewFinalizeUnavailable') };
  }, [t]);

  const sorted = useMemo(
    () => [...examResults].sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [examResults],
  );

  const filtered = useMemo(() => {
    const cq = candidateSearch.trim().toLowerCase();
    const eq = examSearch.trim().toLowerCase();
    const minV = Math.max(0, Math.min(100, Number(scoreMin) || 0));
    const maxV = Math.max(0, Math.min(100, Number(scoreMax) || 100));
    return sorted.filter((r) => {
      if (cq && !r.candidateName.toLowerCase().includes(cq)) return false;
      if (eq && !r.examTitle.toLowerCase().includes(eq)) return false;
      if (examIdFilter !== 'all' && r.examId !== examIdFilter) return false;
      if (
        categoryFilter !== 'all' &&
        examCategory(exams, r).trim().toLowerCase() !== categoryFilter.toLowerCase()
      ) {
        return false;
      }
      if (outcomeFilter === 'passed' && !r.passed) return false;
      if (outcomeFilter === 'failed' && r.passed) return false;
      if (statusFilter !== 'all' && (r.status ?? 'graded') !== statusFilter) return false;
      const score = Math.round(r.score);
      if (score < minV || score > maxV) return false;
      return true;
    });
  }, [
    sorted,
    candidateSearch,
    examSearch,
    categoryFilter,
    outcomeFilter,
    statusFilter,
    scoreMin,
    scoreMax,
    examIdFilter,
    exams,
  ]);

  const total = sorted.length;
  const passed = sorted.filter((r) => r.passed).length;
  const passRate = total === 0 ? 0 : Math.round((passed / total) * 100);

  const resetResultsFilters = useCallback(() => {
    setCandidateSearch('');
    setExamSearch('');
    setCategoryFilter('all');
    setOutcomeFilter('all');
    setStatusFilter('all');
    setScoreMin('0');
    setScoreMax('100');
    setExamIdFilter('all');
    setCatOpen(false);
    setOutcomeOpen(false);
    setStatusOpen(false);
    setExamPickOpen(false);
  }, []);

  const resultsActiveCount = useMemo(() => {
    let n = 0;
    if (candidateSearch.trim()) n += 1;
    if (examSearch.trim()) n += 1;
    if (categoryFilter !== 'all') n += 1;
    if (outcomeFilter !== 'all') n += 1;
    if (statusFilter !== 'all') n += 1;
    if (scoreMin !== '0') n += 1;
    if (scoreMax !== '100') n += 1;
    if (examIdFilter !== 'all') n += 1;
    return n;
  }, [
    candidateSearch,
    examSearch,
    categoryFilter,
    outcomeFilter,
    statusFilter,
    scoreMin,
    scoreMax,
    examIdFilter,
  ]);

  const exportCsv = async () => {
    try {
      const header = ['Exam', 'Category', 'Candidate', 'Score', 'Outcome', 'Completed'];
      const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const lines: string[] = [header.map(esc).join(',')];
      for (const r of filtered) {
        lines.push(
          [
            esc(r.examTitle),
            esc(examCategory(exams, r)),
            esc(r.candidateName),
            esc(String(Math.round(r.score))),
            esc(r.passed ? 'PASSED' : 'FAILED'),
            esc(r.completedAt),
          ].join(','),
        );
      }
      await Clipboard.setStringAsync(lines.join('\n'));
      showToast(t('resultsExportCopied'), 'success');
    } catch {
      showToast(t('resultsExportFailed'), 'error');
    }
  };

  const colWidths = {
    exam: 180,
    category: 100,
    candidate: 130,
    score: 80,
    status: 110,
    outcome: 100,
    submitted: 110,
    actions: 110,
  };
  const tableMinWidth =
    colWidths.exam +
    colWidths.category +
    colWidths.candidate +
    colWidths.score +
    colWidths.status +
    colWidths.outcome +
    colWidths.submitted +
    colWidths.actions;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <View style={styles.headerBlock}>
        <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
          {t('resultsHeading')}
        </Text>
        <Text style={styles.subheading} maxFontSizeMultiplier={1.2}>
          {t('resultsPassRate', { pct: number(passRate) }).toUpperCase()}
          {'  ·  '}
          {t('resultsAttempts', { count: number(total) }).toUpperCase()}
        </Text>
      </View>

      <AppPressable
        onPress={() => void exportCsv()}
        style={styles.exportBtn}
        accessibilityRole="button"
        accessibilityLabel={t('resultsExportCsv')}>
        <Ionicons name="download-outline" size={18} color={palette.white} />
        <Text style={styles.exportBtnText} maxFontSizeMultiplier={1.15}>
          {t('resultsExportCsv')}
        </Text>
      </AppPressable>

      <CollapsibleFilters
        style={styles.filterCard}
        summary={t('qbankShowing', { shown: number(filtered.length), total: number(total) })}
        activeCount={resultsActiveCount}
        onReset={resetResultsFilters}
        resetDisabled={resultsActiveCount === 0}>
        <Text style={styles.label} maxFontSizeMultiplier={1.2}>
          {t('resultsFilterCandidate').toUpperCase()}
        </Text>
        <TextInput
          value={candidateSearch}
          onChangeText={setCandidateSearch}
          placeholder={t('resultsSearchCandidate')}
          placeholderTextColor={palette.neutral400}
          style={styles.input}
          maxFontSizeMultiplier={1.15}
        />

        <Text style={[styles.label, { marginTop: spacing.sm }]} maxFontSizeMultiplier={1.2}>
          {t('resultsFilterExam').toUpperCase()}
        </Text>
        <TextInput
          value={examSearch}
          onChangeText={setExamSearch}
          placeholder={t('resultsSearchExam')}
          placeholderTextColor={palette.neutral400}
          style={styles.input}
          maxFontSizeMultiplier={1.15}
        />

        <Text style={[styles.label, { marginTop: spacing.sm }]} maxFontSizeMultiplier={1.2}>
          {t('resultsFilterExactExam').toUpperCase()}
        </Text>
        <AppPressable
          onPress={() => {
            setExamPickOpen((v) => !v);
            setCatOpen(false);
            setOutcomeOpen(false);
            setStatusOpen(false);
          }}
          style={styles.select}
          accessibilityRole="button"
          accessibilityState={{ expanded: examPickOpen }}>
          <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {examIdFilter === 'all'
              ? t('resultsFilterExactExamAll')
              : exams.find((e) => e.id === examIdFilter)?.title ?? '—'}
          </Text>
          <Ionicons
            name={examPickOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={FormColors.subtitle}
          />
        </AppPressable>
        {examPickOpen ? (
          <View style={[styles.selectMenu, shadowCard()]}>
            <AppPressable
              onPress={() => {
                setExamIdFilter('all');
                setExamPickOpen(false);
              }}
              style={[styles.selectMenuRow, examIdFilter === 'all' && styles.selectMenuRowActive]}
              accessibilityRole="button">
              <Text
                style={[styles.selectMenuText, examIdFilter === 'all' && styles.selectMenuTextActive]}
                numberOfLines={1}>
                {t('resultsFilterExactExamAll')}
              </Text>
            </AppPressable>
            {[...exams].sort((a, b) => a.title.localeCompare(b.title)).map((e) => {
              const on = examIdFilter === e.id;
              return (
                <AppPressable
                  key={e.id}
                  onPress={() => {
                    setExamIdFilter(e.id);
                    setExamPickOpen(false);
                  }}
                  style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}>
                  <Text
                    style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                    numberOfLines={2}>
                    {e.title}
                  </Text>
                </AppPressable>
              );
            })}
          </View>
        ) : null}

        <Text style={[styles.label, { marginTop: spacing.sm }]} maxFontSizeMultiplier={1.2}>
          {t('resultsFilterCategory').toUpperCase()}
        </Text>
        <AppPressable
          onPress={() => {
            setCatOpen((v) => !v);
            setOutcomeOpen(false);
          }}
          style={styles.select}
          accessibilityRole="button"
          accessibilityState={{ expanded: catOpen }}>
          <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {categoryFilter === 'all' ? t('qbankFilterAllCategories') : categoryLabel(categoryFilter, t)}
          </Text>
          <Ionicons
            name={catOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={FormColors.subtitle}
          />
        </AppPressable>
        {catOpen ? (
          <View style={[styles.selectMenu, shadowCard()]}>
            {CATEGORY_KEYS.map((k) => {
              const on = categoryFilter === k;
              const label = k === 'all' ? t('qbankFilterAllCategories') : categoryLabel(k, t);
              return (
                <AppPressable
                  key={k}
                  onPress={() => {
                    setCategoryFilter(k);
                    setCatOpen(false);
                  }}
                  style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}>
                  <Text
                    style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                    numberOfLines={1}>
                    {label}
                  </Text>
                </AppPressable>
              );
            })}
          </View>
        ) : null}

        <Text style={[styles.label, { marginTop: spacing.sm }]} maxFontSizeMultiplier={1.2}>
          {t('resultsFilterOutcome').toUpperCase()}
        </Text>
        <AppPressable
          onPress={() => {
            setOutcomeOpen((v) => !v);
            setCatOpen(false);
            setStatusOpen(false);
          }}
          style={styles.select}
          accessibilityRole="button"
          accessibilityState={{ expanded: outcomeOpen }}>
          <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {outcomeFilter === 'all'
              ? t('resultsOutcomeAll')
              : outcomeFilter === 'passed'
                ? t('resultsOutcomePassed')
                : t('resultsOutcomeFailed')}
          </Text>
          <Ionicons
            name={outcomeOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={FormColors.subtitle}
          />
        </AppPressable>
        {outcomeOpen ? (
          <View style={[styles.selectMenu, shadowCard()]}>
            {(['all', 'passed', 'failed'] as const).map((k) => {
              const on = outcomeFilter === k;
              const label =
                k === 'all'
                  ? t('resultsOutcomeAll')
                  : k === 'passed'
                    ? t('resultsOutcomePassed')
                    : t('resultsOutcomeFailed');
              return (
                <AppPressable
                  key={k}
                  onPress={() => {
                    setOutcomeFilter(k);
                    setOutcomeOpen(false);
                  }}
                  style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}>
                  <Text
                    style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                    numberOfLines={1}>
                    {label}
                  </Text>
                </AppPressable>
              );
            })}
          </View>
        ) : null}

        <Text style={[styles.label, { marginTop: spacing.sm }]} maxFontSizeMultiplier={1.2}>
          {t('resultsFilterStatus').toUpperCase()}
        </Text>
        <AppPressable
          onPress={() => {
            setStatusOpen((v) => !v);
            setCatOpen(false);
            setOutcomeOpen(false);
          }}
          style={styles.select}
          accessibilityRole="button"
          accessibilityState={{ expanded: statusOpen }}>
          <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {statusFilterLabel(statusFilter, t)}
          </Text>
          <Ionicons
            name={statusOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={FormColors.subtitle}
          />
        </AppPressable>
        {statusOpen ? (
          <View style={[styles.selectMenu, shadowCard()]}>
            {(['all', 'in_progress', 'submitted', 'graded'] as const).map((k) => {
              const on = statusFilter === k;
              return (
                <AppPressable
                  key={k}
                  onPress={() => {
                    setStatusFilter(k);
                    setStatusOpen(false);
                  }}
                  style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}>
                  <Text
                    style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                    numberOfLines={1}>
                    {statusFilterLabel(k, t)}
                  </Text>
                </AppPressable>
              );
            })}
          </View>
        ) : null}

        <Text style={[styles.label, { marginTop: spacing.sm }]} maxFontSizeMultiplier={1.2}>
          {t('resultsFilterScoreMin').toUpperCase()}
        </Text>
        <TextInput
          value={scoreMin}
          onChangeText={setScoreMin}
          keyboardType="number-pad"
          style={styles.input}
          placeholder="0"
          placeholderTextColor={palette.neutral400}
          maxFontSizeMultiplier={1.15}
        />

        <Text style={[styles.label, { marginTop: spacing.sm }]} maxFontSizeMultiplier={1.2}>
          {t('resultsFilterScoreMax').toUpperCase()}
        </Text>
        <TextInput
          value={scoreMax}
          onChangeText={setScoreMax}
          keyboardType="number-pad"
          style={styles.input}
          placeholder="100"
          placeholderTextColor={palette.neutral400}
          maxFontSizeMultiplier={1.15}
        />
      </CollapsibleFilters>

      {/* Table */}
      <View style={[styles.tableWrap, shadowCard()]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ minWidth: tableMinWidth }}>
          <View>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, { width: colWidths.exam }]} maxFontSizeMultiplier={1.2}>
                {t('resultsColExam').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.category }]}
                maxFontSizeMultiplier={1.2}>
                {t('resultsColCategory').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.candidate }]}
                maxFontSizeMultiplier={1.2}>
                {t('resultsColCandidate').toUpperCase()}
              </Text>
              <Text style={[styles.headerCell, { width: colWidths.score }]} maxFontSizeMultiplier={1.2}>
                {t('resultsColScore').toUpperCase()}
              </Text>
              <Text style={[styles.headerCell, { width: colWidths.status }]} maxFontSizeMultiplier={1.2}>
                {t('resultsColStatus').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.outcome }]}
                maxFontSizeMultiplier={1.2}>
                {t('resultsColOutcome').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.submitted }]}
                maxFontSizeMultiplier={1.2}>
                {t('resultsColSubmitted').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.actions }]}
                maxFontSizeMultiplier={1.2}>
                {t('resultsColActions').toUpperCase()}
              </Text>
            </View>

            {filtered.length === 0 ? (
              <View style={[styles.emptyBlock, { minWidth: tableMinWidth }]}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="document-text-outline" size={22} color={palette.neutral400} />
                </View>
                <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.2}>
                  {total === 0 ? t('resultsEmptyTitle') : t('resultsEmptyFiltered')}
                </Text>
                <Text style={styles.emptySub} maxFontSizeMultiplier={1.2}>
                  {t('resultsEmptySub')}
                </Text>
              </View>
            ) : (
              filtered.map((r, idx) => {
                const cat = examCategory(exams, r);
                const status = r.status ?? 'graded';
                const submittedIso = r.submittedAt ?? r.completedAt;
                const reviewLabel =
                  status === 'graded'
                    ? t('resultsActionView')
                    : status === 'in_progress'
                      ? t('resultsActionInProgress')
                      : t('resultsActionGrade');
                return (
                  <View
                    key={r.id}
                    style={[styles.row, idx === filtered.length - 1 && styles.rowLast]}>
                    <View style={[styles.cell, { width: colWidths.exam }]}>
                      <Text
                        style={styles.examTitle}
                        numberOfLines={3}
                        maxFontSizeMultiplier={1.15}>
                        {r.examTitle}
                      </Text>
                    </View>
                    <View style={[styles.cell, { width: colWidths.category }]}>
                      <View style={styles.catChip}>
                        <Text style={styles.catChipText} maxFontSizeMultiplier={1.15}>
                          {cat.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.cell, { width: colWidths.candidate }]}>
                      <Text style={styles.bodyText} numberOfLines={2} maxFontSizeMultiplier={1.15}>
                        {r.candidateName}
                        {r.attemptNumber != null
                          ? ` · ${t('resultsAttemptN', { n: number(r.attemptNumber) })}`
                          : ''}
                      </Text>
                    </View>
                    <View style={[styles.cell, { width: colWidths.score }]}>
                      <Text style={styles.scoreText} maxFontSizeMultiplier={1.15}>
                        {number(Math.round(r.score))}%
                      </Text>
                    </View>
                    <View style={[styles.cell, { width: colWidths.status }]}>
                      <View
                        style={[
                          styles.statusChip,
                          status === 'graded'
                            ? styles.statusChipGraded
                            : status === 'submitted'
                              ? styles.statusChipSubmitted
                              : styles.statusChipInProgress,
                        ]}>
                        <Text
                          style={[
                            styles.statusChipText,
                            status === 'graded'
                              ? styles.statusChipTextGraded
                              : status === 'submitted'
                                ? styles.statusChipTextSubmitted
                                : styles.statusChipTextInProgress,
                          ]}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.15}>
                          {statusLabel(status, t).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.cell, { width: colWidths.outcome }]}>
                      {status === 'graded' ? (
                        <View
                          style={[
                            styles.outcomeBadge,
                            r.passed ? styles.outcomePassed : styles.outcomeFailed,
                          ]}>
                          <Text
                            style={[
                              styles.outcomeText,
                              r.passed ? styles.outcomeTextPassed : styles.outcomeTextFailed,
                            ]}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.15}>
                            {(r.passed
                              ? t('resultsOutcomePassedShort')
                              : t('resultsOutcomeFailedShort')
                            ).toUpperCase()}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.dashText} maxFontSizeMultiplier={1.15}>
                          —
                        </Text>
                      )}
                    </View>
                    <View style={[styles.cell, { width: colWidths.submitted }]}>
                      <Text style={styles.bodyText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                        {submittedIso ? relativeTime(submittedIso, t) : '—'}
                      </Text>
                    </View>
                    <View style={[styles.cell, { width: colWidths.actions }]}>
                      <AppPressable
                        onPress={() => openReview(r)}
                        disabled={status === 'in_progress'}
                        style={[
                          styles.reviewBtn,
                          status === 'graded'
                            ? styles.reviewBtnGhost
                            : status === 'in_progress'
                              ? styles.reviewBtnDisabled
                              : styles.reviewBtnPrimary,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={reviewLabel}>
                        <Text
                          style={[
                            styles.reviewBtnText,
                            status === 'graded'
                              ? styles.reviewBtnTextGhost
                              : status === 'in_progress'
                                ? styles.reviewBtnTextDisabled
                                : styles.reviewBtnTextPrimary,
                          ]}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.15}>
                          {reviewLabel.toUpperCase()}
                        </Text>
                      </AppPressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>

      <ExamAttemptReviewSheet
        visible={!!reviewing}
        attempt={reviewing}
        passCriteria={
          reviewing
            ? exams.find((e) => e.id === reviewing.examId)?.passCriteria ?? 70
            : 70
        }
        onClose={closeReview}
        onGradeShortAnswer={undefined}
        onFinalize={handleFinalizeUnavailable}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: FormColors.pageMuted,
  },
  content: {
    paddingBottom: spacing['2xl'],
  },

  headerBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  heading: {
    ...typography.title,
    color: FormColors.title,
  },
  subheading: {
    marginTop: spacing.xxs,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.neutral400,
  },

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: Brand.green,
  },
  exportBtnText: {
    color: palette.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  filterCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    zIndex: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: palette.neutral400,
    marginBottom: spacing.xxs,
  },
  input: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
    fontSize: 14,
    fontWeight: '500',
    color: FormColors.title,
    minHeight: touchTarget.min,
  },

  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    minHeight: touchTarget.min,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: FormColors.title,
  },
  selectMenu: {
    marginTop: spacing.xxs,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    overflow: 'hidden',
  },
  selectMenuRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  selectMenuRowActive: {
    backgroundColor: palette.rowActiveWash,
  },
  selectMenuText: {
    fontSize: 15,
    fontWeight: '500',
    color: FormColors.title,
  },
  selectMenuTextActive: {
    color: Brand.green,
    fontWeight: '700',
  },

  tableWrap: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: palette.neutral50,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutral200,
  },
  headerCell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: palette.neutral500,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutral200,
    alignItems: 'center',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  cell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  examTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: FormColors.title,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
    color: FormColors.subtitle,
    fontWeight: '500',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.green,
    letterSpacing: 0.2,
  },

  catChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: palette.primaryWash,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.primaryWashBorder,
  },
  catChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: palette.primaryShade2,
  },

  dashText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.neutral400,
  },

  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusChipInProgress: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusChipSubmitted: {
    backgroundColor: palette.primaryWash,
    borderColor: palette.primaryWashBorder,
  },
  statusChipGraded: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  statusChipTextInProgress: {
    color: '#B45309',
  },
  statusChipTextSubmitted: {
    color: palette.primaryShade2,
  },
  statusChipTextGraded: {
    color: '#166534',
  },

  reviewBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnPrimary: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  reviewBtnGhost: {
    backgroundColor: palette.white,
    borderColor: Brand.green,
  },
  reviewBtnDisabled: {
    backgroundColor: palette.neutral100,
    borderColor: palette.neutral200,
  },
  reviewBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  reviewBtnTextPrimary: {
    color: palette.white,
  },
  reviewBtnTextGhost: {
    color: Brand.green,
  },
  reviewBtnTextDisabled: {
    color: palette.neutral400,
  },

  outcomeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  outcomePassed: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  outcomeFailed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  outcomeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  outcomeTextPassed: {
    color: '#166534',
  },
  outcomeTextFailed: {
    color: '#991B1B',
  },

  emptyBlock: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.neutral300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: FormColors.title,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.bodySmall,
    color: FormColors.subtitle,
    textAlign: 'center',
    maxWidth: 300,
  },
});
