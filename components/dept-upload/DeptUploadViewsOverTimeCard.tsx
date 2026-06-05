import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Polyline, Text as SvgText } from 'react-native-svg';

import type { DecreeUploadDashboardDto } from '@/lib/api/decree-upload';
import type { MonthlyStatsDetail } from '@/components/dept-upload/MonthlyStatsModal';
import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { palette } from '@/lib/theme';

import { DeptUploadDash } from '@/constants/dept-upload-dashboard';

const W = 320;
const H = 200;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 36;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const LINE_VIEWS = palette.primary;
const LINE_UPLOADS = palette.primaryShade2;

function monthLabelFromKey(key: string): string {
  if (key.length < 7) return key;
  const m = Number(key.slice(5, 7)) - 1;
  const y = key.slice(0, 4);
  if (m >= 0 && m < 12) return `${MONTHS[m]} ${y}`;
  return key;
}

type Props = {
  dashboard: DecreeUploadDashboardDto | null;
  /** Selected category from donut; `null` = use top viewed category. */
  selectedCategoryId: string | null;
  onSelectMonth?: (detail: MonthlyStatsDetail) => void;
};

function pad12(xs: number[]): number[] {
  const a = [...xs];
  while (a.length < 12) a.push(0);
  return a.slice(0, 12);
}

function pickViewSeries(
  d: DecreeUploadDashboardDto | null,
  selectedCategoryId: string | null,
): { label: string; values: number[]; uploads: number[] } {
  if (!d) {
    return { label: '—', values: Array(12).fill(0), uploads: Array(12).fill(0) };
  }
  const uploads = pad12((d.uploadsByMonth12 ?? []).map((x) => x.count));
  const allViews = pad12((d.viewsByMonth12 ?? []).map((x) => x.count));
  const topId = d.topViewedCategoryId ?? d.categoryViewTrends?.[0]?.categoryId ?? null;
  const want = selectedCategoryId ?? topId;
  if (want && d.categoryViewTrends?.length) {
    const tr = d.categoryViewTrends.find((c) => c.categoryId === want);
    if (tr) {
      return { label: tr.name, values: pad12((tr.months ?? []).map((m) => m.count)), uploads };
    }
  }
  return { label: 'All views (unique)', values: allViews, uploads };
}

function yScale(v: number, ymax: number): number {
  const c = ymax > 0 ? Math.max(0, Math.min(v, ymax)) : 0;
  const t = ymax > 0 ? c / ymax : 0;
  return PAD_T + (1 - t) * (H - PAD_T - PAD_B);
}

function xScale(i: number, n: number): number {
  if (n <= 1) return PAD_L;
  return PAD_L + (i / (n - 1)) * (W - PAD_L - PAD_R);
}

export function DeptUploadViewsOverTimeCard({ dashboard, selectedCategoryId, onSelectMonth }: Props) {
  const c = useDeptUploadThemeColorsOptional();
  const { t } = useAppTranslation();
  const n = 12;
  const picked = useMemo(
    () => pickViewSeries(dashboard, selectedCategoryId),
    [dashboard, selectedCategoryId],
  );
  const { values, uploads, label } = picked;

  const ymax = useMemo(
    () => Math.max(1, ...values, ...uploads, 1),
    [values, uploads],
  );

  const gridLines = useMemo(
    () =>
      [0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const yl = Math.round(ymax * (1 - t));
        return { i, y: yScale(yl, ymax), label: yl.toLocaleString('en-US') };
      }),
    [ymax],
  );

  const aggregateViewsPts = useMemo(() => {
    return values.map((v, i) => `${xScale(i, n)},${yScale(v, ymax)}`).join(' ');
  }, [values, ymax, n]);

  const uploadsPts = useMemo(
    () => uploads.map((v, i) => `${xScale(i, n)},${yScale(v, ymax)}`).join(' '),
    [uploads, ymax, n],
  );

  const openMonth = useCallback(
    (monthIndex: number) => {
      if (!onSelectMonth) return;
      const mKey = (dashboard?.viewsByMonth12 ?? [])[monthIndex]?.month;
      onSelectMonth({
        periodLabel: mKey ? monthLabelFromKey(mKey) : `${MONTHS[monthIndex]} ${new Date().getFullYear()}`,
        totalViews: values[monthIndex] ?? 0,
        views: values[monthIndex] ?? 0,
        uploads: uploads[monthIndex] ?? 0,
      });
    },
    [onSelectMonth, values, uploads, dashboard?.viewsByMonth12],
  );

  return (
    <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
      <Text style={[styles.title, { color: c.textPrimary }]}>{t('deptViewsOverTimeTitle')}</Text>
      <Text style={[styles.sub, { color: c.chartSub }]} numberOfLines={2}>
        {t('deptViewsOverTimeSub', { label })}
      </Text>
      <View style={styles.chartArea} accessibilityElementsHidden={false}>
        <Svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          pointerEvents="none">
          {gridLines.map((g) => (
            <G key={`y-grid-${g.i}`}>
              <Line
                x1={PAD_L}
                y1={g.y}
                x2={W - PAD_R}
                y2={g.y}
                stroke={c.cardBorder}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <SvgText x={4} y={g.y + 4} fontSize={10} fill={c.chartSub} fontWeight="500">
                {g.label}
              </SvgText>
            </G>
          ))}
          <Polyline points={aggregateViewsPts} fill="none" stroke={LINE_VIEWS} strokeWidth={2.5} />
          <Polyline points={uploadsPts} fill="none" stroke={LINE_UPLOADS} strokeWidth={2.5} />
          {MONTHS.map((m, i) => {
            const key = (dashboard?.viewsByMonth12 ?? [])[i]?.month;
            const short =
              key && key.length >= 7 ? `${MONTHS[Number(key.slice(5, 7)) - 1] ?? m}` : `${m}`;
            return (
              <SvgText
                key={`${key ?? m}-${i}`}
                x={xScale(i, n)}
                y={H - 8}
                fontSize={8}
                fill={c.chartSub}
                textAnchor="middle"
                fontWeight="500">
                {short}
              </SvgText>
            );
          })}
        </Svg>
        {onSelectMonth ? (
          <View style={styles.monthHitLayer} pointerEvents="box-none">
            <View style={styles.monthHitRow}>
              {MONTHS.map((_, i) => (
                <Pressable
                  key={`hit-${i}`}
                  accessibilityRole="button"
                  onPress={() => openMonth(i)}
                  style={styles.monthHitCell}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: LINE_VIEWS }]} />
          <Text style={[styles.legendTxt, { color: c.textSecondary }]}>{t('deptPreviewViewsLabel')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: LINE_UPLOADS }]} />
          <Text style={[styles.legendTxt, { color: c.textSecondary }]}>{t('deptMonthlyStatsUploads')}</Text>
        </View>
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
  },
  sub: {
    fontSize: 12,
    marginTop: 6,
    marginBottom: 8,
  },
  chartArea: {
    position: 'relative',
    width: '100%',
    height: H,
  },
  monthHitLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  monthHitRow: {
    flex: 1,
    flexDirection: 'row',
    height: H,
  },
  monthHitCell: {
    flex: 1,
    height: '100%',
    /** Slight wash so Android delivers touches reliably inside the hit strip. */
    backgroundColor: 'rgba(0,136,255,0.02)',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendSwatch: {
    width: 18,
    height: 3,
    borderRadius: 2,
  },
  legendTxt: {
    fontSize: 12,
    fontWeight: '600',
  },
});
