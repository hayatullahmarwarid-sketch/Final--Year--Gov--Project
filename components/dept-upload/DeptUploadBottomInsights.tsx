import { Ionicons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { Brand, palette } from '@/lib/theme';

import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { downloadDeptUploadAnalyticsReport, type DeptUploadReportFormat } from '@/lib/dept-upload/reports-download';
import { showToast } from '@/lib/adapters/toast';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useAppTranslation } from '@/hooks/use-app-translation';

function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

function fmtBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return '0 KB';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type Props = {
  /** Total decrees published so far. Omit to hide the stat. */
  publishedCount?: number | null;
  /** Sum of views divided by number of published decrees. */
  avgViewsPerDecree?: number | null;
  /** Display label for the most-active uploader (e.g. staff display name). */
  mostActiveAdmin?: string | null;
  /** Month-over-month change in uploads as a percentage (negative = decline). */
  uploadTrendMoMPct?: number | null;
  /** Raw bytes used from the storage provider + quota in bytes. */
  storageUsedBytes?: number | null;
  storageQuotaBytes?: number | null;
  /** Breakdown of storage by mime family, in bytes. */
  storageBreakdown?: { pdfBytes?: number | null; imageBytes?: number | null; otherBytes?: number | null };
};

export function DeptUploadBottomInsights({
  publishedCount = null,
  avgViewsPerDecree = null,
  mostActiveAdmin = null,
  uploadTrendMoMPct = null,
  storageUsedBytes = null,
  storageQuotaBytes = null,
  storageBreakdown,
}: Props = {}) {
  const c = useDeptUploadThemeColorsOptional();
  const { sessionEmail } = useAuthSession();
  const { t } = useAppTranslation();
  const cardShell = [styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }];
  const [exporting, setExporting] = React.useState<DeptUploadReportFormat | null>(null);

  const quota = storageQuotaBytes ?? 50 * 1024 * 1024 * 1024; // 50 GB default until API provides
  const used = storageUsedBytes ?? 0;
  const pct = quota > 0 ? Math.max(0, Math.min(100, (used / quota) * 100)) : 0;
  const trendSign = uploadTrendMoMPct == null ? '' : uploadTrendMoMPct >= 0 ? '↑' : '↓';
  const trendLabel =
    uploadTrendMoMPct == null
      ? '—'
      : t('deptTrendMomLabel', { sign: trendSign, pct: Math.abs(uploadTrendMoMPct).toFixed(0) });

  return (
    <View style={styles.gap}>
      <View style={cardShell}>
        <View style={styles.rowHead}>
          <Ionicons name="server-outline" size={18} color={c.textMuted} />
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('deptStorageUsageTitle')}</Text>
        </View>
        <Text style={styles.storageBig}>
          <Text style={[styles.storageEm, { color: c.textPrimary }]}>{fmtBytes(used)}</Text>
          <Text style={[styles.storageRest, { color: c.textSecondary }]}> / {fmtBytes(quota)}</Text>
        </Text>
        <Text style={[styles.pctMuted, { color: c.textMuted }]}>{t('deptStoragePctUsed', { pct: pct.toFixed(1) })}</Text>
        <View style={[styles.track, { backgroundColor: c.segmentTrack }]}>
          <View style={[styles.trackFill, { width: `${Math.max(1, pct)}%` }]} />
        </View>
        <View style={styles.cols3}>
          <Text style={[styles.colLbl, { color: c.textMuted }]}>{t('deptStorageBreakPdf', { value: fmtBytes(storageBreakdown?.pdfBytes ?? 0) })}</Text>
          <Text style={[styles.colLbl, { color: c.textMuted }]}>{t('deptStorageBreakImg', { value: fmtBytes(storageBreakdown?.imageBytes ?? 0) })}</Text>
          <Text style={[styles.colLbl, { color: c.textMuted }]}>{t('deptStorageBreakOther', { value: fmtBytes(storageBreakdown?.otherBytes ?? 0) })}</Text>
        </View>
        <Pressable onPress={() => router.push('/dept-upload/settings' as Href)}>
          <Text style={styles.link}>{t('deptManageStorageLink')}</Text>
        </Pressable>
      </View>

      <View style={cardShell}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('deptQuickStatsTitle')}</Text>
        <StatRow
          icon="checkmark-circle"
          iconColor={palette.white}
          iconBg={Brand.green}
          label={t('deptQuickStatPublished')}
          value={fmtNum(publishedCount)}
        />
        <StatRow
          icon="eye-outline"
          iconColor={palette.primaryTint1}
          iconBg={palette.primaryAlpha.a10}
          label={t('deptQuickStatAvgViews')}
          value={fmtNum(avgViewsPerDecree)}
        />
        <StatRow
          icon="star-outline"
          iconColor={palette.primaryShade1}
          iconBg={palette.primaryAlpha.a10}
          label={t('deptQuickStatMostActiveAdmin')}
          value={mostActiveAdmin && mostActiveAdmin.trim() ? mostActiveAdmin : '—'}
        />
        <StatRow
          icon="trending-up-outline"
          iconColor={Brand.green}
          iconBg={palette.primaryAlpha.a12}
          label={t('deptQuickStatUploadTrend')}
          value={trendLabel}
        />
      </View>

      <View style={cardShell}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('deptExportReportsTitle')}</Text>
        <Text style={[styles.exportIntro, { color: c.textMuted }]}>
          {t('deptExportReportsIntro')}
        </Text>
        <ExportRow
          title={t('deptExportPdfTitle')}
          sub={t('deptExportPdfSub')}
          boxBg="#FEE2E2"
          icon="document-text"
          iconColor="#DC2626"
          disabled={exporting != null}
          onPress={() => {
            if (exporting) return;
            setExporting('pdf');
            void (async () => {
              try {
                const r = await downloadDeptUploadAnalyticsReport('pdf', { generatedBy: sessionEmail });
                if (!r.ok) showToast(t('deptExportFailed'), 'error');
              } finally {
                setExporting(null);
              }
            })();
          }}
        />
        <ExportRow
          title={t('deptExportCsvTitle')}
          sub={t('deptExportCsvSub')}
          boxBg={palette.primaryAlpha.a12}
          icon="grid-outline"
          iconColor={Brand.green}
          disabled={exporting != null}
          onPress={() => {
            if (exporting) return;
            setExporting('csv');
            void (async () => {
              try {
                const r = await downloadDeptUploadAnalyticsReport('csv');
                if (!r.ok) showToast(t('deptExportFailed'), 'error');
              } finally {
                setExporting(null);
              }
            })();
          }}
        />
        <ExportRow
          title={t('deptExportExcelTitle')}
          sub={t('deptExportExcelSub')}
          boxBg={palette.primaryAlpha.a12}
          icon="grid-outline"
          iconColor="#0088FF"
          disabled={exporting != null}
          onPress={() => {
            if (exporting) return;
            setExporting('excel');
            void (async () => {
              try {
                const r = await downloadDeptUploadAnalyticsReport('excel');
                if (!r.ok) showToast(t('deptExportFailed'), 'error');
              } finally {
                setExporting(null);
              }
            })();
          }}
        />
      </View>
    </View>
  );
}

function StatRow({
  icon,
  iconColor,
  iconBg,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
}) {
  const c = useDeptUploadThemeColorsOptional();
  return (
    <View style={[styles.statRow, { borderTopColor: c.rowDivider }]}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.statLabel, { color: c.textPrimary }]}>{label}</Text>
      <Text style={[styles.statVal, { color: c.textSecondary }]}>{value}</Text>
    </View>
  );
}

function ExportRow({
  title,
  sub,
  boxBg,
  icon,
  iconColor,
  onPress,
  disabled,
}: {
  title: string;
  sub: string;
  boxBg: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useDeptUploadThemeColorsOptional();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.exportRow, { borderTopColor: c.rowDivider, opacity: disabled ? 0.55 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`Export ${title}`}>
      <View style={[styles.exportIcon, { backgroundColor: boxBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.exportTitle, { color: c.textPrimary }]}>{title}</Text>
        <Text style={[styles.exportRowSub, { color: c.textMuted }]}>{sub}</Text>
      </View>
      <Ionicons name="download-outline" size={18} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 14 },
  card: {
    borderRadius: DeptUploadDash.radiusLg,
    padding: 20,
    borderWidth: 1,
    ...DeptUploadDash.shadow,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  storageBig: {
    marginTop: 4,
  },
  storageEm: {
    fontSize: 26,
    fontWeight: '800',
  },
  storageRest: {
    fontSize: 16,
    fontWeight: '600',
  },
  pctMuted: {
    fontSize: 12,
    marginTop: 6,
  },
  track: {
    height: 8,
    borderRadius: 999,
    marginTop: 14,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: Brand.green,
    borderRadius: 999,
  },
  cols3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    marginBottom: 12,
  },
  colLbl: {
    fontSize: 12,
    fontWeight: '500',
  },
  link: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.green,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  exportIntro: {
    fontSize: 12,
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 18,
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  exportIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  exportRowSub: {
    fontSize: 12,
    marginTop: 4,
  },
});
