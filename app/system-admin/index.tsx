import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Brand, palette, radius, shadowMetricDashboard, spacing } from '@/lib/theme';
import { showToast } from '@/lib/adapters/toast';

import { ActivityLineChart } from '@/components/system-admin/ActivityLineChart';
import { FormColors } from '@/constants/form';
import { useSystemAdminRemote } from '@/contexts/system-admin-remote-context';
import { useSystemAdminUi } from '@/contexts/system-admin-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import {
  buildActivityPointDetail,
  buildActivitySeriesFromApiBuckets,
  buildHourlyActivityFromLogs,
  computeActiveSessions,
  computeSystemHealthFromOverview,
  computeSystemHealthPct,
  formatHeaderDate,
  formatRelativeTime,
  formatSignedPercent,
  roleRowsForChart,
  systemAdminHealthTrendKey,
  useSystemAdminStore,
  type ActivityPoint,
  type AuditLogEntry,
} from '@/data/system-admin-store';

function logIconName(log: Pick<AuditLogEntry, 'severity' | 'status'>): keyof typeof Ionicons.glyphMap {
  if (log.status === 'FAILURE' || log.severity === 'danger') return 'alert-circle';
  if (log.severity === 'warning') return 'warning';
  if (log.severity === 'success') return 'checkmark-circle';
  return 'layers';
}

export default function SystemAdminOverviewScreen() {
  const { t } = useAppTranslation();
  const { refreshRemote, remoteBusy, lastRemoteError, publicUserCountFromApi, apiConnected } =
    useSystemAdminRemote();
  const data = useSystemAdminStore();
  const { isDarkMode } = useSystemAdminUi();
  const [logDetailModal, setLogDetailModal] = useState<AuditLogEntry | null>(null);

  const activitySeries = useMemo(() => {
    const fromApi = buildActivitySeriesFromApiBuckets(data.overview.auditActivityBuckets ?? undefined);
    if (fromApi?.length) return fromApi;
    return buildHourlyActivityFromLogs(data.auditLogs);
  }, [data.overview.auditActivityBuckets, data.auditLogs]);
  const userRegTrend = useMemo(
    () => formatSignedPercent(data.overview.totalUsersTrendPct7d),
    [data.overview.totalUsersTrendPct7d],
  );
  const health = useMemo(() => {
    if (data.overview.generatedAt) {
      return computeSystemHealthFromOverview(data.overview, apiConnected);
    }
    if (apiConnected) {
      return { value: '—', trendLabel: '—', trendUp: false };
    }
    return computeSystemHealthPct(data.auditLogs);
  }, [data.overview, data.auditLogs, apiConnected]);

  const healthTrendDisplay = useMemo(() => {
    if (!apiConnected) {
      if (data.overview.generatedAt) return t('systemAdminHealthTrendApiOffline');
      return health.trendLabel;
    }
    if (data.overview.generatedAt) {
      return t(systemAdminHealthTrendKey(data.overview, true));
    }
    return health.trendLabel;
  }, [apiConnected, data.overview, health.trendLabel, t]);

  const getActivityPointDetail = useCallback(
    (point: ActivityPoint) => buildActivityPointDetail(data.auditLogs, point),
    [data.auditLogs],
  );

  useFocusEffect(
    useCallback(() => {
      if (!apiConnected) return undefined;
      const id = setInterval(() => {
        void refreshRemote();
      }, 30000);
      return () => clearInterval(id);
    }, [apiConnected, refreshRemote]),
  );
  const roleTotalsLive = useMemo(
    () => ({
      ...data.roleTotals,
      publicUser:
        typeof publicUserCountFromApi === 'number' ? publicUserCountFromApi : data.roleTotals.publicUser,
    }),
    [data.roleTotals, publicUserCountFromApi],
  );
  const roleChartRows = useMemo(() => roleRowsForChart(roleTotalsLive), [roleTotalsLive]);
  const maxRoleCount = useMemo(() => Math.max(...roleChartRows.map((r) => r.count), 1), [roleChartRows]);

  const totalPlatformUsers = useMemo(() => {
    if (typeof data.overview.totalUsersCount === 'number') return data.overview.totalUsersCount;
    const r = data.roleTotals;
    const pub = publicUserCountFromApi ?? r.publicUser;
    return r.superAdmin + r.decreeDept + r.inspectorAdmin + r.inspector + pub;
  }, [data.overview.totalUsersCount, data.roleTotals, publicUserCountFromApi]);

  const staffActiveCount = useMemo(
    () => data.staffUsers.filter((u) => u.status === 'active').length,
    [data.staffUsers],
  );

  const securityEvents24h = data.overview.auditSecurityEvents24h;
  const activeSessions = useMemo(() => {
    if (typeof securityEvents24h === 'number') {
      return securityEvents24h;
    }
    if (apiConnected) {
      return 0;
    }
    return computeActiveSessions(data.auditLogs, staffActiveCount);
  }, [securityEvents24h, data.auditLogs, staffActiveCount, apiConnected]);

  const publishedDecreeCount = data.overview.publishedDecreeCount;

  const securityTrend = useMemo(
    () => formatSignedPercent(data.overview.securityEventsTrendPct24h),
    [data.overview.securityEventsTrendPct24h],
  );

  const decreeTrend = useMemo(() => {
    if (typeof publishedDecreeCount !== 'number') return { label: '—', up: false };
    const g = data.overview.generatedAt;
    const tail = g ? ` · ${formatRelativeTime(g)}` : '';
    return { label: `Live${tail}`, up: true };
  }, [publishedDecreeCount, data.overview.generatedAt]);

  const allLogsSorted = useMemo(() => {
    const rows = [...data.auditLogs];
    rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return rows;
  }, [data.auditLogs]);

  const recentSecurity = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600_000;
    return allLogsSorted
      .filter((l) => l.actionKey !== 'http.write' && new Date(l.timestamp).getTime() >= cutoff)
      .slice(0, 15);
  }, [allLogsSorted]);

  const systemStats = useMemo(
    () => [
      {
        key: 'users' as const,
        label: t('systemAdminTotalUsers'),
        value: totalPlatformUsers.toLocaleString(),
        icon: 'people' as const,
        trend: userRegTrend.label,
        trendUp: userRegTrend.up,
        iconBg: palette.primaryWash,
        iconBgDark: palette.primaryShade2,
        iconColor: Brand.green,
      },
      {
        key: 'security' as const,
        label: typeof securityEvents24h === 'number' ? t('systemAdminSecurityEvents24h') : t('systemAdminActiveSessions'),
        value: activeSessions.toLocaleString(),
        icon: 'pulse-outline' as const,
        trend: securityTrend.label,
        trendUp: securityTrend.up,
        iconBg: '#ECFDF5',
        iconBgDark: '#064E3B',
        iconColor: '#059669',
      },
      {
        key: 'decrees' as const,
        label: t('systemAdminTotalDecrees'),
        value: typeof publishedDecreeCount === 'number' ? publishedDecreeCount.toLocaleString() : '—',
        icon: 'document-text' as const,
        trend: decreeTrend.label,
        trendUp: decreeTrend.up,
        iconBg: '#F0FDF4',
        iconBgDark: '#14532D',
        iconColor: Brand.green,
      },
      {
        key: 'health' as const,
        label: t('systemAdminSystemHealth'),
        value: health.value,
        icon: 'shield-checkmark' as const,
        trend: healthTrendDisplay,
        trendUp: health.trendUp,
        iconBg: '#FFFBEB',
        iconBgDark: '#422006',
        iconColor: '#D97706',
      },
    ],
    [
      t,
      totalPlatformUsers,
      activeSessions,
      publishedDecreeCount,
      health.value,
      healthTrendDisplay,
      health.trendUp,
      userRegTrend.label,
      userRegTrend.up,
      securityTrend.label,
      securityTrend.up,
      decreeTrend.label,
      decreeTrend.up,
      securityEvents24h,
    ],
  );

  const onStatCardPress = useCallback((key: 'users' | 'security' | 'decrees' | 'health') => {
    if (key === 'users') {
      router.push('/system-admin/all-users' as Href);
      return;
    }
    if (key === 'security') {
      router.push({ pathname: '/system-admin/logs', params: { security24h: '1' } } as Href);
    }
  }, []);

  const onRefreshMetrics = useCallback(() => {
    void (async () => {
      await refreshRemote();
      showToast(t('systemAdminLiveMetricsUpdated'), 'success');
    })();
  }, [refreshRemote, t]);

  const cardBg = isDarkMode ? '#111827' : '#fff';
  const cardBorder = isDarkMode ? '#1F2937' : '#F3F4F6';
  const textMuted = isDarkMode ? '#9CA3AF' : '#6B7280';
  const textTitle = isDarkMode ? '#F3F4F6' : '#111827';
  const screenBg = isDarkMode ? '#030712' : FormColors.background;

  return (
    <View style={[styles.screen, { backgroundColor: screenBg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={remoteBusy} onRefresh={() => void refreshRemote()} />}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerTitleGrow}>
              <Text style={[styles.dateLine, { color: textMuted }]} maxFontSizeMultiplier={1.2}>
                {formatHeaderDate()}
              </Text>
              <Text style={[styles.h1, { color: textTitle }]} maxFontSizeMultiplier={1.25}>
                {t('systemAdminDashboardTitle')}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, isDarkMode && styles.nodePillDark]}>
              <View style={[styles.pulseDot, remoteBusy && { opacity: 0.5 }]} />
              <Text style={styles.nodePillText} numberOfLines={1}>
                {remoteBusy
                  ? t('systemAdminSyncing')
                  : lastRemoteError
                    ? t('systemAdminApiIssue')
                    : t('systemAdminApiConnected')}
              </Text>
            </View>
            <View style={[styles.statusPillMuted, { borderColor: cardBorder }]}>
              <Text style={[styles.dbPillText, { color: textMuted }]} numberOfLines={1}>
                {t('systemAdminDbStatus', { value: data.overview.healthDb ?? '—' })}
              </Text>
            </View>
          </View>
        </View>

        {lastRemoteError ? (
          <View style={styles.warnBannerRow}>
            <Text style={[styles.warnBanner, { flex: 1 }]} maxFontSizeMultiplier={1.15}>
              {t('saOfflineDataBanner')}
            </Text>
            <Pressable
              onPress={() => void refreshRemote()}
              style={styles.warnRetry}
              accessibilityRole="button"
              accessibilityLabel={t('systemAdminRetrySync')}>
              <Text style={styles.warnRetryText}>{t('certRetry')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.statGrid}>
          {systemStats.map((stat) => {
            const pressable = stat.key === 'users' || stat.key === 'security';
            const showHealthMetrics =
              stat.key === 'health' &&
              apiConnected &&
              data.overview.generatedAt &&
              (data.overview.healthUptimeSeconds != null ||
                data.overview.healthDatabaseLatencyMs != null ||
                data.overview.healthHttpErrorRatePct != null);
            const uptimeSec = data.overview.healthUptimeSeconds;
            const dbMs = data.overview.healthDatabaseLatencyMs;
            const httpPct = data.overview.healthHttpErrorRatePct;
            const inner = (
              <>
                <View style={styles.statTop}>
                  <View
                    style={[
                      styles.statIconWrap,
                      { backgroundColor: isDarkMode ? stat.iconBgDark : stat.iconBg },
                    ]}>
                    <Ionicons name={stat.icon} size={22} color={stat.iconColor} />
                  </View>
                  <View style={[styles.trendPill, stat.trendUp ? styles.trendUp : styles.trendFlat]}>
                    <Text
                      style={[styles.trendPillText, stat.trendUp ? styles.trendUpText : styles.trendFlatText]}
                      numberOfLines={2}>
                      {stat.trend}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.statValue, { color: textTitle }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: textMuted }]}>{stat.label}</Text>
                {showHealthMetrics ? (
                  <View style={styles.healthMetricWrap}>
                    {typeof uptimeSec === 'number' ? (
                      <View
                        style={[
                          styles.healthMetricChip,
                          { backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB', borderColor: cardBorder },
                        ]}>
                        <Text style={[styles.healthMetricChipLabel, { color: textMuted }]}>
                          {t('systemAdminHealthMetricUptime')}
                        </Text>
                        <Text style={[styles.healthMetricChipValue, { color: textTitle }]} numberOfLines={1}>
                          {uptimeSec >= 3600
                            ? t('systemAdminHealthUptimeHrs', {
                                h: Math.floor(uptimeSec / 3600),
                                m: Math.floor((uptimeSec % 3600) / 60),
                              })
                            : t('systemAdminHealthUptimeMin', { m: Math.floor(uptimeSec / 60) })}
                        </Text>
                      </View>
                    ) : null}
                    {typeof dbMs === 'number' ? (
                      <View
                        style={[
                          styles.healthMetricChip,
                          { backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB', borderColor: cardBorder },
                        ]}>
                        <Text style={[styles.healthMetricChipLabel, { color: textMuted }]}>
                          {t('systemAdminHealthMetricDb')}
                        </Text>
                        <Text style={[styles.healthMetricChipValue, { color: textTitle }]} numberOfLines={1}>
                          {t('systemAdminHealthDbMs', { ms: dbMs })}
                        </Text>
                      </View>
                    ) : null}
                    {typeof httpPct === 'number' ? (
                      <View
                        style={[
                          styles.healthMetricChip,
                          { backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB', borderColor: cardBorder },
                        ]}>
                        <Text style={[styles.healthMetricChipLabel, { color: textMuted }]}>
                          {t('systemAdminHealthMetricHttp')}
                        </Text>
                        <Text style={[styles.healthMetricChipValue, { color: textTitle }]} numberOfLines={1}>
                          {t('systemAdminHealthHttpErrors', { pct: httpPct })}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </>
            );
            return (
              <Pressable
                key={stat.key}
                collapsable={false}
                onPress={pressable ? () => onStatCardPress(stat.key) : undefined}
                disabled={!pressable}
                accessibilityRole={pressable ? 'button' : 'none'}
                accessibilityLabel={pressable ? `${stat.label}. ${t('systemAdminOpenDetails')}` : stat.label}
                style={({ pressed }) => [
                  { backgroundColor: cardBg },
                  shadowMetricDashboard(),
                  isDarkMode
                    ? { borderWidth: StyleSheet.hairlineWidth, borderColor: cardBorder }
                    : { borderWidth: 0, borderColor: 'transparent' },
                  pressable && pressed ? { opacity: 0.92 } : null,
                  styles.statCard,
                ]}>
                {inner}
              </Pressable>
            );
          })}
        </View>

        <View
          style={[
            styles.card,
            styles.activityCard,
            { backgroundColor: cardBg },
            shadowMetricDashboard(),
            isDarkMode ? { borderWidth: StyleSheet.hairlineWidth, borderColor: cardBorder } : null,
          ]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: textTitle }]}>{t('systemAdminActivity24h')}</Text>
            <View style={styles.cardHeaderEnd}>
              <Pressable
                onPress={onRefreshMetrics}
                style={[styles.iconBorderBtn, styles.iconBorderBtnRound, { borderColor: cardBorder }]}
                accessibilityLabel={t('systemAdminRefreshActivity')}>
                <Ionicons name="refresh" size={18} color={textMuted} />
              </Pressable>
              <View style={styles.legendPair}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Brand.green }]} />
                  <Text style={[styles.legendLabel, { color: textMuted }]}>{t('systemAdminLegendRequests')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Brand.gold }]} />
                  <Text style={[styles.legendLabel, { color: textMuted }]}>{t('systemAdminLegendLogins')}</Text>
                </View>
              </View>
            </View>
          </View>
          <ActivityLineChart
            data={activitySeries}
            dark={isDarkMode}
            requestsLabel={t('systemAdminLegendRequests')}
            loginsLabel={t('systemAdminLegendLogins')}
            getPointDetail={getActivityPointDetail}
            tapHint={t('systemAdminActivityTapHint')}
          />
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.cardTitle, { color: textTitle, marginBottom: 12 }]}>{t('systemAdminUserRoles')}</Text>
          {roleChartRows.map((role) => (
            <RoleBarRow key={role.role} role={role} max={maxRoleCount} isDark={isDarkMode} textMuted={textMuted} />
          ))}
          <Pressable
            onPress={() => {
              router.push('/system-admin/users' as Href);
              showToast(t('systemAdminManageRolesToast'), 'success');
            }}
            style={[styles.dashedBtn, { borderColor: isDarkMode ? '#374151' : '#E5E7EB' }]}
            accessibilityRole="button">
            <Ionicons name="person-add-outline" size={16} color={textMuted} />
            <Text style={[styles.dashedBtnText, { color: textMuted }]}>{t('systemAdminManageRoles')}</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder, padding: 0 }]}>
          <View style={[styles.feedHeader, { borderBottomColor: cardBorder }]}>
            <Text style={[styles.cardTitle, { color: textTitle }]}>{t('systemAdminLiveSecurityFeed')}</Text>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={{ color: textMuted, fontSize: 10, fontWeight: '600' }}>{t('systemAdminMonitoring')}</Text>
            </View>
          </View>
          {recentSecurity.length === 0 ? (
            <View style={{ padding: 16 }}>
              <Text style={{ color: textMuted, fontSize: 13, textAlign: 'center' }}>{t('systemAdminNoSecurityFeed')}</Text>
            </View>
          ) : null}
          {recentSecurity.map((log) => {
            const icon = logIconName(log);
            const tone =
              log.severity === 'success'
                ? styles.feedIconOk
                : log.severity === 'warning' || log.status === 'FAILURE'
                  ? styles.feedIconWarn
                  : styles.feedIconInfo;
            return (
              <Pressable
                key={log.id}
                onPress={() => setLogDetailModal(log)}
                style={({ pressed }) => [styles.feedRow, pressed && { opacity: 0.85 }]}>
                <View style={[styles.feedIconWrap, tone]}>
                  <Ionicons
                    name={icon}
                    size={18}
                    color={tone === styles.feedIconOk ? '#059669' : tone === styles.feedIconWarn ? '#DC2626' : Brand.green}
                  />
                </View>
                <View style={styles.feedBody}>
                  <View style={styles.feedTitleRow}>
                    <Text style={[styles.feedAction, { color: isDarkMode ? '#E5E7EB' : '#1F2937' }]} numberOfLines={1}>
                      {log.action}
                    </Text>
                    <Text style={{ fontSize: 10, color: textMuted }}>{formatRelativeTime(log.timestamp)}</Text>
                  </View>
                  <Text style={[styles.feedSub, { color: textMuted }]} numberOfLines={1}>
                    {log.user} — {log.module}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => router.push('/system-admin/logs' as Href)}
            style={[styles.feedFooter, { borderTopColor: cardBorder }]}>
            <Text style={styles.feedFooterText}>{t('systemAdminOpenAuditLogs')}</Text>
          </Pressable>
        </View>

        {remoteBusy ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Brand.green} />
            <Text style={{ color: textMuted, marginStart: 8 }}>{t('systemAdminSyncingDirectory')}</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={logDetailModal !== null} animationType="slide" transparent onRequestClose={() => setLogDetailModal(null)}>
        <View style={styles.modalFlexEnd}>
          <Pressable style={styles.modalBackdrop} onPress={() => setLogDetailModal(null)} />
          {logDetailModal ? (
          <View style={styles.detailSheet}>
            <Text style={styles.detailTitle}>{t('systemAdminAuditDetails')}</Text>
            <View style={styles.detailHero}>
              <Ionicons name={logIconName(logDetailModal)} size={28} color={Brand.green} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailAction}>{logDetailModal.action}</Text>
                <Text style={styles.detailSub}>
                  {new Date(logDetailModal.timestamp).toLocaleString()} · {formatRelativeTime(logDetailModal.timestamp)}
                </Text>
              </View>
            </View>
            <View style={styles.detailGrid}>
              <RowKV k={t('systemAdminInitiator')} v={logDetailModal.user} />
              <RowKV k={t('systemAdminCategory')} v={logDetailModal.module} />
              {logDetailModal.actionKey ? <RowKV k={t('systemAdminActionKey')} v={logDetailModal.actionKey} mono /> : null}
              <RowKV k={t('systemAdminIp')} v={logDetailModal.ip} mono />
              <RowKV k={t('systemAdminStatus')} v={logDetailModal.status} />
            </View>
            <Text style={styles.fpLabel}>{t('systemAdminIntegrity')}</Text>
            <Text
              style={[styles.fpValue, !logDetailModal.integrityHash?.trim() && { color: '#6B7280', fontWeight: '500' }]}
              selectable>
              <Ionicons name="shield-checkmark" size={14} color="#059669" />{' '}
              {logDetailModal.integrityHash?.trim()
                ? logDetailModal.integrityHash
                : t('systemAdminNoIntegrityHash')}
            </Text>
            <Pressable style={styles.dismissBtn} onPress={() => setLogDetailModal(null)}>
              <Text style={styles.dismissBtnText}>{t('systemAdminDismiss')}</Text>
            </Pressable>
          </View>
        ) : null}
        </View>
      </Modal>
    </View>
  );
}

function RowKV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={[styles.kvVal, mono && { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) }]} numberOfLines={3}>
        {v}
      </Text>
    </View>
  );
}

function RoleBarRow({
  role,
  max,
  isDark,
  textMuted,
}: {
  role: { role: string; count: number; bar: string };
  max: number;
  isDark: boolean;
  textMuted: string;
}) {
  const widthPct = (role.count / max) * 100;
  const barColor =
    role.bar.includes('red') ? '#DC2626' : role.bar.includes('blue') ? Brand.green : role.bar.includes('amber') ? '#D97706' : Brand.green;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={styles.roleLabels}>
        <Text style={{ fontSize: 12, color: isDark ? '#D1D5DB' : '#374151' }}>{role.role}</Text>
        <Text style={{ fontSize: 12, color: textMuted, fontWeight: '600' }}>{role.count.toLocaleString()}</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
        <View style={[styles.barFill, { backgroundColor: barColor, width: `${widthPct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32, gap: 16 },
  headerBlock: { gap: spacing.sm },
  headerTitleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  headerTitleGrow: { flex: 1, minWidth: 0 },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dateLine: { fontSize: 11 },
  h1: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#BBF7D0',
  },
  statusPillMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
  },
  nodePillDark: { backgroundColor: '#064E3B', borderColor: '#065F46' },
  nodePillText: { fontSize: 10, fontWeight: '800', color: '#059669', maxWidth: 160 },
  dbPillText: { fontSize: 10, fontWeight: '700', maxWidth: 120 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  warnBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  warnBanner: { color: '#B45309', fontSize: 12 },
  warnRetry: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FCD34D',
  },
  warnRetryText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: radius['2xl'],
    padding: 16,
    gap: 10,
  },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  trendPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, maxWidth: '46%', flexShrink: 1 },
  trendUp: { backgroundColor: '#ECFDF5' },
  trendFlat: { backgroundColor: '#F3F4F6' },
  trendPillText: { fontSize: 10, fontWeight: '800' },
  trendUpText: { color: '#166534' },
  trendFlatText: { color: '#6B7280' },
  statValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: '500' },
  healthMetricWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  healthMetricChip: {
    flexGrow: 1,
    minWidth: '28%',
    maxWidth: '100%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  healthMetricChipLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  healthMetricChipValue: { fontSize: 11, fontWeight: '800' },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  activityCard: {
    borderRadius: 24,
    borderWidth: 0,
    padding: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardHeaderEnd: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 },
  iconBorderBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBorderBtnRound: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  legendPair: { flexDirection: 'row', alignItems: 'center', gap: 16, flexShrink: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontWeight: '600' },
  dashedBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  dashedBtnText: { fontSize: 12, fontWeight: '600' },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  feedIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  feedIconOk: { backgroundColor: '#ECFDF5' },
  feedIconWarn: { backgroundColor: '#FEF2F2' },
  feedIconInfo: { backgroundColor: palette.primaryWash },
  feedBody: { flex: 1, minWidth: 0 },
  feedTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  feedAction: { fontSize: 12, fontWeight: '700', flex: 1 },
  feedSub: { fontSize: 10, marginTop: 2 },
  feedFooter: { padding: 14, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  feedFooterText: { fontSize: 12, fontWeight: '700', color: Brand.green },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  modalFlexEnd: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  detailSheet: {
    marginHorizontal: 20,
    marginBottom: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  detailTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  detailHero: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  detailAction: { fontSize: 15, fontWeight: '700', color: '#111827' },
  detailSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  detailGrid: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, gap: 10 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  kvKey: { fontSize: 11, color: '#9CA3AF' },
  kvVal: { fontSize: 11, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'right' },
  fpLabel: { marginTop: 14, fontSize: 10, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase' },
  fpValue: { marginTop: 6, fontSize: 11, color: '#059669', fontWeight: '700' },
  dismissBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  dismissBtnText: { fontSize: 12, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' },
  roleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 999 },
});
