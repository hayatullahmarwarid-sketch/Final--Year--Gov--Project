import { Ionicons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DashboardActivityChart } from '@/components/inspector-admin/DashboardActivityChart';
import { AppPressable } from '@/components/ui/AppPressable';
import { useAuthSession } from '@/contexts/auth-session-context';
import {
  averageSubmissionScorePct,
  buildDashboardAreaData,
  displayFromUsername,
} from '@/data/inspector-admin-store';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useInspectorAdminWorkspace } from '@/hooks/use-inspector-admin-workspace';
import {
  Brand,
  FormColors,
  palette,
  radius,
  semantic,
  shadowCard,
  spacing,
  touchTarget,
  typography,
} from '@/lib/theme';

type TrendTone = 'up' | 'down' | 'neutral' | 'new';

type StatCardData = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconWash: string;
  iconColor: string;
  label: string;
  value: string;
  trendLabel: string;
  trendTone: TrendTone;
};

function trendStyles(tone: TrendTone) {
  switch (tone) {
    case 'up':
      return { bg: 'rgba(22, 163, 74, 0.12)', fg: palette.success };
    case 'down':
      return { bg: 'rgba(185, 28, 28, 0.10)', fg: semantic.errorText };
    case 'new':
      return { bg: 'rgba(212, 175, 55, 0.16)', fg: '#92400E' };
    case 'neutral':
    default:
      return { bg: palette.neutral100, fg: FormColors.subtitle };
  }
}

export default function InspectorAdminHomeScreen() {
  const { t, number } = useAppTranslation();
  const ws = useInspectorAdminWorkspace();
  const { loading, error, usesLiveApi, dashboard } = ws;
  const { accountKey } = useAuthSession();

  const displayName = useMemo(
    () =>
      displayFromUsername(
        (accountKey?.replace(/^inspadm_/, '') ?? 'inspector').replace(/_/g, ' '),
      ),
    [accountKey],
  );

  const areaSeries = useMemo(() => {
    if (usesLiveApi && dashboard && Array.isArray(dashboard.activityLast7Days)) {
      return (dashboard.activityLast7Days as { day: string; chartVal: number }[]).map((d) => ({
        day: d.day,
        val: d.chartVal,
      }));
    }
    return buildDashboardAreaData(ws.submissions, ws.assignments);
  }, [usesLiveApi, dashboard, ws.submissions, ws.assignments]);

  const activeInspections = useMemo(
    () => ws.assignments.filter((a) => a.status === 'pending' || a.status === 'in_progress').length,
    [ws.assignments],
  );
  const overdueItems = useMemo(
    () => ws.assignments.filter((a) => a.status === 'overdue').length,
    [ws.assignments],
  );
  const pendingReviews = useMemo(
    () => ws.submissions.filter((s) => s.status === 'pending').length,
    [ws.submissions],
  );
  const avgScore =
    usesLiveApi && dashboard && typeof dashboard.avgSubmissionScorePct === 'string'
      ? (dashboard.avgSubmissionScorePct as string)
      : averageSubmissionScorePct(ws.submissions);

  const totalAssignments = ws.assignments.length;
  const activePct = totalAssignments > 0 ? Math.round((activeInspections / totalAssignments) * 100) : 0;
  const overduePct = totalAssignments > 0 ? Math.round((overdueItems / totalAssignments) * 100) : 0;
  const avgNumeric = parseInt(String(avgScore).replace(/[^0-9]/g, ''), 10);
  const avgDelta = Number.isFinite(avgNumeric) ? avgNumeric - 100 : 0;

  const stats: StatCardData[] = [
    {
      key: 'active',
      icon: 'clipboard-outline',
      iconWash: palette.primaryAlpha.a10,
      iconColor: Brand.green,
      label: t('dashStatActiveInspections'),
      value: number(activeInspections),
      trendLabel: activePct > 0 ? `+${activePct}%` : t('dashTrendZero'),
      trendTone: activePct > 0 ? 'up' : 'neutral',
    },
    {
      key: 'overdue',
      icon: 'alert-circle-outline',
      iconWash: 'rgba(185, 28, 28, 0.10)',
      iconColor: semantic.errorText,
      label: t('dashStatOverdueItems'),
      value: number(overdueItems),
      trendLabel: overduePct > 0 ? `+${overduePct}%` : t('dashTrendZero'),
      trendTone: overduePct > 0 ? 'down' : 'neutral',
    },
    {
      key: 'pending',
      icon: 'time-outline',
      iconWash: 'rgba(202, 138, 4, 0.14)',
      iconColor: '#B45309',
      label: t('dashStatPendingReviews'),
      value: number(pendingReviews),
      trendLabel: pendingReviews > 0 ? t('dashTrendNew') : t('dashTrendZero'),
      trendTone: pendingReviews > 0 ? 'new' : 'neutral',
    },
    {
      key: 'avg',
      icon: 'checkmark-circle-outline',
      iconWash: 'rgba(22, 163, 74, 0.12)',
      iconColor: palette.success,
      label: t('dashStatAvgScore'),
      value: avgScore,
      trendLabel: avgDelta === 0 ? t('dashTrendZero') : `${avgDelta > 0 ? '+' : ''}${avgDelta}%`,
      trendTone: avgDelta < 0 ? 'down' : avgDelta > 0 ? 'up' : 'neutral',
    },
  ];

  const goToTemplates = () => router.push('/inspector-admin/templates' as Href);
  const goToExams = () => router.push('/inspector-admin/exams' as Href);
  const goToNewAssignment = () =>
    router.push({ pathname: '/inspector-admin/assignments', params: { open: 'single' } } as Href);
  const goToBulkAssignment = () =>
    router.push({ pathname: '/inspector-admin/assignments', params: { open: 'bulk' } } as Href);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {loading ? <ActivityIndicator color={Brand.green} style={styles.loader} /> : null}
      {error ? (
        <Text style={styles.errNote} maxFontSizeMultiplier={1.1}>
          {error}
        </Text>
      ) : null}

      {/* --- Stat grid --- */}
      <View style={styles.statGrid}>
        {stats.map((s) => {
          const trend = trendStyles(s.trendTone);
          return (
            <View key={s.key} style={[styles.statCard, shadowCard()]}>
              <View style={styles.statTop}>
                <View style={[styles.statIcon, { backgroundColor: s.iconWash }]}>
                  <Ionicons name={s.icon} size={18} color={s.iconColor} />
                </View>
                <View style={[styles.trendPill, { backgroundColor: trend.bg }]}>
                  <Text style={[styles.trendText, { color: trend.fg }]} maxFontSizeMultiplier={1.1}>
                    {s.trendLabel}
                  </Text>
                </View>
              </View>
              <Text style={styles.statValue} maxFontSizeMultiplier={1.2}>
                {s.value}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {s.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* --- Recent Activity Trend --- */}
      <View style={[styles.chartCard, shadowCard()]}>
        <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.2}>
          {t('dashSectionRecentActivity').toUpperCase()}
        </Text>
        <DashboardActivityChart data={areaSeries} />
      </View>

      {/* --- Quick Actions (dark) --- */}
      <View style={styles.quickCard}>
        <Text style={styles.quickTitle} maxFontSizeMultiplier={1.2}>
          {t('dashSectionQuickActions')}
        </Text>

        <View style={styles.quickToggle}>
          <AppPressable
            onPress={goToNewAssignment}
            style={[styles.quickToggleBtn, styles.quickToggleBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={t('dashQuickSingle')}>
            <Ionicons name="person-add-outline" size={16} color="#5B3B05" />
            <Text style={[styles.quickToggleTxt, styles.quickToggleTxtActive]} maxFontSizeMultiplier={1.15}>
              {t('dashQuickSingle')}
            </Text>
          </AppPressable>
          <AppPressable
            onPress={goToBulkAssignment}
            style={[styles.quickToggleBtn, styles.quickToggleBtnActiveLight]}
            accessibilityRole="button"
            accessibilityLabel={t('dashQuickBulk')}>
            <Ionicons name="layers-outline" size={16} color={Brand.green} />
            <Text style={[styles.quickToggleTxt, styles.quickToggleTxtActiveLight]} maxFontSizeMultiplier={1.15}>
              {t('dashQuickBulk')}
            </Text>
          </AppPressable>
        </View>

        <AppPressable
          onPress={goToTemplates}
          style={styles.quickAction}
          accessibilityRole="button"
          accessibilityLabel={t('dashQuickNewTemplate')}>
          <Ionicons name="add" size={18} color={palette.white} />
          <Text style={styles.quickActionTxt} maxFontSizeMultiplier={1.15}>
            {t('dashQuickNewTemplate')}
          </Text>
        </AppPressable>

        <AppPressable
          onPress={goToExams}
          style={[styles.quickAction, styles.quickActionGhost]}
          accessibilityRole="button"
          accessibilityLabel={t('dashQuickBuildExam')}>
          <Ionicons name="school-outline" size={18} color={palette.white} />
          <Text style={styles.quickActionTxt} maxFontSizeMultiplier={1.15}>
            {t('dashQuickBuildExam')}
          </Text>
        </AppPressable>

        <Text style={styles.quickFooter} maxFontSizeMultiplier={1.15}>
          {t('dashLoggedInAs', { name: displayName })}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: FormColors.pageMuted,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  loader: {
    alignSelf: 'center',
  },
  errNote: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '600',
  },

  /* --- Stat grid --- */
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 140,
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendPill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 999,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statValue: {
    marginTop: spacing.md,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    color: FormColors.title,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: FormColors.subtitle,
  },

  /* --- Chart card --- */
  chartCard: {
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: FormColors.title,
  },

  /* --- Quick actions (dark green) --- */
  quickCard: {
    backgroundColor: Brand.green,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  quickTitle: {
    color: palette.white,
    ...typography.subtitle,
    fontWeight: '800',
    marginBottom: spacing.xxs,
  },
  quickToggle: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  quickToggleBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: touchTarget.min,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  quickToggleBtnActive: {
    backgroundColor: palette.white,
    borderColor: palette.white,
  },
  quickToggleBtnActiveLight: {
    backgroundColor: palette.white,
    borderColor: palette.white,
  },
  quickToggleTxt: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  quickToggleTxtActive: {
    color: Brand.green,
  },
  quickToggleTxtActiveLight: {
    color: Brand.green,
  },
  quickAction: {
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  quickActionGhost: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  quickActionTxt: {
    color: palette.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  quickFooter: {
    marginTop: spacing.xxs,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
});
