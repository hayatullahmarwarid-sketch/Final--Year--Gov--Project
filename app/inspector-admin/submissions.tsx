import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SubmissionReviewSheet } from '@/components/inspector-admin/SubmissionReviewSheet';
import { AppPressable } from '@/components/ui/AppPressable';
import { CollapsibleFilters } from '@/components/ui/CollapsibleFilters';
import {
  inspectionWindowDaysForAssignment,
  type Submission,
} from '@/data/inspector-admin-store';
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

type FilterKey = 'all' | Submission['status'];

const STATUS_PALETTE: Record<Submission['status'] | 'archived', { bg: string; fg: string; border: string }> = {
  pending: { bg: '#FEF9C3', fg: '#854D0E', border: '#FDE047' },
  approved: { bg: '#DCFCE7', fg: '#166534', border: '#BBF7D0' },
  revision: { bg: '#FEE2E2', fg: '#991B1B', border: '#FECACA' },
  archived: { bg: '#F3F4F6', fg: '#6B7280', border: '#E5E7EB' },
};

export default function InspectorAdminSubmissionsScreen() {
  const { t, number } = useAppTranslation();
  const { submissions, assignments, usesLiveApi, actions } = useInspectorAdminWorkspace();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const submissionsActiveCount =
    (query.trim() ? 1 : 0) + (filter !== 'all' ? 1 : 0);

  const resetSubmissionFilters = useCallback(() => {
    setQuery('');
    setFilter('all');
    setFilterOpen(false);
  }, []);
  const [detail, setDetail] = useState<Submission | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions
      .filter((s) => {
        if (filter !== 'all' && s.status !== filter) return false;
        if (!q) return true;
        return (
          s.title.toLowerCase().includes(q) ||
          s.inspector.toLowerCase().includes(q) ||
          (s.region ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [submissions, filter, query]);

  const colWidths = {
    title: 200,
    inspector: 140,
    compliance: 130,
    status: 120,
    action: 110,
  };
  const tableMinWidth =
    colWidths.title + colWidths.inspector + colWidths.compliance + colWidths.status + colWidths.action;

  const detailAssignment = detail ? assignments.find((a) => a.id === detail.assignmentId) : undefined;
  const maxDays = detailAssignment ? inspectionWindowDaysForAssignment(detailAssignment) : 5;

  const closeDetail = () => setDetail(null);

  const onApprove = async () => {
    if (!detail) return { ok: false };
    if (usesLiveApi) {
      const r = await actions.finalizeSubmission(detail.id);
      if (!r.ok) return { ok: false, message: r.message };
      return { ok: true };
    }
    const { inspectorAdminActions } = await import('@/data/inspector-admin-store');
    inspectorAdminActions.setSubmissionStatus(detail.id, 'approved');
    return { ok: true };
  };

  const onRevise = async (input: { daysAllowed: number; focusComment: string; maxDays: number }) => {
    if (!detail) return { ok: false };
    if (usesLiveApi) {
      const r = await actions.returnSubmission({
        submissionId: detail.id,
        daysAllowed: input.daysAllowed,
        focusComment: input.focusComment,
        maxDays: input.maxDays,
      });
      if (!r.ok) return { ok: false, message: r.message };
      return { ok: true };
    }
    const { inspectorAdminActions } = await import('@/data/inspector-admin-store');
    const r = inspectorAdminActions.requestSubmissionRevision({
      submissionId: detail.id,
      daysAllowed: input.daysAllowed,
      focusComment: input.focusComment,
    });
    if (!r.ok) return { ok: false, message: r.error };
    return { ok: true };
  };

  const onEvidenceRegistered = async (uri: string) => {
    if (!detail) return;
    if (!usesLiveApi) {
      const { inspectorAdminActions } = await import('@/data/inspector-admin-store');
      inspectorAdminActions.appendSubmissionEvidence(detail.id, uri);
    }
  };

  const filterLabels: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t('submissionsFilterAll') },
    { key: 'pending', label: t('submissionsFilterPending') },
    { key: 'approved', label: t('submissionsFilterApproved') },
    { key: 'revision', label: t('submissionsFilterRevision') },
  ];

  return (
    <View style={styles.root}>
      <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
        {t('submissionsHeading')}
      </Text>

      <CollapsibleFilters
        style={styles.filtersPanel}
        summary={t('qbankShowing', { shown: number(filtered.length), total: number(submissions.length) })}
        activeCount={submissionsActiveCount}
        onReset={resetSubmissionFilters}
        resetDisabled={submissionsActiveCount === 0}>
        <View style={styles.toolbarRowInner}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={palette.neutral400} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('submissionsSearchPlaceholder')}
              placeholderTextColor={palette.neutral400}
              style={styles.searchInput}
              maxFontSizeMultiplier={1.15}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <AppPressable
                onPress={() => setQuery('')}
                style={styles.searchClearBtn}
                accessibilityRole="button"
                accessibilityLabel={t('a11yClearSearch')}>
                <Ionicons name="close-circle" size={16} color={palette.neutral400} />
              </AppPressable>
            ) : null}
          </View>
          <View style={styles.filterWrap}>
            <AppPressable
              onPress={() => setFilterOpen((v) => !v)}
              style={styles.filterBtn}
              accessibilityRole="button"
              accessibilityState={{ expanded: filterOpen }}
              accessibilityLabel={t('submissionsFilterAll')}>
              <Ionicons name="funnel-outline" size={14} color={FormColors.title} />
              <Text style={styles.filterBtnText} maxFontSizeMultiplier={1.15}>
                {filterLabels.find((f) => f.key === filter)!.label.toUpperCase()}
              </Text>
            </AppPressable>
            {filterOpen ? (
              <View style={[styles.filterMenu, shadowCard()]}>
                {filterLabels.map((f) => {
                  const on = f.key === filter;
                  return (
                    <AppPressable
                      key={f.key}
                      onPress={() => {
                        setFilter(f.key);
                        setFilterOpen(false);
                      }}
                      style={[styles.filterMenuRow, on && styles.filterMenuRowActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}>
                      <Text
                        style={[styles.filterMenuText, on && styles.filterMenuTextActive]}
                        maxFontSizeMultiplier={1.15}>
                        {f.label}
                      </Text>
                      {on ? (
                        <Ionicons name="checkmark" size={14} color={Brand.green} />
                      ) : null}
                    </AppPressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>
      </CollapsibleFilters>

      {/* Table */}
      <View style={[styles.tableWrap, shadowCard()]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ minWidth: tableMinWidth }}>
          <View>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, { width: colWidths.title }]} maxFontSizeMultiplier={1.2}>
                {t('submissionsColTitle').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.inspector }]}
                maxFontSizeMultiplier={1.2}>
                {t('submissionsColInspector').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.compliance }]}
                maxFontSizeMultiplier={1.2}>
                {t('submissionsColCompliance').toUpperCase()}
              </Text>
              <Text style={[styles.headerCell, { width: colWidths.status }]} maxFontSizeMultiplier={1.2}>
                {t('submissionsColStatus').toUpperCase()}
              </Text>
              <Text style={[styles.headerCell, { width: colWidths.action }]} maxFontSizeMultiplier={1.2}>
                {t('submissionsColAction').toUpperCase()}
              </Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {filtered.length === 0 ? (
                <View style={[styles.emptyBlock, { minWidth: tableMinWidth }]}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="document-text-outline" size={22} color={palette.neutral400} />
                  </View>
                  <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.2}>
                    {t('submissionsEmptyTitle')}
                  </Text>
                  <Text style={styles.emptySub} maxFontSizeMultiplier={1.2}>
                    {filter === 'all' && !query
                      ? t('submissionsEmptySub')
                      : t('submissionsEmptyFiltered')}
                  </Text>
                </View>
              ) : (
                filtered.map((item, idx) => {
                  const pal = STATUS_PALETTE[item.status] ?? STATUS_PALETTE.pending;
                  return (
                    <View
                      key={item.id}
                      style={[styles.row, idx === filtered.length - 1 && styles.rowLast]}>
                      <View style={[styles.cell, { width: colWidths.title }]}>
                        <Text
                          style={styles.titleText}
                          numberOfLines={3}
                          maxFontSizeMultiplier={1.15}>
                          {item.title}
                        </Text>
                        <Text
                          style={styles.subMeta}
                          numberOfLines={2}
                          maxFontSizeMultiplier={1.15}>
                          {[item.region, item.date].filter(Boolean).join(' · ').toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: colWidths.inspector }]}>
                        <Text
                          style={styles.bodyText}
                          numberOfLines={2}
                          maxFontSizeMultiplier={1.15}>
                          {item.inspector}
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: colWidths.compliance }]}>
                        <Text style={styles.complianceText} maxFontSizeMultiplier={1.15}>
                          {number(Math.round(item.score))}%
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: colWidths.status }]}>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: pal.bg, borderColor: pal.border },
                          ]}>
                          <Text
                            style={[styles.badgeText, { color: pal.fg }]}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.15}>
                            {item.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.cell, { width: colWidths.action }]}>
                        <AppPressable
                          onPress={() => setDetail(item)}
                          style={styles.reviewBtn}
                          accessibilityRole="button"
                          accessibilityLabel={t('submissionsReview')}>
                          <Text style={styles.reviewBtnText} maxFontSizeMultiplier={1.1}>
                            {t('submissionsReview').toUpperCase()}
                          </Text>
                        </AppPressable>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      <SubmissionReviewSheet
        visible={!!detail}
        submission={detail}
        assignment={detailAssignment}
        maxDays={maxDays}
        registerEvidenceLive={usesLiveApi}
        onClose={closeDetail}
        onApprove={async () => {
          const r = await onApprove();
          if (!r.ok && r.message) {
            showToast(r.message, 'error');
          }
          return r;
        }}
        onRevise={async (input) => {
          const r = await onRevise(input);
          if (!r.ok && r.message) {
            showToast(r.message, 'error');
          }
          return r;
        }}
        onEvidenceRegistered={(uri) => void onEvidenceRegistered(uri)}
      />
    </View>
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

  /* Search + filter */
  filtersPanel: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    zIndex: 20,
  },
  toolbarRowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    height: touchTarget.min,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: FormColors.title,
    paddingVertical: 0,
  },
  searchClearBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterWrap: {
    position: 'relative',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm + 2,
    height: touchTarget.min,
    borderRadius: radius.xl,
    backgroundColor: palette.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: FormColors.title,
  },
  filterMenu: {
    position: 'absolute',
    top: touchTarget.min + 4,
    right: 0,
    minWidth: 160,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    overflow: 'hidden',
    zIndex: 30,
  },
  filterMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  filterMenuRowActive: {
    backgroundColor: palette.rowActiveWash,
  },
  filterMenuText: {
    fontSize: 14,
    fontWeight: '500',
    color: FormColors.title,
  },
  filterMenuTextActive: {
    color: Brand.green,
    fontWeight: '700',
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
  titleText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: FormColors.title,
  },
  subMeta: {
    marginTop: spacing.xxs,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: palette.neutral400,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
    color: FormColors.subtitle,
    fontWeight: '500',
  },
  complianceText: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.green,
    letterSpacing: 0.2,
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
  reviewBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.lg,
    backgroundColor: palette.neutral100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: FormColors.subtitle,
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
