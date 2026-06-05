import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buildRejectActivityEntry } from '@/components/dept-upload/decrees-activity-helpers';
import { DecreeManagementTable } from '@/components/dept-upload/DecreeManagementTable';
import {
  sortDecrees,
  type DecreeTableSortKey,
  type SortDir,
} from '@/components/dept-upload/decrees-table-model';
import {
  ApproveDecreeModal,
  DeleteDecreeConfirmModal,
  PendingEditDecreeModal,
  RejectDecreeModal,
} from '@/components/dept-upload/PendingDecreeModals';
import { UploadDecreeFormModal } from '@/components/dept-upload/UploadDecreeFormModal';
import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { useDeptUploadWorkspace } from '@/contexts/dept-upload-workspace-context';
import {
  archiveDecree,
  listCategories,
  listDecrees,
  patchDecree,
  publishDecree,
  type DecreeCategory,
  type LocalizedContentBlock,
  type SerializedDecree,
} from '@/lib/api/decree-upload';
import { showToast } from '@/lib/adapters/toast';
import { formatDecreeNumberLabel } from '@/lib/decree-number-format';
import { Brand, palette } from '@/lib/theme';
import { useAppTranslation } from '@/hooks/use-app-translation';

export default function DeptUploadDecreesScreen() {
  const { t } = useAppTranslation();
  const c = useDeptUploadThemeColorsOptional();
  const { appendRejectActivity } = useDeptUploadWorkspace();
  const [rows, setRows] = useState<SerializedDecree[]>([]);
  const [cats, setCats] = useState<DecreeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sortKey, setSortKey] = useState<DecreeTableSortKey>('num');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [editRow, setEditRow] = useState<SerializedDecree | null>(null);
  const [approveRow, setApproveRow] = useState<SerializedDecree | null>(null);
  const [rejectRow, setRejectRow] = useState<SerializedDecree | null>(null);
  const [deleteRow, setDeleteRow] = useState<SerializedDecree | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, c] = await Promise.all([listDecrees({ limit: 100, sort: '-updatedAt' }), listCategories({ limit: 100 })]);
    if (d.ok) setRows(d.items);
    else showToast(d.message, 'error');
    if (c.ok) setCats(c.items);
    else showToast(c.message, 'error');
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // After archiving, the API still returns the row with `status: 'archived'` until it's hard-deleted.
  // Hide archived rows from the management list so the trash action produces a visible removal.
  const visibleRows = useMemo(() => rows.filter((r) => r.status !== 'archived'), [rows]);
  const sortedRows = useMemo(() => sortDecrees(visibleRows, sortKey, sortDir), [visibleRows, sortKey, sortDir]);

  const onSort = useCallback(
    (key: DecreeTableSortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey],
  );

  const catName = useCallback(
    (d: SerializedDecree) => d.categories[0]?.name ?? cats.find((c) => c.id === d.categoryIds[0])?.name ?? '—',
    [cats],
  );

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
        categoryIds: [payload.categoryId],
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
      void load();
    },
    [editRow, load, t],
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
    void load();
  }, [approveRow, load, t]);

  const onRejectConfirm = useCallback(
    async (reason: string) => {
      if (!rejectRow) return;
      const r = await archiveDecree(rejectRow.id, { reason: reason.trim() || t('deptRejectVerb') });
      if (!r.ok) {
        showToast(r.message, 'error');
        return;
      }
      appendRejectActivity(
        buildRejectActivityEntry(
          {
            key: `rej-${rejectRow.id}-${Date.now()}`,
            decreeNum: formatDecreeNumberLabel(rejectRow),
            fullTitle: rejectRow.titleSummary,
            categoryName: catName(rejectRow),
            reason: reason.trim() || t('deptDecreeRejected'),
          },
          t,
        ),
      );
      showToast(t('deptDecreeRejected'), 'success');
      setRejectRow(null);
      void load();
    },
    [rejectRow, appendRejectActivity, catName, load, t],
  );

  const onDeleteConfirm = useCallback(async () => {
    if (!deleteRow) return;
    const r = await archiveDecree(deleteRow.id, { reason: t('deptRemovedFromQueueReason') });
    if (!r.ok) {
      showToast(r.message, 'error');
      return;
    }
    showToast(t('deptDecreeDeletedToast'), 'success');
    setDeleteRow(null);
    void load();
  }, [deleteRow, load, t]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.pageBg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: c.textPrimary }]}>{t('deptDecreeManagementScreenTitle')}</Text>

        <Pressable onPress={() => setUploadOpen(true)} style={styles.uploadBtn} accessibilityRole="button">
          <Ionicons name="add" size={20} color={palette.white} />
          <Text style={styles.uploadBtnTxt}>{t('deptUploadButton')}</Text>
        </Pressable>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Brand.green} />
          </View>
        ) : (
          <DecreeManagementTable
            rows={sortedRows}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            onEdit={setEditRow}
            onDelete={setDeleteRow}
            onAccept={setApproveRow}
            onReject={setRejectRow}
          />
        )}
      </ScrollView>

      <UploadDecreeFormModal visible={uploadOpen} categories={cats} onClose={() => setUploadOpen(false)} onCreated={() => void load()} />

      <PendingEditDecreeModal
        visible={editRow != null}
        decreeId={editRow?.id ?? null}
        categories={cats}
        onClose={() => setEditRow(null)}
        onSave={onEditSave}
      />

      <ApproveDecreeModal
        visible={approveRow != null}
        decreeNum={approveRow ? formatDecreeNumberLabel(approveRow) : ''}
        onClose={() => setApproveRow(null)}
        onApprove={() => void onApproveConfirm()}
      />

      <RejectDecreeModal
        visible={rejectRow != null}
        decreeNum={rejectRow ? formatDecreeNumberLabel(rejectRow) : ''}
        onClose={() => setRejectRow(null)}
        onReject={(reason) => void onRejectConfirm(reason)}
      />

      <DeleteDecreeConfirmModal
        visible={deleteRow != null}
        decreeNum={deleteRow ? formatDecreeNumberLabel(deleteRow) : ''}
        onClose={() => setDeleteRow(null)}
        onConfirm={() => void onDeleteConfirm()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 14 },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.green,
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: 'stretch',
  },
  uploadBtnTxt: { fontSize: 15, fontWeight: '700', color: palette.white },
  center: { paddingVertical: 40, alignItems: 'center' },
});
