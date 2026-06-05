import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AssignmentSheet,
  type BulkAssignmentValue,
  type SingleAssignmentValue,
} from '@/components/inspector-admin/AssignmentSheet';
import { AppPressable } from '@/components/ui/AppPressable';
import type { Assignment } from '@/data/inspector-admin-store';
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

type TemplateLinkedDecree = {
  id: string;
  decreeVersionId: string;
  title: string;
};

type PriorityKey = Assignment['priority'];

const PRIORITY_PALETTE: Record<PriorityKey, { bg: string; fg: string; border: string }> = {
  low: { bg: palette.primaryWash, fg: palette.primaryShade2, border: palette.primaryWashBorder },
  medium: { bg: '#FFFBEB', fg: '#B45309', border: '#FDE68A' },
  high: { bg: '#FEF2F2', fg: '#DC2626', border: '#FECACA' },
  urgent: { bg: '#DC2626', fg: '#FFFFFF', border: '#DC2626' },
};

const STATUS_PALETTE: Record<string, { bg: string; fg: string; border: string }> = {
  pending: { bg: '#FEF9C3', fg: '#854D0E', border: '#FDE047' },
  in_progress: { bg: '#E0F2FE', fg: '#075985', border: '#7DD3FC' },
  submitted: { bg: '#DCFCE7', fg: '#166534', border: '#BBF7D0' },
  overdue: { bg: '#FEE2E2', fg: '#991B1B', border: '#FECACA' },
};

function priorityLabel(p: PriorityKey, t: (k: string) => string): string {
  return t(`priority${p.charAt(0).toUpperCase() + p.slice(1)}`);
}

function statusLabel(s: Assignment['status'], t: (k: string) => string): string {
  if (s === 'in_progress') return t('statusInProgress');
  if (s === 'pending') return t('statusPending');
  if (s === 'overdue') return t('statusOverdue');
  if (s === 'submitted') return t('statusSubmitted');
  return s;
}

export default function InspectorAdminAssignmentsScreen() {
  const { t } = useAppTranslation();
  const params = useLocalSearchParams<{ open?: string | string[] }>();
  const { assignments, templates, decreeCatalog, inspectors, usesLiveApi, actions, loading } =
    useInspectorAdminWorkspace();
  const rows = useMemo(
    () => [...assignments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [assignments],
  );

  const [mode, setMode] = useState<'closed' | 'single' | 'bulk'>('closed');

  useEffect(() => {
    const raw = params.open;
    const open = Array.isArray(raw) ? raw[0] : raw;
    if (open === 'bulk') {
      setMode('bulk');
      router.setParams({ open: '' });
    } else if (open === 'single') {
      setMode('single');
      router.setParams({ open: '' });
    }
  }, [params.open]);

  const templateDecreesByTemplateId = useMemo(() => {
    const byCatId = new Map(decreeCatalog.map((c) => [c.id, c] as const));
    const out = new Map<string, TemplateLinkedDecree[]>();
    for (const tpl of templates) {
      const mode = tpl.decreeSelectionMode ?? 'category';
      const categoryId = tpl.selectedCategoryId ?? '';
      const cat = categoryId ? byCatId.get(categoryId) : undefined;
      if (!cat) {
        out.set(tpl.id, []);
        continue;
      }
      if (mode === 'decrees') {
        const ids = new Set(tpl.selectedDecreeIds ?? []);
        out.set(
          tpl.id,
          cat.decrees
            .filter((d) => ids.has(d.id))
            .map((d) => ({ id: d.id, decreeVersionId: d.decreeVersionId, title: d.title })),
        );
      } else {
        out.set(
          tpl.id,
          cat.decrees.map((d) => ({ id: d.id, decreeVersionId: d.decreeVersionId, title: d.title })),
        );
      }
    }
    return out;
  }, [decreeCatalog, templates]);

  const onSingleSubmit = async (value: SingleAssignmentValue) => {
    if (!usesLiveApi) {
      showToast(t('inspectorAdminConnectApiForAssignments'), 'error');
      return { ok: false };
    }
    const picks = templateDecreesByTemplateId.get(value.templateId) ?? [];
    if (!picks.length) return { ok: false, message: t('assignmentErrorPickDecree') };
    let firstErr: string | null = null;
    let done = 0;
    for (const p of picks) {
      const r = await actions.createAssignment({
        decreeId: p.id,
        decreeVersionId: p.decreeVersionId,
        templateId: value.templateId,
        inspectorUserId: value.inspectorUserId,
        deadlineYmd: value.deadlineYmd,
        priority: value.priority,
        notes: '',
      });
      if (r.ok) done += 1;
      else if (!firstErr) firstErr = r.message;
    }
    if (!done) return { ok: false, message: firstErr ?? t('assignmentErrorPickDecree') };
    showToast(t('assignmentsCreated'), 'success');
    return { ok: true };
  };

  const onBulkSubmit = async (value: BulkAssignmentValue) => {
    if (!usesLiveApi) {
      showToast(t('inspectorAdminConnectApiForAssignments'), 'error');
      return { ok: false };
    }
    if (!value.inspectorUserIds.length) {
      return { ok: false, message: t('assignmentErrorPickDecree') };
    }
    let done = 0;
    const picks = templateDecreesByTemplateId.get(value.templateId) ?? [];
    const total = picks.length;
    if (!total) return { ok: false, message: t('assignmentErrorPickDecree') };
    let firstErr: string | null = null;
    for (const p of picks) {
      const r = await actions.createAssignment({
        decreeId: p.id,
        decreeVersionId: p.decreeVersionId,
        templateId: value.templateId,
        inspectorIds: value.inspectorUserIds,
        deadlineYmd: value.deadlineYmd,
        priority: value.priority,
        notes: '',
      });
      if (r.ok) {
        done += 1;
      } else if (!firstErr) {
        firstErr = r.message;
      }
    }
    if (done === 0) {
      return { ok: false, message: firstErr ?? t('assignmentErrorPickDecree') };
    }
    if (done < total) {
      showToast(t('assignmentsBulkPartial', { done, total }), 'success');
    } else {
      showToast(t('assignmentsBulkCreated', { count: done }), 'success');
    }
    return { ok: true };
  };

  const colWidths = {
    assignment: 180,
    inspector: 140,
    location: 180,
    priority: 100,
    deadline: 120,
    status: 120,
  };
  const tableMinWidth =
    colWidths.assignment +
    colWidths.inspector +
    colWidths.location +
    colWidths.priority +
    colWidths.deadline +
    colWidths.status;

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Text style={styles.heading} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {t('assignmentsHeading')}
        </Text>
        <View style={styles.toolbarActions}>
          <AppPressable
            onPress={() => setMode('bulk')}
            style={styles.btnSecondary}
            accessibilityRole="button"
            accessibilityLabel={t('assignmentsBulkAssign')}>
            <Ionicons name="layers-outline" size={16} color={Brand.green} />
            <Text style={styles.btnSecondaryTxt} maxFontSizeMultiplier={1.15}>
              {t('assignmentsBulkAssign')}
            </Text>
          </AppPressable>
          <AppPressable
            onPress={() => setMode('single')}
            style={styles.btnPrimary}
            accessibilityRole="button"
            accessibilityLabel={t('assignmentsSingle')}>
            <Ionicons name="person-add-outline" size={16} color={palette.white} />
            <Text style={styles.btnPrimaryTxt} maxFontSizeMultiplier={1.15}>
              {t('assignmentsSingle')}
            </Text>
          </AppPressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Brand.green} style={styles.loader} />
      ) : null}

      <View style={[styles.tableWrap, shadowCard()]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ minWidth: tableMinWidth }}>
          <View>
            <View style={styles.headerRow}>
              <Text
                style={[styles.headerCell, { width: colWidths.assignment }]}
                maxFontSizeMultiplier={1.2}>
                {t('assignmentsColAssignment').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.inspector }]}
                maxFontSizeMultiplier={1.2}>
                {t('assignmentsColInspector').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.location }]}
                maxFontSizeMultiplier={1.2}>
                {t('assignmentsColLocation').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.priority }]}
                maxFontSizeMultiplier={1.2}>
                {t('assignmentsColPriority').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.deadline }]}
                maxFontSizeMultiplier={1.2}>
                {t('assignmentsColDeadline').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.status }]}
                maxFontSizeMultiplier={1.2}>
                {t('assignmentsColStatus').toUpperCase()}
              </Text>
            </View>
            <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
              {rows.length === 0 ? (
                <View style={[styles.emptyBlock, { minWidth: tableMinWidth }]}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="clipboard-outline" size={24} color={palette.neutral400} />
                  </View>
                  <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.2}>
                    {t('assignmentsEmptyTitle')}
                  </Text>
                  <Text style={styles.emptySub} maxFontSizeMultiplier={1.2}>
                    {t('assignmentsEmptySub')}
                  </Text>
                </View>
              ) : (
                rows.map((item, idx) => {
                  const pPal = PRIORITY_PALETTE[item.priority];
                  const sPal = STATUS_PALETTE[item.status] ?? STATUS_PALETTE.pending;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.row,
                        idx === rows.length - 1 && styles.rowLast,
                      ]}>
                      <View style={[styles.cell, { width: colWidths.assignment }]}>
                        <Text
                          style={styles.assignmentTitle}
                          numberOfLines={3}
                          maxFontSizeMultiplier={1.15}>
                          {item.decreeTitle}
                        </Text>
                        <Text
                          style={styles.assignmentSub}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.15}>
                          {t('assignmentsTemplateId', { id: item.templateId }).toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: colWidths.inspector }]}>
                        <Text
                          style={styles.bodyText}
                          numberOfLines={2}
                          maxFontSizeMultiplier={1.15}>
                          {item.inspectorName}
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: colWidths.location }]}>
                        <Text
                          style={styles.bodyText}
                          numberOfLines={3}
                          maxFontSizeMultiplier={1.15}>
                          {item.region || '—'}
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: colWidths.priority }]}>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: pPal.bg, borderColor: pPal.border },
                          ]}>
                          <Text
                            style={[styles.badgeText, { color: pPal.fg }]}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.15}>
                            {priorityLabel(item.priority, t).toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.cell, { width: colWidths.deadline }]}>
                        <Text style={styles.bodyText} maxFontSizeMultiplier={1.15}>
                          {item.deadline}
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: colWidths.status }]}>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: sPal.bg, borderColor: sPal.border },
                          ]}>
                          <Text
                            style={[styles.badgeText, { color: sPal.fg }]}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.15}>
                            {statusLabel(item.status, t).toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      <AssignmentSheet
        mode="single"
        visible={mode === 'single'}
        templates={templates.filter((tpl) => tpl.status === 'active')}
        inspectors={inspectors}
        onClose={() => setMode('closed')}
        onSubmit={onSingleSubmit}
      />
      <AssignmentSheet
        mode="bulk"
        visible={mode === 'bulk'}
        templates={templates.filter((tpl) => tpl.status === 'active')}
        inspectors={inspectors}
        onClose={() => setMode('closed')}
        onSubmit={onBulkSubmit}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  heading: {
    ...typography.title,
    color: FormColors.title,
  },
  toolbarActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.neutral200,
    minHeight: touchTarget.min,
  },
  btnSecondaryTxt: {
    color: FormColors.title,
    fontSize: 13,
    fontWeight: '700',
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: Brand.green,
    minHeight: touchTarget.min,
  },
  btnPrimaryTxt: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '800',
  },

  loader: {
    marginTop: spacing.xs,
    alignSelf: 'center',
  },

  /* Table */
  tableWrap: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    overflow: 'hidden',
    flex: 1,
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
  tableBody: {
    flexGrow: 0,
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

  assignmentTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: FormColors.title,
  },
  assignmentSub: {
    marginTop: spacing.xxs,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: palette.neutral400,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
    color: FormColors.subtitle,
    fontWeight: '500',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  /* Empty */
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
