import { Ionicons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import {
  ExamBuilderSheet,
  type ExamBuilderValue,
} from '@/components/inspector-admin/ExamBuilderSheet';
import { AppPressable } from '@/components/ui/AppPressable';
import type { Exam } from '@/data/inspector-admin-store';
import { useInspectorAdminStore } from '@/data/inspector-admin-store';
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

type BuilderState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; exam: Exam };

const STATUS_PALETTE: Record<Exam['status'], { bg: string; fg: string; border: string }> = {
  published: { bg: '#DCFCE7', fg: '#166534', border: '#BBF7D0' },
  draft: { bg: '#F3F4F6', fg: '#4B5563', border: '#E5E7EB' },
  closed: { bg: '#FEE2E2', fg: '#991B1B', border: '#FECACA' },
};

function statusLabelKey(s: Exam['status']): string {
  if (s === 'published') return 'examStatusPublished';
  if (s === 'closed') return 'examStatusClosed';
  return 'examStatusDraft';
}

export default function InspectorAdminExamsScreen() {
  const { t, number } = useAppTranslation();
  const workspace = useInspectorAdminWorkspace();
  const refreshExams = workspace.refresh;
  const local = useInspectorAdminStore();
  const { usesLiveApi, actions, decreeCatalog } = workspace;
  const exams = usesLiveApi ? workspace.exams : local.exams;
  const questions = usesLiveApi ? workspace.questions : local.questions;
  const [builder, setBuilder] = useState<BuilderState>({ mode: 'closed' });

  const rows = useMemo(
    () => [...exams].sort((a, b) => a.title.localeCompare(b.title)),
    [exams],
  );

  const openCreate = useCallback(() => setBuilder({ mode: 'create' }), []);
  const openEdit = useCallback((exam: Exam) => setBuilder({ mode: 'edit', exam }), []);
  const closeBuilder = useCallback(() => setBuilder({ mode: 'closed' }), []);

  const onSubmit = useCallback(
    async (value: ExamBuilderValue) => {
      const liveCatalog =
        value.status === 'closed' ? 'archived' : value.status === 'published' ? 'published' : 'draft';
      if (usesLiveApi) {
        if (builder.mode === 'edit') {
          const r = await actions.patchExam(builder.exam.id, {
            title: value.title,
            description: value.description || undefined,
            timeLimitMinutes: value.timeLimit,
            passingScore: value.passCriteria,
            maxScore: value.maxScore,
            catalogStatus: liveCatalog,
            scheduledOpensAt: null,
            scheduledClosesAt: value.scheduledCloseAt || null,
            randomizeQuestions: value.randomizeQuestions,
            randomizeOptions: value.randomizeOptions,
            decreeCategoryId: value.decreeCategoryId,
          });
          if (!r.ok) return { ok: false, message: r.message };
          const { inspectorAdminApi } = await import('@/lib/api/inspector-admin');
          const exq = await inspectorAdminApi.listExamQuestions(builder.exam.id);
          if (exq.ok && exq.data) {
            const data = exq.data as { items?: { id: string }[] };
            for (const q of data.items ?? []) {
              const del = await inspectorAdminApi.deleteExamQuestion(builder.exam.id, q.id);
              if (!del.ok) return { ok: false, message: del.message };
            }
          }
          if (value.questionIds.length > 0) {
            const clone = await inspectorAdminApi.cloneBankQuestionsToExam(builder.exam.id, {
              bankQuestionIds: value.questionIds,
            });
            if (!clone.ok) return { ok: false, message: clone.message };
          }
          await refreshExams();
          showToast(t('examUpdatedOk'), 'success');
          return { ok: true };
        }
        const cr = await actions.createExam({
          title: value.title,
          description: value.description,
          decree: value.category,
          decreeCategoryId: value.decreeCategoryId,
          timeLimit: value.timeLimit,
          passCriteria: value.passCriteria,
          maxScore: value.maxScore,
          status: value.status,
          scheduledCloseAt: value.scheduledCloseAt || undefined,
          randomizeQuestions: value.randomizeQuestions,
          randomizeOptions: value.randomizeOptions,
        });
        if (!cr.ok) return { ok: false, message: cr.message };
        if (value.questionIds.length > 0) {
          const { inspectorAdminApi } = await import('@/lib/api/inspector-admin');
          const clone = await inspectorAdminApi.cloneBankQuestionsToExam(cr.examId, {
            bankQuestionIds: value.questionIds,
          });
          if (!clone.ok) return { ok: false, message: clone.message };
        }
        await refreshExams();
        showToast(t('examCreatedOk'), 'success');
        return { ok: true };
      }

      const { inspectorAdminActions } = await import('@/data/inspector-admin-store');
      if (builder.mode === 'edit') {
        inspectorAdminActions.updateExam(builder.exam.id, {
          title: value.title,
          description: value.description,
          decree: value.category,
          timeLimit: value.timeLimit,
          passCriteria: value.passCriteria,
          maxScore: value.maxScore,
          status: value.status,
          audienceRoleKeys: ['public'],
          scheduledCloseAt: value.scheduledCloseAt || undefined,
          randomizeQuestions: value.randomizeQuestions,
          randomizeOptions: value.randomizeOptions,
        });
        inspectorAdminActions.setExamQuestionIds(builder.exam.id, value.questionIds);
        showToast(t('examUpdatedOk'), 'success');
        return { ok: true };
      }
      inspectorAdminActions.addExam({
        title: value.title,
        description: value.description,
        decree: value.category,
        timeLimit: value.timeLimit,
        passCriteria: value.passCriteria,
        maxScore: value.maxScore,
        status: value.status,
        audienceRoleKeys: ['public'],
        scheduledCloseAt: value.scheduledCloseAt || undefined,
        randomizeQuestions: value.randomizeQuestions,
        randomizeOptions: value.randomizeOptions,
        questions: value.questionIds,
      });
      showToast(t('examCreatedOk'), 'success');
      return { ok: true };
    },
    [actions, builder, refreshExams, t, usesLiveApi],
  );

  const onDelete = useCallback(async () => {
    if (builder.mode !== 'edit') return { ok: false };
    const exam = builder.exam;
    if (usesLiveApi) {
      const r = await actions.patchExam(exam.id, { catalogStatus: 'archived' });
      if (!r.ok) return { ok: false, message: r.message };
      showToast(t('examArchivedLive'), 'success');
      return { ok: true };
    }
    const { inspectorAdminActions } = await import('@/data/inspector-admin-store');
    inspectorAdminActions.deleteExam(exam.id);
    showToast(t('examDeletedLocal'), 'success');
    return { ok: true };
  }, [actions, builder, t, usesLiveApi]);

  const confirmDelete = useCallback(() => {
    return new Promise<{ ok: boolean; message?: string }>((resolve) => {
      Alert.alert(
        t('examDeleteConfirmTitle'),
        t('examDeleteConfirmBody'),
        [
          { text: t('btnCancel'), style: 'cancel', onPress: () => resolve({ ok: false }) },
          {
            text: t('btnDelete'),
            style: 'destructive',
            onPress: async () => {
              const r = await onDelete();
              resolve(r);
            },
          },
        ],
        { cancelable: true, onDismiss: () => resolve({ ok: false }) },
      );
    });
  }, [onDelete, t]);

  const goResults = useCallback(() => {
    router.push('/inspector-admin/results' as Href);
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Text style={styles.heading} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {t('examsHeading')}
        </Text>
        <AppPressable
          onPress={openCreate}
          style={styles.createBtn}
          accessibilityRole="button"
          accessibilityLabel={t('examsBuildNew')}>
          <Ionicons name="add" size={18} color={palette.white} />
          <Text style={styles.createBtnTxt} maxFontSizeMultiplier={1.15}>
            {t('examsBuildNew')}
          </Text>
        </AppPressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(x) => x.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="school-outline" size={22} color={palette.neutral400} />
            </View>
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.2}>
              {t('examsEmptyTitle')}
            </Text>
            <Text style={styles.emptySub} maxFontSizeMultiplier={1.2}>
              {t('examsEmptySub')}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const pal = STATUS_PALETTE[item.status];
          const category = item.decree || 'General';
          const questionCountForMeta =
            typeof item.questionsCount === 'number' && !Number.isNaN(item.questionsCount)
              ? item.questionsCount
              : item.questions.length;
          return (
            <View style={[styles.card, shadowCard()]}>
              <View style={styles.cardTop}>
                <View style={styles.cardIcon}>
                  <Ionicons name="school-outline" size={20} color={Brand.green} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardBodyHead}>
                    <Text
                      style={styles.cardTitle}
                      numberOfLines={2}
                      maxFontSizeMultiplier={1.15}>
                      {item.title}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: pal.bg, borderColor: pal.border },
                      ]}>
                      <Text
                        style={[styles.statusBadgeText, { color: pal.fg }]}
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.15}>
                        {t(statusLabelKey(item.status)).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={styles.cardMeta}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.15}>
                    {t('examsMeta', {
                      category: category.toUpperCase(),
                      count: number(questionCountForMeta),
                      minutes: number(item.timeLimit),
                    }).toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <AppPressable
                  onPress={() => openEdit(item)}
                  style={styles.linkAction}
                  accessibilityRole="button"
                  accessibilityLabel={t('examsEditExam')}>
                  <Text style={styles.linkActionText} maxFontSizeMultiplier={1.15}>
                    {t('examsEditExam').toUpperCase()}
                  </Text>
                </AppPressable>
                <AppPressable
                  onPress={goResults}
                  style={styles.linkAction}
                  accessibilityRole="button"
                  accessibilityLabel={t('examsViewResults')}>
                  <Text style={styles.linkActionMuted} maxFontSizeMultiplier={1.15}>
                    {t('examsViewResults').toUpperCase()}
                  </Text>
                </AppPressable>
              </View>
            </View>
          );
        }}
      />

      <ExamBuilderSheet
        visible={builder.mode !== 'closed'}
        mode={builder.mode === 'edit' ? 'edit' : 'create'}
        initial={
          builder.mode === 'edit'
            ? {
                title: builder.exam.title,
                description: builder.exam.description ?? '',
                category: builder.exam.decree || 'Economy',
                decreeCategoryId: builder.exam.decreeCategoryId,
                status: builder.exam.status,
                audienceRoleKeys: ['public'],
                scheduledCloseAt: builder.exam.scheduledCloseAt ?? '',
                timeLimit: builder.exam.timeLimit,
                passCriteria: builder.exam.passCriteria,
                maxScore: builder.exam.maxScore ?? 100,
                randomizeQuestions: !!builder.exam.randomizeQuestions,
                randomizeOptions: !!builder.exam.randomizeOptions,
                questionIds: builder.exam.questions,
              }
            : undefined
        }
        decreeCategories={
          usesLiveApi && decreeCatalog.length > 0
            ? decreeCatalog.map((c) => ({ id: c.id, name: c.name }))
            : undefined
        }
        requireSelectedQuestions={usesLiveApi}
        questions={questions}
        canDelete={builder.mode === 'edit'}
        onClose={closeBuilder}
        onSubmit={onSubmit}
        onDelete={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: FormColors.pageMuted,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  heading: {
    flex: 1,
    ...typography.title,
    color: FormColors.title,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: Brand.green,
    borderRadius: radius.lg,
    minHeight: touchTarget.min,
  },
  createBtnTxt: {
    color: palette.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },

  empty: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.xs,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
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

  card: {
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    gap: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardBodyHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    color: FormColors.title,
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardMeta: {
    marginTop: spacing.xxs,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: palette.neutral400,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkAction: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
  linkActionText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: Brand.green,
  },
  linkActionMuted: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: FormColors.subtitle,
  },
});
