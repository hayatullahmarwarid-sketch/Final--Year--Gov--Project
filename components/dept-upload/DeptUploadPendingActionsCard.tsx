import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ApproveDecreeModal,
  DeleteDecreeConfirmModal,
  PendingEditDecreeModal,
  RejectDecreeModal,
} from '@/components/dept-upload/PendingDecreeModals';
import { buildRejectActivityEntry } from '@/components/dept-upload/decrees-activity-helpers';
import { decreeRowDisplayStatus } from '@/components/dept-upload/decrees-table-model';
import { DecreeStatusPill } from '@/components/dept-upload/DecreeStatusPill';
import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { useDeptUploadWorkspace } from '@/contexts/dept-upload-workspace-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import {
  archiveDecree,
  listDecrees,
  patchDecree,
  publishDecree,
  type DecreeCategory,
  type LocalizedContentBlock,
  type SerializedDecree,
} from '@/lib/api/decree-upload';
import { showToast } from '@/lib/adapters/toast';
import type { AppLanguageId } from '@/constants/languages';
import { formatDecreeNumberLabelLocalized } from '@/lib/decree-number-format';
import { pickPublicDecreeTitleFromRow } from '@/lib/decree-title-typography';

import { DeptUploadDash } from '@/constants/dept-upload-dashboard';

export type PendingActionRow = {
  id: string;
  num: string;
  displayTitle: string;
  fullTitle: string;
  status: 'rejected' | 'pending' | 'draft';
  date: string;
  categoryId: string;
  notes: string;
};

function truncateDisplay(s: string, max = 22): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

/** Serialize an API decree into the compact row shape rendered by this card. */
function toRow(d: SerializedDecree, t: (key: string, options?: Record<string, unknown>) => string, language: AppLanguageId): PendingActionRow {
  const numLabel = formatDecreeNumberLabelLocalized(d, language);
  const title =
    pickPublicDecreeTitleFromRow(
      {
        titleSummary: d.titleSummary,
        titlePs: d.titlePs,
        titleFa: d.titleFa,
        titleEn: d.titleEn,
      },
      language,
    ) || t('deptDecreeShortLabel', { label: numLabel });
  const date = d.updatedAt ? String(d.updatedAt).slice(0, 10) : '';
  const ui = decreeRowDisplayStatus(d);
  const status: PendingActionRow['status'] =
    ui === 'rejected' ? 'rejected' : ui === 'pending' ? 'pending' : 'draft';
  return {
    id: d.id,
    num: numLabel,
    fullTitle: title,
    displayTitle: truncateDisplay(title),
    status,
    date,
    categoryId: d.categoryIds[0] ?? '',
    notes:
      typeof d.activeDraftVersion?.changeSummary === 'string' ? d.activeDraftVersion.changeSummary : '',
  };
}

function DateCell({ date }: { date: string }) {
  const c = useDeptUploadThemeColorsOptional();
  if (!date) {
    return (
      <View>
        <Text style={[styles.dateY, { color: c.textMuted }]}>—</Text>
      </View>
    );
  }
  const p = date.split('-');
  const y = p[0] ?? '';
  const md = p.length >= 3 ? `${p[1]}-${p[2]}` : date;
  return (
    <View>
      <Text style={[styles.dateY, { color: c.textMuted }]}>{y}</Text>
      <Text style={[styles.dateRest, { color: c.textMuted }]}>{md}</Text>
    </View>
  );
}

type Props = {
  categories: DecreeCategory[];
  /**
   * Parent-controlled refresh signal (e.g. dashboard reload timestamp).
   * When this changes, we refetch draft/pending rows so the list stays real-time.
   */
  refreshKey?: string;
};

export function DeptUploadPendingActionsCard({ categories, refreshKey }: Props) {
  const c = useDeptUploadThemeColorsOptional();
  const { t, number, language } = useAppTranslation();
  const { appendRejectActivity } = useDeptUploadWorkspace();
  const [rows, setRows] = useState<PendingActionRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const [a, b] = await Promise.all([
      listDecrees({ status: 'draft', limit: 50, sort: '-updatedAt' }),
      listDecrees({ status: 'pending', limit: 50, sort: '-updatedAt' }),
    ]);
    const merged: SerializedDecree[] = [];
    if (a.ok) merged.push(...a.items);
    if (b.ok) merged.push(...b.items);
    const by = new Map<string, SerializedDecree>();
    for (const d of merged) by.set(d.id, d);
    const list = [...by.values()].sort((p, q) => String(q.updatedAt ?? '').localeCompare(String(p.updatedAt ?? '')));
    setRows(list.map((d) => toRow(d, t, language)));
    setLoaded(true);
  }, [t, language]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const [editRow, setEditRow] = useState<PendingActionRow | null>(null);
  const [approveRow, setApproveRow] = useState<PendingActionRow | null>(null);
  const [rejectRow, setRejectRow] = useState<PendingActionRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PendingActionRow | null>(null);

  const badgeLabel = useMemo(() => t('deptPendingActionsCount', { count: number(rows.length) }), [rows.length, t, number]);

  const onDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const r = await archiveDecree(deleteTarget.id, { reason: 'Deleted from pending actions.' });
    if (!r.ok) {
      showToast(r.message, 'error');
      return;
    }
    showToast(t('deptRemoved'), 'success');
    setDeleteTarget(null);
    void reload();
  }, [deleteTarget, reload, t]);

  const onEditSave = useCallback(
    async (payload: {
      titlePs: string;
      titleFa: string;
      titleEn: string;
      categoryId: string;
      notes: string;
      localizedContent: LocalizedContentBlock[];
    }) => {
      if (!editRow) return;
      const r = await patchDecree(editRow.id, {
        titlePs: payload.titlePs,
        titleFa: payload.titleFa,
        titleEn: payload.titleEn,
        categoryIds: payload.categoryId ? [payload.categoryId] : undefined,
        draftVersion: {
          changeSummary: payload.notes || null,
          localizedContent: payload.localizedContent,
        },
      });
      if (!r.ok) {
        showToast(r.message, 'error');
        return;
      }
      showToast(t('deptDecreeUpdated'), 'success');
      setEditRow(null);
      void reload();
    },
    [editRow, reload, t],
  );

  const onApproveConfirm = useCallback(async () => {
    if (!approveRow) return;
    const r = await publishDecree(approveRow.id, {});
    if (!r.ok) {
      showToast(r.message, 'error');
      return;
    }
    showToast(t('deptDecreeApprovedPublished'), 'success');
    setApproveRow(null);
    void reload();
  }, [approveRow, reload, t]);

  const onRejectConfirm = useCallback(
    async (reason: string) => {
      if (!rejectRow) return;
      const r = await archiveDecree(rejectRow.id, { reason: reason.trim() || 'Rejected' });
      if (!r.ok) {
        showToast(r.message, 'error');
        return;
      }
      const catName = categories.find((c) => c.id === rejectRow.categoryId)?.name ?? '—';
      appendRejectActivity(
        buildRejectActivityEntry(
          {
            key: `rej-${rejectRow.id}-${Date.now()}`,
            decreeNum: rejectRow.num,
            fullTitle: rejectRow.fullTitle,
            categoryName: catName,
            reason,
          },
          t,
        ),
      );
      showToast(t('deptDecreeRejected'), 'success');
      setRejectRow(null);
      void reload();
    },
    [rejectRow, categories, appendRejectActivity, reload, t],
  );

  return (
    <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: c.textPrimary }]}>{t('deptPendingActionsTitle')}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{badgeLabel}</Text>
        </View>
      </View>

      {loaded && rows.length === 0 ? (
        <Text style={[styles.empty, { color: c.textMuted }]}>
          {t('deptPendingActionsEmpty')}
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tableInner}>
            <ScrollHeader />

            {rows.map((r) => (
              <View key={r.id} style={[styles.row, { borderBottomColor: c.rowDivider }]}>
                <Text style={[styles.colNum, { color: c.textPrimary }]}>{r.num}</Text>
                <Text style={[styles.colTitle, { color: c.textSecondary }]} numberOfLines={1}>
                  {r.displayTitle}
                </Text>
                <View style={styles.colStatus}>
                  <DecreeStatusPill status={r.status} />
                </View>
                <View style={styles.colDate}>
                  <DateCell date={r.date} />
                </View>
                <View style={styles.colAct}>
                  <Pressable hitSlop={8} onPress={() => setEditRow(r)} accessibilityLabel={t('a11yEdit')}>
                    <Ionicons name="pencil-outline" size={20} color="#0088FF" />
                  </Pressable>
                  {(r.status === 'rejected' || r.status === 'draft') && (
                    <Pressable
                      hitSlop={8}
                      onPress={() => setDeleteTarget(r)}
                      style={styles.iconGap}
                      accessibilityLabel={t('btnDelete')}>
                      <Ionicons name="trash-outline" size={18} color={c.textMuted} />
                    </Pressable>
                  )}
                  {(r.status === 'pending' || r.status === 'draft') && (
                    <>
                      <Pressable
                        hitSlop={8}
                        onPress={() => setApproveRow(r)}
                        style={styles.iconGap}
                        accessibilityLabel={t('btnConfirm')}>
                        <Ionicons name="checkmark-circle-outline" size={22} color="#10B981" />
                      </Pressable>
                      <Pressable
                        hitSlop={8}
                        onPress={() => setRejectRow(r)}
                        style={styles.iconGapSm}
                        accessibilityLabel={t('a11yReject')}>
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <PendingEditDecreeModal
        visible={editRow != null}
        decreeId={editRow?.id ?? null}
        categories={categories}
        onClose={() => setEditRow(null)}
        onSave={onEditSave}
      />

      <ApproveDecreeModal
        visible={approveRow != null}
        decreeNum={approveRow?.num ?? ''}
        onClose={() => setApproveRow(null)}
        onApprove={onApproveConfirm}
      />

      <RejectDecreeModal
        visible={rejectRow != null}
        decreeNum={rejectRow?.num ?? ''}
        onClose={() => setRejectRow(null)}
        onReject={onRejectConfirm}
      />

      <DeleteDecreeConfirmModal
        visible={deleteTarget != null}
        decreeNum={deleteTarget?.num ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDeleteConfirm}
      />
    </View>
  );
}

function ScrollHeader() {
  const c = useDeptUploadThemeColorsOptional();
  const { t } = useAppTranslation();
  return (
    <View style={[styles.headerRow, { borderBottomColor: c.cardBorder }]}>
      <View style={styles.hCellNum}>
        <Text style={[styles.hTxt, { color: c.textMuted }]}>#</Text>
        <Ionicons name="chevron-down" size={12} color={c.textMuted} />
      </View>
      <View style={styles.hCellTitle}>
        <Text style={[styles.hTxt, { color: c.textMuted }]}>{t('submissionsColTitle')}</Text>
        <Ionicons name="swap-vertical-outline" size={14} color={c.textMuted} />
      </View>
      <View style={styles.hCellStat}>
        <Text style={[styles.hTxt, { color: c.textMuted }]}>{t('systemAdminTableStatus')}</Text>
        <Ionicons name="swap-vertical-outline" size={14} color={c.textMuted} />
      </View>
      <View style={styles.hCellDate}>
        <Text style={[styles.hTxt, { color: c.textMuted }]}>{t('deptPreviewUploadDateLabel')}</Text>
        <Ionicons name="swap-vertical-outline" size={14} color={c.textMuted} />
      </View>
      <Text style={[styles.hTxt, styles.hAction, { color: c.textMuted }]}>{t('resultsColActions')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: DeptUploadDash.radiusLg,
    padding: 20,
    borderWidth: 1,
    ...DeptUploadDash.shadow,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  empty: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 18,
  },
  tableInner: {
    minWidth: 540,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hTxt: {
    fontSize: 11,
    fontWeight: '600',
  },
  hCellNum: {
    width: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  hCellTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  hCellStat: {
    width: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hCellDate: {
    width: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  hAction: {
    width: 112,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colNum: {
    width: 36,
    fontSize: 13,
    fontWeight: '700',
  },
  colTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 0,
    paddingRight: 6,
  },
  colStatus: {
    width: 88,
    alignItems: 'flex-start',
  },
  colDate: {
    width: 56,
  },
  dateY: {
    fontSize: 11,
    fontWeight: '500',
  },
  dateRest: {
    fontSize: 11,
    marginTop: 2,
  },
  colAct: {
    width: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconGap: { marginLeft: 8 },
  iconGapSm: { marginLeft: 6 },
});
