import { Ionicons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityDetailsModal, type ActivityDetailsPayload } from '@/components/dept-upload/ActivityDetailsModal';
import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { Brand } from '@/lib/theme';

import { DeptUploadDash } from '@/constants/dept-upload-dashboard';

export type ActivityRow = {
  key: string;
  verb: string;
  title: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
  performedBy: string;
  timeLabel: string;
  details: string;
};

/** Rows appended from Pending Actions → Reject flow (same shape as activity list). */
export type RejectActivityAppend = ActivityRow;

/**
 * Fallback rows — intentionally empty. Real activity feed rows come from the backend via
 * the dept-upload dashboard DTO (`recentActivity`) and are passed in via `feed`. The
 * `appendedActivities` prop still renders locally-created rows (e.g. after a rejection
 * from the Pending Actions card) so the user sees immediate feedback without a refetch.
 */
const ROWS: ActivityRow[] = [];

function toPayload(r: ActivityRow): ActivityDetailsPayload {
  return {
    verb: r.verb,
    decreeTitle: r.title,
    performedBy: r.performedBy,
    timeLabel: r.timeLabel,
    details: r.details,
    icon: r.icon,
    iconBoxBg: r.bg,
    iconColor: r.color,
  };
}

type Props = {
  /** Rejections from pending table (listed only here, not elsewhere). */
  appendedActivities?: ActivityRow[];
};

export function DeptUploadRecentActivityCard({
  appendedActivities = [],
  feed = [],
}: Props & { feed?: ActivityRow[] }) {
  const c = useDeptUploadThemeColorsOptional();
  const { t } = useAppTranslation();
  const [activity, setActivity] = useState<ActivityDetailsPayload | null>(null);

  const listRows = useMemo(() => [...appendedActivities, ...feed, ...ROWS], [appendedActivities, feed]);

  const openActivity = useCallback((r: ActivityRow) => {
    setActivity(toPayload(r));
  }, []);

  const closeActivity = useCallback(() => setActivity(null), []);

  return (
    <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('deptRecentActivityTitle')}</Text>
          <View style={styles.redDot} />
        </View>
        <Pressable onPress={() => router.push('/dept-upload/decrees' as Href)} hitSlop={8}>
          <Text style={styles.viewAll}>{t('deptViewAllLink')}</Text>
        </Pressable>
      </View>
      {listRows.length === 0 ? (
        <Text style={[styles.emptyText, { color: c.textMuted }]}>
          {t('deptNoActivityYet')}
        </Text>
      ) : (
        listRows.map((r) => (
          <Pressable key={r.key} style={[styles.row, { borderTopColor: c.rowDivider }]} onPress={() => openActivity(r)}>
            <View style={[styles.iconBox, { backgroundColor: r.bg }]}>
              <Ionicons name={r.icon} size={20} color={r.color} />
            </View>
            <View style={styles.mid}>
              <Text style={[styles.line, { color: c.textPrimary }]} numberOfLines={3}>
                <Text style={styles.verb}>{r.verb}: </Text>
                {r.title}
              </Text>
              <Text style={[styles.meta, { color: c.textMuted }]} numberOfLines={1}>
                {r.meta}
              </Text>
            </View>
            <Text style={[styles.chev, { color: c.cardBorder }]}>›</Text>
          </Pressable>
        ))
      )}

      <ActivityDetailsModal visible={activity != null} activity={activity} onClose={closeActivity} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.green,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: { flex: 1, minWidth: 0 },
  line: {
    fontSize: 13,
    fontWeight: '600',
  },
  verb: { fontWeight: '800' },
  meta: {
    fontSize: 12,
    marginTop: 4,
  },
  chev: {
    fontSize: 20,
    fontWeight: '300',
  },
  emptyText: {
    fontSize: 13,
    paddingVertical: 14,
    textAlign: 'center',
  },
});
