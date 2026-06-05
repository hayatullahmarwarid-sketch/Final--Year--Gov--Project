import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DecreePreviewModal, EditDecreeModal } from '@/components/dept-upload/DecreePreviewEditModals';
import { DeptUploadBottomInsights } from '@/components/dept-upload/DeptUploadBottomInsights';
import {
  DeptUploadMetricModals,
  type DeptUploadMetricModalKind,
} from '@/components/dept-upload/DeptUploadMetricModals';
import { DeptUploadMetricGrid } from '@/components/dept-upload/DeptUploadMetricGrid';
import { DeptUploadPendingActionsCard } from '@/components/dept-upload/DeptUploadPendingActionsCard';
import { DeptUploadRecentActivityCard } from '@/components/dept-upload/DeptUploadRecentActivityCard';
import type { RecentUploadRow } from '@/components/dept-upload/DeptUploadRecentUploadsCard';
import { DeptUploadRecentUploadsCard } from '@/components/dept-upload/DeptUploadRecentUploadsCard';
import { DeptUploadSharedAnalyticsSection } from '@/components/dept-upload/DeptUploadSharedAnalyticsSection';
import type { ActivityRow } from '@/components/dept-upload/DeptUploadRecentActivityCard';
import { DeptUploadUploadHero } from '@/components/dept-upload/DeptUploadUploadHero';
import { UploadDecreeFormModal } from '@/components/dept-upload/UploadDecreeFormModal';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useAppTranslation } from '@/hooks/use-app-translation';
import {
  getDecreeById,
  getDecreeUploadDashboard,
  listCategories,
  type DecreeCategory,
  type DecreeUploadDashboardDto,
  type SerializedDecree,
} from '@/lib/api/decree-upload';
import { showToast } from '@/lib/adapters/toast';
import { useDeptUploadThemeColorsOptional, useDeptUploadUiOptional } from '@/contexts/dept-upload-ui-context';
import { useDeptUploadWorkspace } from '@/contexts/dept-upload-workspace-context';
import { formatDecreeNumberLabelLocalized } from '@/lib/decree-number-format';
import { pickPublicDecreeTitleFromRow } from '@/lib/decree-title-typography';
import { Brand, palette } from '@/lib/theme';

function pillFromApiStatus(status: string): RecentUploadRow['pill'] {
  const s = status.toLowerCase();
  if (s === 'draft') return 'draft';
  if (s === 'pending') return 'pending';
  if (s === 'archived') return 'archived';
  if (s === 'superseded') return 'superseded';
  if (s === 'active') return 'published';
  return 'published';
}

function activityIconForAction(actionKey: string): ActivityRow['icon'] {
  if (actionKey === 'decree.create') return 'cloud-upload-outline';
  if (actionKey === 'decree.publish') return 'checkmark-done-outline';
  if (actionKey === 'decree.archive') return 'archive-outline';
  if (actionKey === 'decree.update') return 'pencil-outline';
  if (actionKey === 'decree.supersede') return 'git-compare-outline';
  return 'create-outline';
}

function activityFromAudit(
  a: NonNullable<DecreeUploadDashboardDto['recentActivity']>[number],
  dateFmt: (d: Date) => string,
  t: (key: string, options?: Record<string, unknown>) => string,
): ActivityRow {
  const timeLabel = a.occurredAt ? dateFmt(new Date(a.occurredAt)) : '—';
  const color = Brand.green;
  const bg = palette.primaryAlpha.a12;
  const icon = activityIconForAction(a.actionKey);
  const verbKey = `activity.${a.actionKey.replace(/\./g, '_')}`;
  const verb = t(verbKey, { defaultValue: t('activity.generic') });
  const title = a.summary?.trim() || a.actionKey;
  return {
    key: a.id,
    verb,
    title,
    meta: timeLabel,
    icon,
    bg,
    color,
    performedBy: t('deptActivityPerformedByYou'),
    timeLabel,
    details: title,
  };
}

export default function DeptUploadHomeScreen() {
  const deptUi = useDeptUploadUiOptional();
  const c = useDeptUploadThemeColorsOptional();
  const { rejectActivityFeed } = useDeptUploadWorkspace();
  const { number, dateMedium, date, t, language } = useAppTranslation();
  const [dash, setDash] = useState<DecreeUploadDashboardDto | null>(null);
  const [cats, setCats] = useState<DecreeCategory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [metricModal, setMetricModal] = useState<DeptUploadMetricModalKind>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<RecentUploadRow | null>(null);
  const [previewDecree, setPreviewDecree] = useState<SerializedDecree | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const load = useCallback(async () => {
    const [d, c] = await Promise.all([getDecreeUploadDashboard(), listCategories({ limit: 100 })]);
    if (!d.ok) showToast(d.message, 'error');
    else setDash(d.data);
    if (c.ok) setCats(c.items);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const d = dash?.decrees;
  const total = d?.total ?? 0;
  const published = d?.active ?? 0;
  /** Drafts awaiting publish/approval are included with formal `pending` queue (same as Pending Actions). */
  const pendingCount = (d?.other?.pending ?? 0) + (d?.other?.draft ?? 0);
  const newMonth = dash?.newDecreesThisMonth ?? 0;
  const viewsTotal = dash?.engagement?.totalViews ?? dash?.viewsTotal ?? 0;
  const downloadsTotal = dash?.engagement?.totalDownloads ?? 0;

  const nMom = dash?.newDecreesMonthOverMonth;
  const newDecreesSub = nMom
    ? `${nMom.up ? '↑' : '↓'} ${Math.abs(nMom.changePct)}% MoM`
    : undefined;
  const vMom = dash?.viewsMonthOverMonth;
  const monthShort = (ym: string | null | undefined) => {
    if (!ym || ym.length < 7) return '';
    const d = new Date(`${ym.slice(0, 7)}-01T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return '';
    return date(d, { month: 'short', year: 'numeric' });
  };
  const viewsSub = vMom ? `${vMom.up ? '↑' : '↓'} ${Math.abs(vMom.changePct)}% ${monthShort(vMom.currentMonthLabel)}` : undefined;
  const viewsLabel = vMom ? `vs ${monthShort(vMom.previousMonthLabel)}` : 'MoM';

  const recentRows: RecentUploadRow[] = useMemo(
    () =>
      (dash?.recentUploads ?? []).map((r) => ({
        id: r.id,
        titleLine: `${t('deptDecreeShortLabel', {
          label: formatDecreeNumberLabelLocalized(r, language),
        })} — ${pickPublicDecreeTitleFromRow(
          {
            titleSummary: r.titleSummary,
            titlePs: r.titlePs,
            titleFa: r.titleFa,
            titleEn: r.titleEn,
          },
          language,
        )}`,
        metaLine: r.updatedAt ? dateMedium(new Date(r.updatedAt)) : '—',
        pill: pillFromApiStatus(r.status),
      })),
    [dash?.recentUploads, dateMedium, language, t],
  );

  const openRecentPreview = useCallback(async (row: RecentUploadRow) => {
    setPreviewRow(row);
    setPreviewDecree(null);
    setPreviewOpen(true);
    setPreviewLoading(true);
    const r = await getDecreeById(row.id);
    setPreviewLoading(false);
    if (r.ok) setPreviewDecree(r.data);
    else {
      showToast(r.message, 'error');
      setPreviewDecree(null);
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewRow(null);
    setPreviewDecree(null);
    setPreviewLoading(false);
  }, []);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
  }, []);

  const activityFeed: ActivityRow[] = useMemo(
    () => (dash?.recentActivity ?? []).map((a) => activityFromAudit(a, dateMedium, t)),
    [dash?.recentActivity, dateMedium, t],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.pageBg }]} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.pageBg }}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={deptUi?.isDarkMode ? '#94A3B8' : DeptUploadDash.chart.green}
          />
        }>
        <DeptUploadMetricGrid
          totalDecrees={number(total)}
          publishedCount={number(published)}
          newThisMonth={number(newMonth)}
          pendingApproval={number(pendingCount)}
          totalViews={number(viewsTotal)}
          totalDownloads={number(downloadsTotal)}
          newThisMonthSub={newDecreesSub}
          newThisMonthSubIsUp={nMom?.up}
          viewsPeriodSub={viewsSub}
          viewsPeriodSubIsUp={vMom?.up}
          viewsPeriodLabel={viewsLabel}
          onPressTotalDecrees={() => setMetricModal('totalDecrees')}
          onPressNewThisMonth={() => setMetricModal('newThisMonth')}
          onPressPendingApproval={() => setMetricModal('pendingApproval')}
          onPressTotalViews={() => setMetricModal('totalViews')}
        />

        <DeptUploadUploadHero onUploadPress={() => setUploadOpen(true)} />

        <DeptUploadRecentUploadsCard rows={recentRows} onSelectRow={openRecentPreview} />

        <DeptUploadSharedAnalyticsSection layout="dashboard" dashboard={dash} />

        <DeptUploadRecentActivityCard feed={activityFeed} appendedActivities={rejectActivityFeed} />

        <View style={styles.tableWrap}>
          <DeptUploadPendingActionsCard categories={cats} refreshKey={dash?.generatedAt ?? ''} />
        </View>

        <DeptUploadBottomInsights
          publishedCount={published}
          avgViewsPerDecree={published > 0 ? Math.round(viewsTotal / published) : null}
          mostActiveAdmin={null}
          uploadTrendMoMPct={null}
          storageUsedBytes={null}
          storageQuotaBytes={null}
          storageBreakdown={{ pdfBytes: 0, imageBytes: 0, otherBytes: 0 }}
        />
      </ScrollView>

      <UploadDecreeFormModal
        visible={uploadOpen}
        categories={cats}
        onClose={() => setUploadOpen(false)}
        onCreated={() => void load()}
      />

      <DeptUploadMetricModals
        active={metricModal}
        onClose={() => setMetricModal(null)}
        dashboard={dash}
        publishedDecreeCount={published}
        onRefreshLists={() => void load()}
      />

      <DecreePreviewModal
        visible={previewOpen}
        row={previewRow}
        decree={previewDecree}
        loading={previewLoading}
        onClose={closePreview}
        onEdit={() => {
          setPreviewOpen(false);
          setEditOpen(true);
        }}
        onDownloaded={() => {}}
      />

      <EditDecreeModal
        visible={editOpen}
        decree={previewDecree}
        row={previewRow}
        categories={cats}
        onClose={() => {
          closeEdit();
          setPreviewRow(null);
          setPreviewDecree(null);
        }}
        onSaved={() => void load()}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 14,
  },
  tableWrap: {
    marginHorizontal: -4,
  },
});
