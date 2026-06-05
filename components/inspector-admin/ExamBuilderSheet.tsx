import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CalendarField } from '@/components/inspector-admin/CalendarField';
import { AppPressable } from '@/components/ui/AppPressable';
import type { Exam, Question } from '@/data/inspector-admin-store';
import { useAppTranslation } from '@/hooks/use-app-translation';
import {
  EXAM_PASSING_SCORE_PCT,
  EXAM_TIME_LIMIT_MINUTES,
  EXAM_TOTAL_POINTS_BUDGET,
} from '@/lib/validation/enterprise-limits';
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

export type ExamBuilderValue = {
  title: string;
  description: string;
  category: string;
  /** Real decree category id (API); required for live question bank + exam grouping. */
  decreeCategoryId?: string;
  status: Exam['status'];
  audienceRoleKeys: NonNullable<Exam['audienceRoleKeys']>;
  /** Optional end of public availability (ISO or day string from CalendarField). */
  scheduledCloseAt: string;
  timeLimit: number;
  passCriteria: number;
  maxScore: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  questionIds: string[];
};

type Props = {
  visible: boolean;
  mode: 'create' | 'edit';
  initial?: Partial<ExamBuilderValue> & { decreeCategoryId?: string };
  questions: Question[];
  /** When set (live API), category pickers use DUD decree categories instead of mock keys. */
  decreeCategories?: { id: string; name: string }[];
  /** When true, saving requires at least one question from the selected category. */
  requireSelectedQuestions?: boolean;
  canDelete?: boolean;
  onClose: () => void;
  onSubmit: (value: ExamBuilderValue) => Promise<{ ok: boolean; message?: string }>;
  onDelete?: () => Promise<{ ok: boolean; message?: string }>;
};

const CATEGORY_KEYS = [
  'Economy',
  'Family',
  'Finance',
  'Worship',
  'Trade',
  'Property',
  'Criminal',
  'Civil',
] as const;

const STATUS_KEYS: Exam['status'][] = ['draft', 'published', 'closed'];

function categoryLabel(key: string, t: TFunc): string {
  switch (key) {
    case 'Economy':
      return t('categoryEconomy');
    case 'Family':
      return t('categoryFamily');
    case 'Finance':
      return t('categoryFinance');
    case 'Worship':
      return t('categoryWorship');
    case 'Trade':
      return t('categoryTrade');
    case 'Property':
      return t('categoryProperty');
    case 'Criminal':
      return t('categoryCriminal');
    case 'Civil':
      return t('categoryCivil');
    default:
      return key;
  }
}

function statusLabel(key: Exam['status'], t: TFunc): string {
  if (key === 'published') return t('examStatusPublished');
  if (key === 'closed') return t('examStatusClosed');
  return t('examStatusDraft');
}

export function ExamBuilderSheet({
  visible,
  mode,
  initial,
  questions,
  decreeCategories,
  requireSelectedQuestions = false,
  canDelete,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const { t } = useAppTranslation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Economy');
  const [decreeCategoryId, setDecreeCategoryId] = useState<string>('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [status, setStatus] = useState<Exam['status']>('draft');
  const [statusOpen, setStatusOpen] = useState(false);
  const [scheduledCloseAt, setScheduledCloseAt] = useState('');
  const [timeLimit, setTimeLimit] = useState('60');
  const [passCriteria, setPassCriteria] = useState('80');
  const [maxScore, setMaxScore] = useState('100');
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    const firstDud = decreeCategories && decreeCategories.length > 0 ? decreeCategories[0] : null;
    const fromInitial =
      initial && 'decreeCategoryId' in initial && typeof (initial as { decreeCategoryId?: string }).decreeCategoryId === 'string'
        ? (initial as { decreeCategoryId?: string }).decreeCategoryId
        : '';
    if (firstDud) {
      setDecreeCategoryId(fromInitial && firstDud && decreeCategories?.some((c) => c.id === fromInitial) ? fromInitial : firstDud.id);
      const match = decreeCategories?.find((c) => c.id === (fromInitial || firstDud.id));
      setCategory(
        initial?.category && initial.category.trim()
          ? initial.category
          : match?.name ?? firstDud.name,
      );
    } else {
      setCategory(initial?.category && initial.category.trim() ? initial.category : 'Economy');
      setDecreeCategoryId('');
    }
    setStatus((initial?.status as Exam['status']) ?? 'draft');
    setScheduledCloseAt(initial?.scheduledCloseAt ? initial.scheduledCloseAt.slice(0, 10) : '');
    setTimeLimit(initial?.timeLimit != null ? String(initial.timeLimit) : '60');
    setPassCriteria(initial?.passCriteria != null ? String(initial.passCriteria) : '80');
    setMaxScore(initial?.maxScore != null ? String(initial.maxScore) : '100');
    setRandomizeQuestions(!!initial?.randomizeQuestions);
    setRandomizeOptions(!!initial?.randomizeOptions);
    const ids = initial?.questionIds ?? [];
    const next: Record<string, boolean> = {};
    for (const id of ids) next[id] = true;
    setSelected(next);
    setCategoryOpen(false);
    setStatusOpen(false);
    setSubmitting(false);
    setDeleting(false);
    setErrorMsg(null);
  }, [visible, initial, decreeCategories]);

  const filteredQuestions = useMemo(() => {
    if (decreeCategoryId) {
      return questions.filter((q) => q.decreeCategoryId === decreeCategoryId);
    }
    const cat = category.trim().toLowerCase();
    return questions.filter((q) => (q.decree || '').trim().toLowerCase() === cat);
  }, [questions, category, decreeCategoryId]);

  useEffect(() => {
    if (filteredQuestions.length === 0) return;
    const valid = new Set(filteredQuestions.map((q) => q.id));
    setSelected((prev) => {
      const next: Record<string, boolean> = {};
      for (const [id, on] of Object.entries(prev)) {
        if (valid.has(id) && on) next[id] = true;
      }
      return next;
    });
  }, [filteredQuestions]);

  const toggleQuestion = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const onSave = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setErrorMsg(null);
    const name = title.trim();
    if (!name) {
      setErrorMsg(t('examTitleRequired'));
      submittingRef.current = false;
      return;
    }
    if (scheduledCloseAt && !/^\d{4}-\d{2}-\d{2}$/.test(scheduledCloseAt.trim())) {
      setErrorMsg(t('examDateRangeInvalid'));
      submittingRef.current = false;
      return;
    }
    const tlRaw = Math.round(Number(timeLimit));
    const pcRaw = Math.round(Number(passCriteria));
    const msRaw = Math.round(Number(maxScore));
    if (
      !Number.isFinite(tlRaw) ||
      tlRaw < EXAM_TIME_LIMIT_MINUTES.MIN ||
      tlRaw > EXAM_TIME_LIMIT_MINUTES.MAX ||
      !Number.isFinite(pcRaw) ||
      pcRaw < EXAM_PASSING_SCORE_PCT.MIN ||
      pcRaw > EXAM_PASSING_SCORE_PCT.MAX ||
      !Number.isFinite(msRaw) ||
      msRaw < EXAM_TOTAL_POINTS_BUDGET.MIN ||
      msRaw > EXAM_TOTAL_POINTS_BUDGET.MAX
    ) {
      setErrorMsg(t('examNumericRangesInvalid'));
      submittingRef.current = false;
      return;
    }
    const tl = tlRaw;
    const pc = pcRaw;
    const ms = msRaw;
    const ids = filteredQuestions.filter((q) => selected[q.id]).map((q) => q.id);
    if (requireSelectedQuestions && ids.length === 0) {
      setErrorMsg(t('examNeedQuestionsInCategory'));
      submittingRef.current = false;
      return;
    }
    setSubmitting(true);
    try {
      const r = await onSubmit({
        title: name,
        description: description.trim(),
        category,
        decreeCategoryId: decreeCategoryId || undefined,
        status,
        audienceRoleKeys: ['public'],
        scheduledCloseAt: scheduledCloseAt ? `${scheduledCloseAt}T23:59:59.999Z` : '',
        timeLimit: tl,
        passCriteria: pc,
        maxScore: ms,
        randomizeQuestions,
        randomizeOptions,
        questionIds: ids,
      });
      if (!r.ok) {
        if (r.message) setErrorMsg(r.message);
        return;
      }
      onClose();
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }, [
    title,
    description,
    timeLimit,
    passCriteria,
    maxScore,
    filteredQuestions,
    selected,
    category,
    decreeCategoryId,
    status,
    scheduledCloseAt,
    randomizeQuestions,
    randomizeOptions,
    requireSelectedQuestions,
    onSubmit,
    onClose,
    t,
  ]);

  const onConfirmDelete = useCallback(async () => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    const r = await onDelete();
    setDeleting(false);
    if (!r.ok) {
      if (r.message) setErrorMsg(r.message);
      return;
    }
    onClose();
  }, [deleting, onDelete, onClose]);

  const sheetTitle = mode === 'edit' ? t('examEditTitle') : t('examBuildTitle');
  const primaryLabel = mode === 'edit' ? t('examActionSaveChanges') : t('examActionSave');

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
            <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {sheetTitle}
            </Text>
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
            {/* SECTION: Basic info */}
            <Text style={styles.section} maxFontSizeMultiplier={1.2}>
              {t('examSectionBasic').toUpperCase()}
            </Text>

            <Text style={styles.label}>{t('examFieldTitle').toUpperCase()}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('examFieldTitle')}
              placeholderTextColor={palette.neutral400}
              style={styles.input}
              maxLength={140}
              maxFontSizeMultiplier={1.15}
            />

            <Text style={[styles.label, { marginTop: spacing.md }]}>
              {t('examFieldDescription').toUpperCase()}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('examFieldDescriptionPlaceholder')}
              placeholderTextColor={palette.neutral400}
              style={[styles.input, styles.textarea]}
              multiline
              numberOfLines={4}
              maxLength={600}
              maxFontSizeMultiplier={1.15}
            />

            <Text style={[styles.label, { marginTop: spacing.md }]}>
              {t('examFieldCategory').toUpperCase()}
            </Text>
            <AppPressable
              onPress={() => {
                setCategoryOpen((v) => !v);
                setStatusOpen(false);
              }}
              style={styles.select}
              accessibilityRole="button"
              accessibilityState={{ expanded: categoryOpen }}
              accessibilityLabel={t('examFieldCategory')}>
              <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {decreeCategories && decreeCategories.length > 0
                  ? category
                  : categoryLabel(category, t)}
              </Text>
              <Ionicons
                name={categoryOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={FormColors.subtitle}
              />
            </AppPressable>
            {categoryOpen ? (
              <View style={[styles.selectMenu, shadowCard()]}>
                {decreeCategories && decreeCategories.length > 0
                  ? decreeCategories.map((c) => {
                      const on = c.id === decreeCategoryId;
                      return (
                        <AppPressable
                          key={c.id}
                          onPress={() => {
                            setDecreeCategoryId(c.id);
                            setCategory(c.name);
                            setCategoryOpen(false);
                          }}
                          style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}>
                          <Text
                            style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                            numberOfLines={1}>
                            {c.name}
                          </Text>
                          {on ? <Ionicons name="checkmark" size={16} color={Brand.green} /> : null}
                        </AppPressable>
                      );
                    })
                  : CATEGORY_KEYS.map((key) => {
                      const on = key === category;
                      return (
                        <AppPressable
                          key={key}
                          onPress={() => {
                            setCategory(key);
                            setCategoryOpen(false);
                          }}
                          style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}>
                          <Text
                            style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                            numberOfLines={1}>
                            {categoryLabel(key, t)}
                          </Text>
                          {on ? <Ionicons name="checkmark" size={16} color={Brand.green} /> : null}
                        </AppPressable>
                      );
                    })}
              </View>
            ) : null}

            {/* SECTION: Lifecycle */}
            <Text style={[styles.section, { marginTop: spacing.lg }]} maxFontSizeMultiplier={1.2}>
              {t('examSectionLifecycle').toUpperCase()}
            </Text>

            <Text style={styles.label}>{t('examFieldStatus').toUpperCase()}</Text>
            <AppPressable
              onPress={() => {
                setStatusOpen((v) => !v);
                setCategoryOpen(false);
              }}
              style={styles.select}
              accessibilityRole="button"
              accessibilityState={{ expanded: statusOpen }}
              accessibilityLabel={t('examFieldStatus')}>
              <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {statusLabel(status, t)}
              </Text>
              <Ionicons
                name={statusOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={FormColors.subtitle}
              />
            </AppPressable>
            {statusOpen ? (
              <View style={[styles.selectMenu, shadowCard()]}>
                {STATUS_KEYS.map((s) => {
                  const on = s === status;
                  return (
                    <AppPressable
                      key={s}
                      onPress={() => {
                        setStatus(s);
                        setStatusOpen(false);
                      }}
                      style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}>
                      <Text
                        style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                        numberOfLines={1}>
                        {statusLabel(s, t)}
                      </Text>
                      {on ? <Ionicons name="checkmark" size={16} color={Brand.green} /> : null}
                    </AppPressable>
                  );
                })}
              </View>
            ) : null}

            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.label}>{t('examFieldCloseAt').toUpperCase()}</Text>
              <Text style={styles.hint} maxFontSizeMultiplier={1.1}>
                {t('examCloseDateHint')}
              </Text>
            </View>
            <CalendarField
              value={scheduledCloseAt}
              onChange={setScheduledCloseAt}
              placeholder={t('examFieldCloseAtPlaceholder')}
              accessibilityLabel={t('examFieldCloseAt')}
            />

            {/* SECTION: Scoring */}
            <Text style={[styles.section, { marginTop: spacing.lg }]} maxFontSizeMultiplier={1.2}>
              {t('examSectionScoring').toUpperCase()}
            </Text>

            <View style={styles.row2}>
              <View style={styles.col2}>
                <Text style={styles.label}>{t('examFieldTimeLimit').toUpperCase()}</Text>
                <TextInput
                  value={timeLimit}
                  onChangeText={setTimeLimit}
                  keyboardType="number-pad"
                  style={styles.input}
                  placeholder="45"
                  placeholderTextColor={palette.neutral400}
                  maxFontSizeMultiplier={1.15}
                />
              </View>
              <View style={styles.col2}>
                <Text style={styles.label}>{t('examFieldPassPercent').toUpperCase()}</Text>
                <TextInput
                  value={passCriteria}
                  onChangeText={setPassCriteria}
                  keyboardType="number-pad"
                  style={styles.input}
                  placeholder="80"
                  placeholderTextColor={palette.neutral400}
                  maxFontSizeMultiplier={1.15}
                />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: spacing.md }]}>
              {t('examFieldMaxScore').toUpperCase()}
            </Text>
            <TextInput
              value={maxScore}
              onChangeText={setMaxScore}
              keyboardType="number-pad"
              style={styles.input}
              placeholder="100"
              placeholderTextColor={palette.neutral400}
              maxFontSizeMultiplier={1.15}
            />

            <View style={styles.toggleRow}>
              <View style={styles.toggleBody}>
                <Text style={styles.toggleTitle} maxFontSizeMultiplier={1.15}>
                  {t('examFieldRandomizeQuestions')}
                </Text>
                <Text style={styles.toggleSub} maxFontSizeMultiplier={1.15}>
                  {t('examFieldRandomizeQuestionsSub')}
                </Text>
              </View>
              <Switch
                value={randomizeQuestions}
                onValueChange={setRandomizeQuestions}
                trackColor={{ false: palette.neutral200, true: Brand.green }}
                thumbColor={palette.white}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleBody}>
                <Text style={styles.toggleTitle} maxFontSizeMultiplier={1.15}>
                  {t('examFieldRandomizeOptions')}
                </Text>
                <Text style={styles.toggleSub} maxFontSizeMultiplier={1.15}>
                  {t('examFieldRandomizeOptionsSub')}
                </Text>
              </View>
              <Switch
                value={randomizeOptions}
                onValueChange={setRandomizeOptions}
                trackColor={{ false: palette.neutral200, true: Brand.green }}
                thumbColor={palette.white}
              />
            </View>

            {/* SECTION: Questions */}
            <Text style={[styles.section, { marginTop: spacing.lg }]} maxFontSizeMultiplier={1.2}>
              {t('examSectionQuestions').toUpperCase()}
            </Text>

            <Text style={styles.label}>{t('examFieldQuestionsInExam').toUpperCase()}</Text>
            <Text style={styles.hint} maxFontSizeMultiplier={1.15}>
              {t('examFieldQuestionsHint', { category: categoryLabel(category, t) })}
            </Text>
            {filteredQuestions.length === 0 ? (
              <View style={styles.emptyQuestions}>
                <Text style={styles.emptyQuestionsText} maxFontSizeMultiplier={1.15}>
                  {t('examFieldQuestionsEmpty', { category: categoryLabel(category, t) })}
                </Text>
              </View>
            ) : (
              <View style={styles.questionsList}>
                {filteredQuestions.map((q) => {
                  const on = !!selected[q.id];
                  return (
                    <AppPressable
                      key={q.id}
                      onPress={() => toggleQuestion(q.id)}
                      style={[styles.questionRow, on && styles.questionRowOn]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={q.text}>
                      <View style={[styles.checkbox, on && styles.checkboxOn]}>
                        {on ? <Ionicons name="checkmark" size={14} color={palette.white} /> : null}
                      </View>
                      <Text
                        style={[styles.questionText, on && styles.questionTextOn]}
                        numberOfLines={3}
                        maxFontSizeMultiplier={1.15}>
                        {q.text}
                      </Text>
                    </AppPressable>
                  );
                })}
              </View>
            )}

            {mode === 'edit' && onDelete ? (
              <View style={styles.dangerCard}>
                <Text style={styles.dangerTitle} maxFontSizeMultiplier={1.2}>
                  {t('examDangerZone').toUpperCase()}
                </Text>
                <Text style={styles.dangerBody} maxFontSizeMultiplier={1.15}>
                  {t('examDangerZoneBody')}
                </Text>
                <AppPressable
                  onPress={() => void onConfirmDelete()}
                  disabled={deleting || !canDelete}
                  style={[styles.deleteBtn, (deleting || !canDelete) && styles.deleteBtnDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel={t('examDeletePermanently')}>
                  <Ionicons name="trash-outline" size={14} color="#B91C1C" />
                  <Text style={styles.deleteBtnText} maxFontSizeMultiplier={1.15}>
                    {t('examDeletePermanently').toUpperCase()}
                  </Text>
                </AppPressable>
              </View>
            ) : null}

            {errorMsg ? (
              <Text style={styles.errorText} maxFontSizeMultiplier={1.15}>
                {errorMsg}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <AppPressable
              onPress={onClose}
              style={styles.cancelBtn}
              accessibilityRole="button"
              accessibilityLabel={t('examActionCancel')}>
              <Text style={styles.cancelText} maxFontSizeMultiplier={1.15}>
                {t('examActionCancel').toUpperCase()}
              </Text>
            </AppPressable>
            <AppPressable
              onPress={() => void onSave()}
              disabled={submitting}
              style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting }}
              accessibilityLabel={primaryLabel}>
              <Text style={styles.saveText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {primaryLabel.toUpperCase()}
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
    maxHeight: '92%',
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutral200,
  },
  headerTitle: {
    flex: 1,
    ...typography.subtitle,
    fontWeight: '700',
    color: FormColors.title,
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
  section: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: Brand.green,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: palette.neutral400,
    marginBottom: spacing.xs,
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
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    color: FormColors.subtitle,
    marginBottom: spacing.sm,
  },

  row2: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  col2: {
    flex: 1,
  },

  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: palette.neutral100,
    borderRadius: radius.md,
    minHeight: touchTarget.min,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: FormColors.title,
  },
  selectMenu: {
    marginTop: spacing.xs,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    overflow: 'hidden',
  },
  selectMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  /* chips (audience) */
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.neutral200,
    backgroundColor: palette.white,
  },
  chipOn: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: FormColors.title,
    letterSpacing: 0.2,
  },
  chipTextOn: {
    color: palette.white,
  },

  /* toggles */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.neutral200,
  },
  toggleBody: {
    flex: 1,
    minWidth: 0,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: FormColors.title,
  },
  toggleSub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: FormColors.subtitle,
  },

  /* questions list */
  emptyQuestions: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.neutral200,
    backgroundColor: palette.neutral50,
  },
  emptyQuestionsText: {
    fontSize: 13,
    color: palette.neutral500,
    fontWeight: '500',
  },
  questionsList: {
    gap: spacing.xs,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.neutral200,
    backgroundColor: palette.white,
  },
  questionRowOn: {
    borderColor: Brand.green,
    backgroundColor: palette.rowActiveWash,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: palette.neutral300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  questionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: FormColors.title,
    fontWeight: '600',
  },
  questionTextOn: {
    color: FormColors.title,
  },

  /* danger zone */
  dangerCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FEF2F2',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FECACA',
    gap: spacing.xs,
  },
  dangerTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#B91C1C',
  },
  dangerBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7F1D1D',
    fontWeight: '500',
  },
  deleteBtn: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    height: 42,
    borderRadius: radius.lg,
    backgroundColor: palette.white,
    borderWidth: 1.2,
    borderColor: '#DC2626',
  },
  deleteBtnDisabled: {
    opacity: 0.55,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
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
  saveBtn: {
    flex: 2,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
