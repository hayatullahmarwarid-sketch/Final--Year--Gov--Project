import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { palette } from '@/lib/theme';

import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useAppTranslation } from '@/hooks/use-app-translation';

export type MostViewedBarRow = {
  /** Decree id — use for list keys (display numbers can collide across categories). */
  id: string;
  label: string;
  value: number;
  fillPct: number;
  barColor: string;
  decreeNum: string;
  fullTitle: string;
  category: string;
  /** Primary category id (for donut filter). */
  categoryId?: string;
};

/** Placeholder palette used when the API-backed row omits a color. Distinct across positions. */
const BAR_COLORS = [
  palette.primary,
  palette.primaryShade1,
  palette.primaryShade2,
  palette.primaryTint1,
  palette.primaryTint2,
];

/**
 * Empty by default — real rows come from the dept-upload dashboard API (`topViewedDecrees`)
 * and are passed in via the `data` prop.
 */
export const MOST_VIEWED_ROWS: MostViewedBarRow[] = [];

function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}

type Props = {
  onSelectBar?: (row: MostViewedBarRow) => void;
  /** Primary category id from donut; only decrees in this category. */
  categoryFilter?: string | null;
  /** Data-driven rows (from `GET /dashboards/decree-upload`); empty => empty state. */
  data?: MostViewedBarRow[];
};

export function DeptUploadMostViewedCard({ onSelectBar, categoryFilter = null, data }: Props) {
  const c = useDeptUploadThemeColorsOptional();
  const { t } = useAppTranslation();
  const rows = useMemo(() => {
    let list = data ?? [];
    if (categoryFilter) {
      list = list.filter((r) => r.categoryId === categoryFilter);
    }
    const max = Math.max(...list.map((r) => r.value), 1);
    return list.map((r, idx) => ({
      ...r,
      barColor: r.barColor || BAR_COLORS[idx % BAR_COLORS.length],
      fillPct: Math.max(6, Math.round((r.value / max) * 100)),
    }));
  }, [categoryFilter, data]);

  return (
    <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
      <Text style={[styles.title, { color: c.textPrimary }]}>{t('deptMostViewedTitle')}</Text>
      <View style={styles.list}>
        {rows.length === 0 ? (
          <Text style={[styles.empty, { color: c.textMuted }]}>{t('deptMostViewedEmpty')}</Text>
        ) : (
          rows.map((row) => (
            <Pressable
              key={row.id}
              onPress={() => onSelectBar?.(row)}
              disabled={!onSelectBar}
              style={({ pressed }) => [styles.row, pressed && onSelectBar && styles.rowPressed]}
              accessibilityRole={onSelectBar ? 'button' : undefined}
              accessibilityLabel={t('deptMostViewedA11yRow', { title: row.fullTitle, views: formatNum(row.value) })}>
              <Text style={[styles.label, { color: c.textPrimary }]} numberOfLines={1}>
                {row.label}
              </Text>
              <View style={[styles.track, { backgroundColor: c.segmentTrack }]}>
                <View style={[styles.fill, { width: `${row.fillPct}%`, backgroundColor: row.barColor }]} />
              </View>
              <Text style={[styles.val, { color: c.textSecondary }]}>{formatNum(row.value)}</Text>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: DeptUploadDash.radiusLg,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 26,
    borderWidth: 1,
    ...DeptUploadDash.shadow,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },
  list: { gap: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowPressed: {
    opacity: 0.85,
  },
  label: {
    width: 112,
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    flex: 1,
    minWidth: 0,
    height: 15,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  val: {
    width: 48,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  empty: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
