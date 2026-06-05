import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { type Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { HomeColors } from '@/constants/home';
import { palette } from '@/lib/theme';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useInspectorLang } from '@/contexts/inspector-lang-context';
import { useInspectorSyncQueue } from '@/contexts/inspector-sync-queue-context';
import { useInspectorWorkspace } from '@/contexts/inspector-workspace-context';
import { useNotificationInbox } from '@/contexts/notification-inbox-context';
import { type InspectorTask } from '@/data/inspector-tasks';
import { useAppTranslation } from '@/hooks/use-app-translation';

import {
    INSPECTOR_BAR_BG,
    INSPECTOR_LANG_CHIP_BG,
    INSPECTOR_LANG_CHIP_BORDER,
    inspectorHeaderShadow,
} from './inspector-chrome';
import { InspectorBottomNav, inspectorBottomNavOffset } from './InspectorBottomNav';
import {
    INSPECTOR_TRANSLATIONS,
    inspectorDashboardStatusText,
    inspectorPriorityLabel,
} from './inspector-translations';

function statusColors(status: InspectorTask['status']) {
  switch (status) {
    case 'assigned':
      return { bg: palette.primaryWash, text: palette.primaryShade2, border: palette.primaryWashBorder };
    case 'in-progress':
      return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
    case 'overdue':
      return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' };
    case 'draft':
      return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
    case 'completed':
      return { bg: '#D1FAE5', text: '#047857', border: '#A7F3D0' };
    case 'returned':
      return { bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE' };
    default:
      return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
  }
}

function priorityColor(priority: InspectorTask['priority']) {
  switch (priority) {
    case 'high':
      return palette.primaryShade1;
    case 'medium':
      return Brand.green;
    default:
      return palette.primaryTint1;
  }
}

function interpolateCount(template: string, count: number): string {
  return template.replace(/\{\{count\}\}/g, String(count));
}

function inspectorDisplayNameFromAccountKey(accountKey: string | null): string | null {
  if (!accountKey?.startsWith('insp_')) return null;
  const raw = accountKey.slice(5);
  if (raw === 'legacy_device' || raw === 'unknown' || raw.length === 0) return null;
  return raw
    .split('_')
    .map((p) => (p.length ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(' ');
}

export function InspectorDashboardScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarOffset = inspectorBottomNavOffset(insets.bottom);
  const { lang, cycleLang } = useInspectorLang();
  const t = INSPECTOR_TRANSLATIONS[lang];
  const { t: appT, number: fmtNumber } = useAppTranslation();
  const { accountKey } = useAuthSession();
  const { unreadCount } = useNotificationInbox();
  const { items: syncQueueItems } = useInspectorSyncQueue();
  const {
    tasks,
    stats,
    recentActivity,
    dashboardActivePreviews,
    loading: workspaceLoading,
    error: workspaceError,
  } = useInspectorWorkspace();
  const [isOnline, setIsOnline] = useState(true);

  const dir = lang === 'en' ? 'ltr' : 'rtl';
  const horizontal = width < 360 ? 14 : 16;
  const gutter = width >= 768 ? 24 : 16;
  const cap = width >= 900 ? 720 : width >= 768 ? 640 : 560;
  /** Full viewport minus gutters, capped — numeric width fixes RN Web ScrollView shrink-wrap. */
  const pageMaxWidth =
    width > 0 ? Math.max(280, Math.min(width - gutter * 2, cap)) : Math.min(cap, 560);

  const displayName = useMemo(() => inspectorDisplayNameFromAccountKey(accountKey), [accountKey]);
  const welcomeLine = displayName ? t.welcomeWithName.replace('{name}', displayName) : t.welcome;
  const langCode = lang === 'en' ? 'en' : lang === 'ps' ? 'ps' : 'dr';

  const dashboardTasks = useMemo(() => {
    if (dashboardActivePreviews.length > 0) return dashboardActivePreviews;
    return tasks.slice(0, 4);
  }, [dashboardActivePreviews, tasks]);

  const pendingSyncCount = syncQueueItems.length;

  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    (async () => {
      try {
        const s = await Network.getNetworkStateAsync();
        setIsOnline(!!s.isConnected);
      } catch {
        setIsOnline(true);
      }
    })();
    try {
      sub = Network.addNetworkStateListener((state) => {
        setIsOnline(!!state.isConnected);
      });
    } catch {
      /* ignore */
    }
    return () => sub?.remove();
  }, []);

  const pushTasksFiltered = (filter: 'assigned' | 'in-progress' | 'overdue' | 'draft' | 'all') => {
    if (filter === 'all') {
      router.push('/inspector/tasks' as Href);
      return;
    }
    router.push(`/inspector/tasks?filter=${encodeURIComponent(filter)}` as Href);
  };

  const ctaFor = (task: InspectorTask) => {
    if (task.status === 'assigned') return t.startInspection;
    if (task.status === 'draft' || task.status === 'in-progress') return t.resume;
    return t.viewDetail;
  };

  const openSync = () => {
    router.push('/inspector/sync' as Href);
  };

  return (
    <View style={styles.columnRoot} accessibilityLabel={appT('a11yInspectorDashboard')}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: horizontal }, { direction: dir }]}>
          <View style={styles.dashboardHeaderRow}>
            <View style={styles.dashboardLeft}>
              <View style={styles.avatarRing}>
                <Ionicons name="person" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.dashboardTextCol}>
                <Text style={styles.welcomeLine} maxFontSizeMultiplier={1.15} numberOfLines={2}>
                  {welcomeLine}
                </Text>
                <View style={styles.statusRow}>
                  <Ionicons
                    name={isOnline ? 'wifi' : 'cloud-offline-outline'}
                    size={14}
                    color={isOnline ? '#FFFFFF' : '#FBBF24'}
                  />
                  <Text
                    style={[styles.statusLine, !isOnline && styles.statusLineOffline]}
                    maxFontSizeMultiplier={1.12}>
                    {isOnline ? t.onlineMode : t.offlineMode}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.dashboardRight, lang !== 'en' && styles.dashboardRightRtl]}>
              <Pressable
                onPress={cycleLang}
                style={({ pressed }) => [styles.langChip, pressed && { opacity: 0.88 }]}
                accessibilityRole="button"
                accessibilityLabel={t.cycleLangA11y}>
                <Text style={styles.langChipTxt} maxFontSizeMultiplier={1.1}>
                  {langCode}
                </Text>
              </Pressable>
              <Pressable
                style={styles.bellWrap}
                accessibilityRole="button"
                accessibilityLabel={
                  unreadCount > 0
                    ? appT('a11yNotificationsUnread', { count: fmtNumber(unreadCount) })
                    : appT('a11yNotifications')
                }
                onPress={() => router.push('/notifications' as Href)}>
                <Ionicons name="notifications-outline" size={22} color="#fff" />
                {unreadCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? `${fmtNumber(99)}+` : fmtNumber(unreadCount)}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarOffset + 24, width: '100%', alignItems: 'center' }]}
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.pageColumn,
              {
                width: pageMaxWidth,
                maxWidth: '100%',
                direction: dir,
              },
            ]}>
          {workspaceLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Brand.green} />
              <Text style={styles.loadingTxt} maxFontSizeMultiplier={1.1}>
                {t.loadingAssignments}
              </Text>
            </View>
          ) : null}

          {workspaceError ? (
            <View style={styles.errBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#B45309" />
              <Text style={styles.errBannerTxt} maxFontSizeMultiplier={1.1}>
                {workspaceError}
              </Text>
            </View>
          ) : null}

          {!isOnline ? (
            <View style={styles.syncBanner}>
              <Ionicons name="cloud-offline-outline" size={16} color="#B45309" />
              <Text style={styles.syncBannerText} maxFontSizeMultiplier={1.15}>
                {interpolateCount(t.syncItemsWaiting, pendingSyncCount)}
              </Text>
              <Pressable onPress={openSync} accessibilityRole="button" accessibilityLabel={t.retryNow}>
                <Text style={styles.syncRetry}>{t.retryNow}</Text>
              </Pressable>
            </View>
          ) : pendingSyncCount > 0 ? (
            <Pressable
              onPress={openSync}
              style={({ pressed }) => [styles.syncInfoBanner, pressed && { opacity: 0.96 }]}
              accessibilityRole="button"
              accessibilityLabel={`${interpolateCount(t.syncQueueOnlineHint, pendingSyncCount)}. ${t.viewSyncQueue}`}>
              <Ionicons name="cloud-upload-outline" size={16} color={Brand.green} />
              <Text style={styles.syncInfoText} maxFontSizeMultiplier={1.12}>
                {interpolateCount(t.syncQueueOnlineHint, pendingSyncCount)}
              </Text>
              <Text style={styles.syncInfoCta} maxFontSizeMultiplier={1.05}>
                {t.viewSyncQueue}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.statsGrid}>
            <StatCard
              icon="clipboard-outline"
              label={t.assigned}
              value={String(stats.assigned)}
              tone="blue"
              onPress={() => pushTasksFiltered('assigned')}
              accessibilityHint={t.menuAllTasks}
            />
            <StatCard
              icon="time-outline"
              label={t.inProgress}
              value={String(stats.inProgress)}
              tone="amber"
              onPress={() => pushTasksFiltered('in-progress')}
              accessibilityHint={t.menuAllTasks}
            />
            <StatCard
              icon="alert-circle-outline"
              label={t.overdue}
              value={String(stats.overdue)}
              tone="red"
              onPress={() => pushTasksFiltered('overdue')}
              accessibilityHint={t.menuAllTasks}
            />
            <StatCard
              icon="create-outline"
              label={t.drafts}
              value={String(stats.draft)}
              tone="gray"
              onPress={() => pushTasksFiltered('draft')}
              accessibilityHint={t.menuAllTasks}
            />
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.15}>
              {t.activeTasks}
            </Text>
            <Pressable onPress={() => pushTasksFiltered('all')} accessibilityRole="button">
              <Text style={styles.sectionLink} maxFontSizeMultiplier={1.15}>
                {t.allTasks}
              </Text>
            </Pressable>
          </View>

          {dashboardTasks.length === 0 && !workspaceLoading ? (
            <View style={styles.emptyDash}>
              <Ionicons name="clipboard-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyDashTitle} maxFontSizeMultiplier={1.15}>
                {t.noAssignmentsTitle}
              </Text>
              <Text style={styles.emptyDashSub} maxFontSizeMultiplier={1.1}>
                {t.noAssignmentsSub}
              </Text>
            </View>
          ) : null}

          {dashboardTasks.map((task, idx) => {
            const sc = statusColors(task.status);
            const statusText = inspectorDashboardStatusText(lang, task.status);
            const displayId = idx + 1;
            return (
              <Pressable
                key={task.id}
                onPress={() => router.push(`/inspector/tasks/${task.id}` as Href)}
                style={({ pressed }) => [styles.taskCard, pressed && { opacity: 0.96 }]}>
                <View
                  style={[
                    styles.priorityBar,
                    {
                      backgroundColor:
                        task.priority === 'high'
                          ? palette.primaryShade1
                          : task.priority === 'medium'
                            ? Brand.green
                            : palette.primaryTint1,
                    },
                  ]}
                />
                <View style={styles.taskTop}>
                  <Text style={[styles.statusPill, { backgroundColor: sc.bg, borderColor: sc.border, color: sc.text }]} maxFontSizeMultiplier={1.1}>
                    {statusText.toUpperCase()}
                  </Text>
                  <Text style={styles.taskIdMono}>#{displayId}</Text>
                </View>
                <Text style={styles.taskTitle} maxFontSizeMultiplier={1.2}>
                  {task.title}
                </Text>
                <Text style={styles.taskDecree} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                  {task.decreeTitle}
                </Text>
                <View style={styles.taskMetaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.metaText} maxFontSizeMultiplier={1.15}>
                      {task.region}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                    <Text
                      style={[styles.metaText, task.status === 'overdue' && { color: '#DC2626', fontWeight: '700' }]}
                      maxFontSizeMultiplier={1.15}>
                      {`Deadline ${task.deadline}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.taskFooter}>
                  <Text style={styles.prioSmall} maxFontSizeMultiplier={1.1}>
                    <Text style={styles.prioLabel}>{t.priority}: </Text>
                    <Text style={{ color: priorityColor(task.priority), fontWeight: '700', textTransform: 'uppercase' }}>
                      {inspectorPriorityLabel(lang, task.priority)}
                    </Text>
                  </Text>
                  <View style={[styles.ctaRow, lang !== 'en' && { flexDirection: 'row-reverse' }]}>
                    <Text style={styles.ctaText} maxFontSizeMultiplier={1.1}>
                      {ctaFor(task)}
                    </Text>
                    <Ionicons name={lang === 'en' ? 'chevron-forward' : 'chevron-back'} size={16} color={Brand.green} />
                  </View>
                </View>
              </Pressable>
            );
          })}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]} maxFontSizeMultiplier={1.15}>
            {t.recentActivity}
          </Text>
          <View style={styles.activityCard}>
            {recentActivity.length === 0 ? (
              <View style={styles.activityEmpty}>
                <Text style={styles.activityEmptyTxt} maxFontSizeMultiplier={1.1}>
                  {t.noRecentActivity}
                </Text>
              </View>
            ) : (
              recentActivity.map((row, idx) => {
                const icon: keyof typeof Ionicons.glyphMap =
                  row.kind === 'submitted'
                    ? 'send'
                    : row.kind === 'revision'
                      ? 'refresh'
                      : row.kind === 'finalized'
                        ? 'checkmark-circle'
                        : 'clipboard-outline';
                const tone: 'green' | 'blue' | 'purple' =
                  idx % 3 === 0 ? 'green' : idx % 3 === 1 ? 'blue' : 'purple';
                const timeLabel = row.time ? row.time.slice(0, 16).replace('T', ' ') : '';
                return <ActivityRow key={row.id} icon={icon} tone={tone} title={row.title} time={timeLabel} />;
              })
            )}
          </View>
          </View>
        </ScrollView>

        <InspectorBottomNav />
      </View>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  onPress,
  accessibilityHint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone: 'blue' | 'amber' | 'red' | 'gray';
  onPress: () => void;
  accessibilityHint?: string;
}) {
  const iconBg =
    tone === 'blue' ? palette.primaryWash : tone === 'amber' ? '#FFFBEB' : tone === 'red' ? '#FEF2F2' : '#F9FAFB';
  const iconColor =
    tone === 'blue' ? Brand.green : tone === 'amber' ? '#D97706' : tone === 'red' ? '#DC2626' : '#4B5563';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.statCard, pressed && { opacity: 0.94 }]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={accessibilityHint}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.statValue} maxFontSizeMultiplier={1.2}>
        {value}
      </Text>
      <Text style={styles.statLabel} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActivityRow({
  icon,
  tone,
  title,
  time,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'green' | 'blue' | 'purple';
  title: string;
  time: string;
}) {
  const bg =
    tone === 'green' ? '#ECFDF5' : tone === 'blue' ? palette.primaryWash : '#F5F3FF';
  const color =
    tone === 'green' ? '#059669' : tone === 'blue' ? Brand.green : '#7C3AED';
  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityTitle} maxFontSizeMultiplier={1.15}>
          {title}
        </Text>
        <Text style={styles.activityTime} maxFontSizeMultiplier={1.1}>
          {time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  columnRoot: {
    flex: 1,
    width: '100%',
    backgroundColor: HomeColors.pageBg,
  },
  safeTop: {
    backgroundColor: INSPECTOR_BAR_BG,
    ...inspectorHeaderShadow,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  dashboardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dashboardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  welcomeLine: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLine: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusLineOffline: {
    color: '#FBBF24',
  },
  dashboardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  dashboardRightRtl: {
    flexDirection: 'row-reverse',
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: INSPECTOR_LANG_CHIP_BG,
    borderWidth: 1,
    borderColor: INSPECTOR_LANG_CHIP_BORDER,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChipTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'lowercase',
  },
  bellWrap: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    end: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Brand.green,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  body: { flex: 1, width: '100%', minHeight: 0, backgroundColor: HomeColors.pageBg },
  scroll: { flex: 1, width: '100%', minHeight: 0 },
  scrollContent: { paddingTop: 16 },
  pageColumn: { alignSelf: 'center' },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    alignSelf: 'stretch',
    paddingVertical: 12,
    marginBottom: 8,
  },
  loadingTxt: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  errBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errBannerTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: '#92400E', lineHeight: 18 },
  emptyDash: { alignItems: 'center', paddingVertical: 28, width: '100%' },
  emptyDashTitle: { marginTop: 12, fontSize: 14, fontWeight: '800', color: '#6B7280' },
  emptyDashSub: { marginTop: 6, fontSize: 12, color: '#9CA3AF', textAlign: 'center', maxWidth: 280 },
  activityEmpty: { padding: 20, alignItems: 'center' },
  activityEmptyTxt: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  syncBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#92400E' },
  syncRetry: { fontSize: 10, fontWeight: '800', color: '#B45309', textTransform: 'uppercase' },
  syncInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    width: '100%',
    alignSelf: 'stretch',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  syncInfoText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#374151' },
  syncInfoCta: { fontSize: 11, fontWeight: '800', color: Brand.green },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    width: '100%',
    alignSelf: 'stretch',
  },
  statCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '47%',
    minWidth: 148,
    maxWidth: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 8,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  statLabel: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    width: '100%',
    alignSelf: 'stretch',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.2,
  },
  sectionLink: { fontSize: 12, fontWeight: '600', color: Brand.green },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.primaryWashBorder,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'stretch',
  },
  priorityBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  taskTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statusPill: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskIdMono: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  taskTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  taskDecree: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  taskMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#4B5563' },
  taskFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prioSmall: { fontSize: 10 },
  prioLabel: { color: '#9CA3AF', fontWeight: '800', textTransform: 'uppercase' },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaText: { fontSize: 12, fontWeight: '800', color: Brand.green },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginTop: 8,
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'stretch',
  },
  activityRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F9FAFB',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  activityTime: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
});
