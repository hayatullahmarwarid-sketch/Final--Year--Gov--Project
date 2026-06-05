import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
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

import { AppPressable } from '@/components/ui/AppPressable';
import { CollapsibleFilters } from '@/components/ui/CollapsibleFilters';
import type { Question } from '@/data/inspector-admin-store';
import { useInspectorAdminStore } from '@/data/inspector-admin-store';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useInspectorAdminWorkspace } from '@/hooks/use-inspector-admin-workspace';
import { showToast } from '@/lib/adapters/toast';
import { optionLabelEquals, parseOptionLabels } from '@/lib/mcq-label-utils';
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

const TYPE_KEYS: Question['type'][] = ['MCQ', 'True/False'];
const DIFF_KEYS: Question['difficulty'][] = ['Easy', 'Medium', 'Hard'];

type BuilderState =
  | { mode: 'closed' }
  | { mode: 'add' }
  | { mode: 'edit'; question: Question };

function categoryLabel(key: string, t: TFunc): string {
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

function typeFilterLabel(key: Question['type'] | 'all', t: TFunc): string {
  if (key === 'all') return t('qbankFilterAllTypes');
  if (key === 'MCQ') return t('qbankTypeMcq');
  return t('qbankTypeTrueFalse');
}

function typeBadgeLabel(key: Question['type'], t: TFunc): string {
  if (key === 'MCQ') return t('qbankTypeBadgeMcq');
  return t('qbankTypeBadgeTF');
}

function diffLabel(key: Question['difficulty'], t: TFunc): string {
  if (key === 'Easy') return t('qbankDifficultyEasy');
  if (key === 'Medium') return t('qbankDifficultyMedium');
  return t('qbankDifficultyHard');
}

export default function InspectorAdminQuestionsScreen() {
  const { t, number } = useAppTranslation();
  const workspace = useInspectorAdminWorkspace();
  const local = useInspectorAdminStore();
  const { usesLiveApi, actions, decreeCatalog } = workspace;
  const questions = usesLiveApi ? workspace.questions : local.questions;
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | Question['type']>('all');
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [builder, setBuilder] = useState<BuilderState>({ mode: 'closed' });

  const rows = useMemo(() => {
    return questions.filter((q) => {
      if (categoryFilter !== 'all') {
        if (usesLiveApi && q.decreeCategoryId) {
          if (q.decreeCategoryId !== categoryFilter) return false;
        } else if (
          (q.decree || '').trim().toLowerCase() !== String(categoryFilter).toLowerCase()
        ) {
          return false;
        }
      }
      if (typeFilter !== 'all' && q.type !== typeFilter) return false;
      return true;
    });
  }, [questions, categoryFilter, typeFilter, usesLiveApi]);

  const openAdd = useCallback(() => setBuilder({ mode: 'add' }), []);
  const openEdit = useCallback((question: Question) => setBuilder({ mode: 'edit', question }), []);
  const closeBuilder = useCallback(() => setBuilder({ mode: 'closed' }), []);

  const onDelete = useCallback(
    (question: Question) => {
      Alert.alert(
        t('qbankDeleteConfirmTitle'),
        t('qbankDeleteConfirmBody'),
        [
          { text: t('btnCancel'), style: 'cancel' },
          {
            text: t('btnDelete'),
            style: 'destructive',
            onPress: async () => {
              if (usesLiveApi && question.questionSource === 'bank') {
                const r = await actions.deleteQuestionBankEntry(question.id);
                if (!r.ok) {
                  showToast(r.message, 'error');
                  return;
                }
                showToast(t('qbankDeleted'), 'success');
                return;
              }
              if (usesLiveApi && question.examId) {
                const r = await actions.deleteQuestion(question.examId, question.id);
                if (!r.ok) {
                  showToast(r.message, 'error');
                  return;
                }
              } else {
                const { inspectorAdminActions } = await import('@/data/inspector-admin-store');
                inspectorAdminActions.deleteQuestion(question.id);
              }
              showToast(t('qbankDeleted'), 'success');
            },
          },
        ],
        { cancelable: true },
      );
    },
    [actions, t, usesLiveApi],
  );

  const onSubmit = useCallback(
    async (value: {
      text: string;
      type: Question['type'];
      difficulty: Question['difficulty'];
      options?: string[];
      correctAnswer: string;
      correctAnswerKeys?: string[];
      explanation: string;
      active: boolean;
      decree: string;
    }) => {
      const { inspectorAdminActions } = await import('@/data/inspector-admin-store');
      if (usesLiveApi) {
        const match = decreeCatalog.find((c) => c.name === value.decree);
        if (!match) {
          showToast(t('qbankCategoryInvalid'), 'error');
          return { ok: false };
        }
        if (builder.mode === 'edit') {
          const r = await actions.updateQuestionBankEntry(builder.question.id, {
            decreeCategoryId: match.id,
            text: value.text,
            type: value.type,
            options: value.options,
            correctAnswer: value.correctAnswer,
            correctAnswerKeys: value.correctAnswerKeys,
            explanation: value.explanation || undefined,
            isActive: value.active,
          });
          if (!r.ok) return { ok: false, message: r.message };
          showToast(t('qbankSaved'), 'success');
          return { ok: true };
        }
        const r = await actions.createQuestionBankEntry({
          decreeCategoryId: match.id,
          text: value.text,
          type: value.type,
          options: value.options,
          correctAnswer: value.correctAnswer,
          correctAnswerKeys: value.correctAnswerKeys,
          explanation: value.explanation || undefined,
          isActive: value.active,
        });
        if (!r.ok) return { ok: false, message: r.message };
        showToast(t('qbankSaved'), 'success');
        return { ok: true };
      }
      if (builder.mode === 'edit') {
        inspectorAdminActions.updateQuestion(builder.question.id, {
          text: value.text,
          type: value.type,
          options: value.options,
          correctAnswer: value.correctAnswer,
          correctAnswerKeys: value.correctAnswerKeys,
          explanation: value.explanation || undefined,
          points: 1,
          ordering: 0,
          active: value.active,
          decree: value.decree,
          difficulty: value.difficulty,
        });
        showToast(t('qbankSaved'), 'success');
        return { ok: true };
      }
      inspectorAdminActions.addQuestion({
        text: value.text,
        type: value.type,
        options: value.options,
        correctAnswer: value.correctAnswer,
        correctAnswerKeys: value.correctAnswerKeys,
        explanation: value.explanation || undefined,
        points: 1,
        ordering: 0,
        active: value.active,
        decree: value.decree,
        difficulty: value.difficulty,
      });
      showToast(t('qbankSaved'), 'success');
      return { ok: true };
    },
    [builder, t, usesLiveApi, actions, decreeCatalog],
  );

  const totalCount = questions.length;
  const shownCount = rows.length;

  const filterActiveCount =
    (categoryFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0);

  const resetQuestionFilters = useCallback(() => {
    setCategoryFilter('all');
    setTypeFilter('all');
    setCatMenuOpen(false);
    setTypeMenuOpen(false);
  }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
        {t('qbankHeading')}
      </Text>

      <AppPressable
        onPress={openAdd}
        style={styles.addBtn}
        accessibilityRole="button"
        accessibilityLabel={t('qbankAdd')}>
        <Ionicons name="add" size={18} color={palette.white} />
        <Text style={styles.addBtnTxt} maxFontSizeMultiplier={1.15}>
          {t('qbankAdd')}
        </Text>
      </AppPressable>

      <CollapsibleFilters
        style={styles.filterCard}
        summary={t('qbankShowing', { shown: number(shownCount), total: number(totalCount) })}
        activeCount={filterActiveCount}
        onReset={resetQuestionFilters}
        resetDisabled={filterActiveCount === 0}>
        <Text style={styles.filterLabel} maxFontSizeMultiplier={1.2}>
          {t('qbankFilterCategory').toUpperCase()}
        </Text>
        <AppPressable
          onPress={() => {
            setCatMenuOpen((v) => !v);
            setTypeMenuOpen(false);
          }}
          style={styles.select}
          accessibilityRole="button"
          accessibilityState={{ expanded: catMenuOpen }}>
          <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {categoryFilter === 'all'
              ? t('qbankFilterAllCategories')
              : usesLiveApi && decreeCatalog.length > 0
                ? decreeCatalog.find((c) => c.id === categoryFilter)?.name ?? '—'
                : categoryLabel(categoryFilter, t)}
          </Text>
          <Ionicons
            name={catMenuOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={FormColors.subtitle}
          />
        </AppPressable>
        {catMenuOpen ? (
          <View style={[styles.selectMenu, shadowCard()]}>
            <AppPressable
              onPress={() => {
                setCategoryFilter('all');
                setCatMenuOpen(false);
              }}
              style={[styles.selectMenuRow, categoryFilter === 'all' && styles.selectMenuRowActive]}
              accessibilityRole="button">
              <Text
                style={[
                  styles.selectMenuText,
                  categoryFilter === 'all' && styles.selectMenuTextActive,
                ]}>
                {t('qbankFilterAllCategories')}
              </Text>
            </AppPressable>
            {(usesLiveApi && decreeCatalog.length > 0 ? decreeCatalog : null)
              ? decreeCatalog.map((c) => {
                  const on = categoryFilter === c.id;
                  return (
                    <AppPressable
                      key={c.id}
                      onPress={() => {
                        setCategoryFilter(c.id);
                        setCatMenuOpen(false);
                      }}
                      style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}>
                      <Text style={[styles.selectMenuText, on && styles.selectMenuTextActive]}>
                        {c.name}
                      </Text>
                    </AppPressable>
                  );
                })
              : CATEGORY_KEYS.map((key) => {
                  const on = categoryFilter === key;
                  return (
                    <AppPressable
                      key={key}
                      onPress={() => {
                        setCategoryFilter(key);
                        setCatMenuOpen(false);
                      }}
                      style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}>
                      <Text style={[styles.selectMenuText, on && styles.selectMenuTextActive]}>
                        {categoryLabel(key, t)}
                      </Text>
                    </AppPressable>
                  );
                })}
          </View>
        ) : null}

        <Text style={[styles.filterLabel, { marginTop: spacing.sm }]} maxFontSizeMultiplier={1.2}>
          {t('qbankFilterType').toUpperCase()}
        </Text>
        <AppPressable
          onPress={() => {
            setTypeMenuOpen((v) => !v);
            setCatMenuOpen(false);
          }}
          style={styles.select}
          accessibilityRole="button"
          accessibilityState={{ expanded: typeMenuOpen }}>
          <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {typeFilterLabel(typeFilter, t)}
          </Text>
          <Ionicons
            name={typeMenuOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={FormColors.subtitle}
          />
        </AppPressable>
        {typeMenuOpen ? (
          <View style={[styles.selectMenu, shadowCard()]}>
            <AppPressable
              onPress={() => {
                setTypeFilter('all');
                setTypeMenuOpen(false);
              }}
              style={[styles.selectMenuRow, typeFilter === 'all' && styles.selectMenuRowActive]}
              accessibilityRole="button">
              <Text
                style={[styles.selectMenuText, typeFilter === 'all' && styles.selectMenuTextActive]}>
                {t('qbankFilterAllTypes')}
              </Text>
            </AppPressable>
            {TYPE_KEYS.map((type) => {
              const on = typeFilter === type;
              return (
                <AppPressable
                  key={type}
                  onPress={() => {
                    setTypeFilter(type);
                    setTypeMenuOpen(false);
                  }}
                  style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}>
                  <Text style={[styles.selectMenuText, on && styles.selectMenuTextActive]}>
                    {typeFilterLabel(type, t)}
                  </Text>
                </AppPressable>
              );
            })}
          </View>
        ) : null}
      </CollapsibleFilters>

      <FlatList
        data={rows}
        keyExtractor={(q) => q.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="help-circle-outline" size={22} color={palette.neutral400} />
            </View>
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.2}>
              {totalCount === 0 ? t('qbankEmptyTitle') : t('qbankEmptyFiltered')}
            </Text>
            <Text style={styles.emptySub} maxFontSizeMultiplier={1.2}>
              {t('qbankEmptySub')}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isActive = item.active !== false;
          return (
          <View style={[styles.qCard, shadowCard(), !isActive && styles.qCardInactive]}>
            <View style={styles.qTop}>
              <View style={styles.catTag}>
                <Text style={styles.catTagLabel} maxFontSizeMultiplier={1.15}>
                  {t('qbankCategoryLabel').toUpperCase()}
                </Text>
                <Text style={styles.catTagText} maxFontSizeMultiplier={1.15}>
                  {(item.decree || 'General').toUpperCase()}
                </Text>
              </View>
              <View style={styles.qTopBadges}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText} maxFontSizeMultiplier={1.15}>
                    {typeBadgeLabel(item.type, t).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.diffBadge} maxFontSizeMultiplier={1.15}>
                  {diffLabel(item.difficulty, t).toUpperCase()}
                </Text>
                {!isActive ? (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText} maxFontSizeMultiplier={1.15}>
                      {t('qbankInactiveBadge').toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Text style={styles.qText} numberOfLines={3} maxFontSizeMultiplier={1.15}>
              {item.text}
            </Text>
            {item.correctAnswer ? (
              <View style={styles.ansRow}>
                <Ionicons name="checkmark-circle" size={14} color={Brand.green} />
                <Text style={styles.ansText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                  {t('qbankAnsPrefix', { value: item.correctAnswer })}
                </Text>
              </View>
            ) : null}
            {item.explanation ? (
              <View style={styles.qMetaRow}>
                <Text style={styles.qMetaText} numberOfLines={2} maxFontSizeMultiplier={1.15}>
                  {t('qbankExplanationFlag')}: {item.explanation}
                </Text>
              </View>
            ) : null}
            <View style={styles.qActions}>
              <AppPressable
                onPress={() => openEdit(item)}
                style={styles.linkAction}
                accessibilityRole="button"
                accessibilityLabel={t('qbankEdit')}>
                <Text style={styles.linkActionTxt} maxFontSizeMultiplier={1.15}>
                  {t('qbankEdit').toUpperCase()}
                </Text>
              </AppPressable>
              <AppPressable
                onPress={() => onDelete(item)}
                style={styles.linkAction}
                accessibilityRole="button"
                accessibilityLabel={t('qbankDelete')}>
                <Text style={styles.linkActionDanger} maxFontSizeMultiplier={1.15}>
                  {t('qbankDelete').toUpperCase()}
                </Text>
              </AppPressable>
            </View>
          </View>
          );
        }}
      />

      <QuestionBuilderSheet
        visible={builder.mode !== 'closed'}
        mode={builder.mode === 'edit' ? 'edit' : 'add'}
        initial={builder.mode === 'edit' ? builder.question : undefined}
        decreeCategoryNames={
          usesLiveApi && decreeCatalog.length > 0 ? decreeCatalog.map((c) => c.name) : undefined
        }
        onClose={closeBuilder}
        onSubmit={onSubmit}
      />
    </View>
  );
}

type BuilderSheetProps = {
  visible: boolean;
  mode: 'add' | 'edit';
  initial?: Question;
  /** When set, decree category dropdown uses these labels (API mode). */
  decreeCategoryNames?: string[];
  onClose: () => void;
  onSubmit: (value: {
    text: string;
    type: Question['type'];
    difficulty: Question['difficulty'];
    options?: string[];
    correctAnswer: string;
    correctAnswerKeys?: string[];
    explanation: string;
    active: boolean;
    decree: string;
  }) => Promise<{ ok: boolean; message?: string }>;
};

function QuestionBuilderSheet({
  visible,
  mode,
  initial,
  decreeCategoryNames,
  onClose,
  onSubmit,
}: BuilderSheetProps) {
  const { t } = useAppTranslation();
  const [text, setText] = useState('');
  const [type, setType] = useState<Question['type']>('MCQ');
  const [typeOpen, setTypeOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Question['difficulty']>('Medium');
  const [difficultyOpen, setDifficultyOpen] = useState(false);
  const [options, setOptions] = useState('');
  const [decree, setDecree] = useState<string>('Economy');
  const [decreeOpen, setDecreeOpen] = useState(false);
  const [correct, setCorrect] = useState('');
  const [additionalCorrect, setAdditionalCorrect] = useState('');
  const [explanation, setExplanation] = useState('');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setText(initial?.text ?? '');
    setType((initial?.type as Question['type']) ?? 'MCQ');
    setDifficulty((initial?.difficulty as Question['difficulty']) ?? 'Medium');
    setOptions(initial?.options && initial.options.length > 0 ? initial.options.join('\n') : '');
    setDecree(
      initial?.decree && initial.decree.trim()
        ? initial.decree
        : decreeCategoryNames && decreeCategoryNames.length > 0
          ? decreeCategoryNames[0]
          : 'Economy',
    );
    setCorrect(initial?.correctAnswer ?? '');
    if (initial?.correctAnswerKeys && initial.correctAnswer) {
      const rest = initial.correctAnswerKeys.filter((k) => !optionLabelEquals(k, initial.correctAnswer ?? ''));
      setAdditionalCorrect(rest.length > 0 ? rest.join('\n') : '');
    } else {
      setAdditionalCorrect('');
    }
    setExplanation(initial?.explanation ?? '');
    setActive(initial?.active !== false);
    setTypeOpen(false);
    setDifficultyOpen(false);
    setDecreeOpen(false);
    setSubmitting(false);
    setErrorMsg(null);
  }, [visible, initial, decreeCategoryNames]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setErrorMsg(null);
    const questionText = text.trim();
    if (!questionText) {
      setErrorMsg(t('qbankTextRequired'));
      return;
    }
    const ca = correct.trim();
    if (!ca) {
      setErrorMsg(t('qbankAnswerRequired'));
      return;
    }
    const opts = type === 'MCQ' ? parseOptionLabels(options) : undefined;
    if (type === 'MCQ' && (!opts || opts.length === 0)) {
      setErrorMsg(t('qbankMcqOptionsRequired'));
      return;
    }
    if (type === 'MCQ' && opts && opts.length > 26) {
      setErrorMsg(t('qbankMcqOptionsMax'));
      return;
    }
    const additionalForSubmit =
      type === 'MCQ' ? parseOptionLabels(additionalCorrect).filter((k) => !optionLabelEquals(k, ca)) : [];
    setSubmitting(true);
    const r = await onSubmit({
      text: questionText,
      type,
      difficulty,
      options: opts,
      correctAnswer: ca,
      correctAnswerKeys: additionalForSubmit.length > 0 ? additionalForSubmit : undefined,
      explanation: explanation.trim(),
      active,
      decree,
    });
    setSubmitting(false);
    if (!r.ok) {
      if (r.message) setErrorMsg(r.message);
      return;
    }
    onClose();
  }, [
    submitting,
    text,
    correct,
    additionalCorrect,
    type,
    options,
    difficulty,
    decree,
    explanation,
    active,
    onSubmit,
    onClose,
    t,
  ]);

  const title = mode === 'edit' ? t('qbankEditTitle') : t('qbankAddTitle');

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
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {title}
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
            contentContainerStyle={styles.sheetBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>{t('qbankQuestionLabel').toUpperCase()}</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={4}
              style={[styles.input, styles.textarea]}
              placeholder={t('qbankQuestionLabel')}
              placeholderTextColor={palette.neutral400}
              maxFontSizeMultiplier={1.15}
            />

            <Text style={[styles.label, { marginTop: spacing.md }]}>
              {t('qbankTypeLabel').toUpperCase()}
            </Text>
            <AppPressable
              onPress={() => {
                setTypeOpen((v) => !v);
                setDifficultyOpen(false);
                setDecreeOpen(false);
              }}
              style={styles.select}
              accessibilityRole="button"
              accessibilityState={{ expanded: typeOpen }}>
              <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {type === 'MCQ' ? 'MCQ' : 'True/False'}
              </Text>
              <Ionicons
                name={typeOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={FormColors.subtitle}
              />
            </AppPressable>
            {typeOpen ? (
              <View style={[styles.selectMenu, shadowCard()]}>
                {TYPE_KEYS.map((k) => {
                  const on = k === type;
                  return (
                    <AppPressable
                      key={k}
                      onPress={() => {
                        setType(k);
                        setTypeOpen(false);
                      }}
                      style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}>
                      <Text
                        style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                        numberOfLines={1}>
                        {k}
                      </Text>
                      {on ? <Ionicons name="checkmark" size={16} color={Brand.green} /> : null}
                    </AppPressable>
                  );
                })}
              </View>
            ) : null}

            <Text style={[styles.label, { marginTop: spacing.md }]}>
              {t('qbankDifficultyLabel').toUpperCase()}
            </Text>
            <AppPressable
              onPress={() => {
                setDifficultyOpen((v) => !v);
                setTypeOpen(false);
                setDecreeOpen(false);
              }}
              style={styles.select}
              accessibilityRole="button"
              accessibilityState={{ expanded: difficultyOpen }}>
              <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {diffLabel(difficulty, t)}
              </Text>
              <Ionicons
                name={difficultyOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={FormColors.subtitle}
              />
            </AppPressable>
            {difficultyOpen ? (
              <View style={[styles.selectMenu, shadowCard()]}>
                {DIFF_KEYS.map((k) => {
                  const on = k === difficulty;
                  return (
                    <AppPressable
                      key={k}
                      onPress={() => {
                        setDifficulty(k);
                        setDifficultyOpen(false);
                      }}
                      style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}>
                      <Text
                        style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                        numberOfLines={1}>
                        {diffLabel(k, t)}
                      </Text>
                      {on ? <Ionicons name="checkmark" size={16} color={Brand.green} /> : null}
                    </AppPressable>
                  );
                })}
              </View>
            ) : null}

            {type === 'MCQ' ? (
              <>
                <Text style={[styles.label, { marginTop: spacing.md }]}>
                  {t('qbankOptionsLabel').toUpperCase()}
                </Text>
                <Text style={styles.helperText} maxFontSizeMultiplier={1.15}>
                  {t('qbankOptionsHint')}
                </Text>
                <TextInput
                  value={options}
                  onChangeText={setOptions}
                  style={[styles.input, styles.textarea]}
                  multiline
                  textAlignVertical="top"
                  placeholder={t('qbankOptionsPlaceholder')}
                  placeholderTextColor={palette.neutral400}
                  maxFontSizeMultiplier={1.15}
                />
              </>
            ) : null}

            <Text style={[styles.label, { marginTop: spacing.md }]}>
              {t('qbankFilterCategory').toUpperCase()}
            </Text>
            <AppPressable
              onPress={() => {
                setDecreeOpen((v) => !v);
                setTypeOpen(false);
                setDifficultyOpen(false);
              }}
              style={styles.select}
              accessibilityRole="button"
              accessibilityState={{ expanded: decreeOpen }}>
              <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {decreeCategoryNames && decreeCategoryNames.length > 0 ? decree : categoryLabel(decree, t)}
              </Text>
              <Ionicons
                name={decreeOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={FormColors.subtitle}
              />
            </AppPressable>
            {decreeOpen ? (
              <View style={[styles.selectMenu, shadowCard()]}>
                {decreeCategoryNames && decreeCategoryNames.length > 0
                  ? decreeCategoryNames.map((k) => {
                      const on = k === decree;
                      return (
                        <AppPressable
                          key={k}
                          onPress={() => {
                            setDecree(k);
                            setDecreeOpen(false);
                          }}
                          style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}>
                          <Text
                            style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                            numberOfLines={1}>
                            {k}
                          </Text>
                          {on ? <Ionicons name="checkmark" size={16} color={Brand.green} /> : null}
                        </AppPressable>
                      );
                    })
                  : CATEGORY_KEYS.map((k) => {
                      const on = k === decree;
                      return (
                        <AppPressable
                          key={k}
                          onPress={() => {
                            setDecree(k);
                            setDecreeOpen(false);
                          }}
                          style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}>
                          <Text
                            style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                            numberOfLines={1}>
                            {categoryLabel(k, t)}
                          </Text>
                          {on ? <Ionicons name="checkmark" size={16} color={Brand.green} /> : null}
                        </AppPressable>
                      );
                    })}
              </View>
            ) : null}

            <Text style={[styles.label, { marginTop: spacing.md }]}>
              {t('qbankCorrectAnswerLabel').toUpperCase()}
            </Text>
            <TextInput
              value={correct}
              onChangeText={setCorrect}
              style={styles.input}
              placeholder={type === 'True/False' ? 'True / False' : '—'}
              placeholderTextColor={palette.neutral400}
              maxFontSizeMultiplier={1.15}
            />

            {type === 'MCQ' ? (
              <>
                <Text style={[styles.label, { marginTop: spacing.md }]}>
                  {t('qbankAdditionalCorrectLabel').toUpperCase()}
                </Text>
                <Text style={styles.helperText} maxFontSizeMultiplier={1.15}>
                  {t('qbankAdditionalCorrectHint')}
                </Text>
                <TextInput
                  value={additionalCorrect}
                  onChangeText={setAdditionalCorrect}
                  style={[styles.input, styles.textarea]}
                  multiline
                  textAlignVertical="top"
                  placeholder={t('qbankAdditionalCorrectPlaceholderMcq')}
                  placeholderTextColor={palette.neutral400}
                  maxFontSizeMultiplier={1.15}
                />
              </>
            ) : null}

            <Text style={[styles.label, { marginTop: spacing.md }]}>
              {t('qbankExplanationLabel').toUpperCase()}
            </Text>
            <Text style={styles.helperText} maxFontSizeMultiplier={1.15}>
              {t('qbankExplanationHint')}
            </Text>
            <TextInput
              value={explanation}
              onChangeText={setExplanation}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textarea]}
              placeholder={t('qbankExplanationPlaceholder')}
              placeholderTextColor={palette.neutral400}
              maxLength={8000}
              maxFontSizeMultiplier={1.15}
            />

            <View style={styles.activeToggleRow}>
              <View style={styles.toggleBody}>
                <Text style={styles.toggleTitle} maxFontSizeMultiplier={1.15}>
                  {t('qbankActiveLabel')}
                </Text>
                <Text style={styles.toggleSub} maxFontSizeMultiplier={1.15}>
                  {t('qbankActiveSub')}
                </Text>
              </View>
              <Switch
                value={active}
                onValueChange={setActive}
                trackColor={{ false: palette.neutral200, true: Brand.green }}
                thumbColor={palette.white}
              />
            </View>

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
              accessibilityLabel={t('btnCancel')}>
              <Text style={styles.cancelBtnTxt} maxFontSizeMultiplier={1.15}>
                {t('btnCancel').toUpperCase()}
              </Text>
            </AppPressable>
            <AppPressable
              onPress={() => void handleSubmit()}
              disabled={submitting}
              style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting }}>
              <Text style={styles.saveBtnTxt} maxFontSizeMultiplier={1.15}>
                {t('btnSave').toUpperCase()}
              </Text>
            </AppPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: FormColors.pageMuted,
  },
  heading: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    ...typography.title,
    color: FormColors.title,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: Brand.green,
  },
  addBtnTxt: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  filterCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    zIndex: 20,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: palette.neutral400,
    marginBottom: spacing.xxs,
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

  /* Question cards */
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  qCard: {
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    gap: spacing.xs,
  },
  qTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  catTag: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(22, 101, 52, 0.28)',
    backgroundColor: palette.rowActiveWash,
    alignItems: 'flex-start',
  },
  catTagLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: palette.neutral500,
  },
  catTagText: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: Brand.green,
  },
  qTopBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#B45309',
  },
  diffBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: palette.neutral400,
  },
  qText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: FormColors.title,
  },
  ansRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  ansText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.green,
  },
  qActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxs,
  },
  linkAction: {
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.xs,
  },
  linkActionTxt: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: Brand.green,
  },
  linkActionDanger: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#B91C1C',
  },

  /* Empty state */
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
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
    marginBottom: spacing.xs,
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

  /* Builder sheet */
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutral200,
  },
  sheetTitle: {
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
  sheetBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  label: {
    fontSize: 11,
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
    minHeight: 92,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
    color: FormColors.subtitle,
    marginBottom: spacing.xs,
  },
  row2: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  col2: {
    flex: 1,
  },
  activeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
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
  qCardInactive: {
    opacity: 0.65,
    backgroundColor: palette.neutral50,
  },
  qMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  qMetaText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: palette.neutral500,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.neutral400,
  },
  inactiveBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FECACA',
    backgroundColor: '#FEE2E2',
  },
  inactiveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#991B1B',
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
  cancelBtnTxt: {
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
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnTxt: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
