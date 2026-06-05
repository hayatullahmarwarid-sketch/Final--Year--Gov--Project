import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { FormColors } from '@/constants/form';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { palette } from '@/lib/theme';

type Row = { name: string; count: number };

const BAR_COLORS = [
  Brand.green,
  palette.primaryShade1,
  palette.primaryShade2,
  palette.primaryTint1,
  palette.primaryTint2,
  Brand.goldMuted,
];

export function DashboardCategoryBars({ rows }: { rows: Row[] }) {
  const { t } = useAppTranslation();
  const max = useMemo(() => Math.max(...rows.map((r) => r.count), 1), [rows]);
  if (!rows.length) {
    return <Text style={styles.empty}>{t('deptNoCategoryDataYet')}</Text>;
  }
  return (
    <View style={styles.wrap}>
      {rows.map((row, i) => {
        const pct = (row.count / max) * 100;
        const color = BAR_COLORS[i % BAR_COLORS.length];
        return (
          <View key={row.name + i} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {row.name}
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.val}>{row.count}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  empty: { fontSize: 13, color: FormColors.subtitle, textAlign: 'center', paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { width: 100, fontSize: 12, color: DeptUploadDash.mutedText },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: DeptUploadDash.chart.track,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  val: { width: 36, fontSize: 12, color: FormColors.subtitle, textAlign: 'right' },
});
