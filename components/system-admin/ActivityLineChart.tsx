import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import type { ActivityPoint, ActivityPointDetail } from '@/data/system-admin-store';
import { Brand } from '@/constants/brand';
import { useAppTranslation } from '@/hooks/use-app-translation';

/** ViewBox width — must match `w` for hit-strip math. */
const VIEW_W = 320;
/** Wide vertical strip per bucket (viewBox units); easy tap without pixel hunting. */
/** Slightly narrower than bucket spacing (~45px in viewBox) so strips do not overlap. */
const HIT_STRIP_W = 40;

type Props = {
  data: ActivityPoint[];
  height?: number;
  dark?: boolean;
  requestsLabel?: string;
  loginsLabel?: string;
  /** Bucket breakdown from audit logs (real activity types). */
  getPointDetail?: (point: ActivityPoint) => ActivityPointDetail;
  tapHint?: string;
};

export function ActivityLineChart({
  data,
  height = 220,
  dark,
  requestsLabel,
  loginsLabel,
  getPointDetail,
  tapHint,
}: Props) {
  const { t } = useAppTranslation();
  const w = VIEW_W;
  const pad = { t: 16, r: 12, b: 28, l: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const [selected, setSelected] = useState<number | null>(null);

  const { reqPts, logPts, maxY, xLabels } = useMemo(() => {
    const reqs = data.map((d) => d.requests);
    const logs = data.map((d) => d.logins);
    const max = Math.max(1, ...reqs, ...logs);
    const n = Math.max(1, data.length - 1);
    const toX = (i: number) => pad.l + (i / n) * innerW;
    const toY = (v: number) => pad.t + innerH - (v / max) * innerH;
    const rp = data.map((d, i) => ({ x: toX(i), y: toY(d.requests) }));
    const lp = data.map((d, i) => ({ x: toX(i), y: toY(d.logins) }));
    return {
      maxY: max,
      reqPts: rp,
      logPts: lp,
      xLabels: data.map((d, i) => ({ x: toX(i), text: d.time, i })),
    };
  }, [data, innerH, innerW, pad.l, pad.t]);

  const selectIndex = (i: number) => {
    setSelected(i);
  };

  const axis = dark ? '#4B5563' : '#E5E7EB';
  const label = dark ? '#9CA3AF' : '#6B7280';
  const reqColor = Brand.green;
  const loginColor = Brand.gold;

  const reqLine = reqPts.map((p) => `${p.x},${p.y}`).join(' ');
  const logLine = logPts.map((p) => `${p.x},${p.y}`).join(' ');

  const sel = selected != null && data[selected] ? data[selected] : null;
  const detail = sel && getPointDetail ? getPointDetail(sel) : null;

  /** Strip extends through x-axis labels so taps near “Now” still register. */
  const hitStripTop = pad.t;
  const hitStripHeight = height - hitStripTop;

  return (
    <View style={styles.wrap}>
      <View style={[styles.chartHitLayer, { height }]} collapsable={Platform.OS === 'android' ? false : undefined}>
        <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
          <Line x1={pad.l} y1={pad.t + innerH} x2={w - pad.r} y2={pad.t + innerH} stroke={axis} strokeWidth={1} />
          <Line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke={axis} strokeWidth={1} />
          <SvgText x={4} y={pad.t + 4} fill={label} fontSize={9}>
            {maxY}
          </SvgText>
          <Polyline points={reqLine} fill="none" stroke={reqColor} strokeWidth={2} pointerEvents="none" />
          <Polyline
            points={logLine}
            fill="none"
            stroke={loginColor}
            strokeWidth={2}
            strokeDasharray="4 4"
            pointerEvents="none"
          />
          {reqPts.map((p, i) => (
            <Circle
              key={`r-${i}`}
              cx={p.x}
              cy={p.y}
              r={selected === i ? 6 : 4}
              fill={reqColor}
              pointerEvents="none"
            />
          ))}
          {logPts.map((p, i) => (
            <Circle
              key={`l-${i}`}
              cx={p.x}
              cy={p.y}
              r={selected === i ? 6 : 4}
              fill={loginColor}
              pointerEvents="none"
            />
          ))}
          {xLabels.map(({ x, text, i }) => (
            <SvgText
              key={`xl-${i}`}
              x={x}
              y={height - 8}
              fill={label}
              fontSize={9}
              textAnchor="middle"
              pointerEvents="none">
              {text}
            </SvgText>
          ))}
        </Svg>
        {data.map((row, i) => {
          const cx = reqPts[i].x;
          const leftPct = Math.max(0, ((cx - HIT_STRIP_W / 2) / w) * 100);
          const widthPct = Math.min(100 - leftPct, (HIT_STRIP_W / w) * 100);
          return (
            <Pressable
              key={`hit-strip-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`${row.time}. ${t('systemAdminActivityBucketA11y')}`}
              onPressIn={() => selectIndex(i)}
              onPress={() => selectIndex(i)}
              hitSlop={{ top: 12, bottom: 16, left: 8, right: 8 }}
              style={[
                styles.hitStrip,
                dark ? styles.hitStripDark : styles.hitStripLight,
                {
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  top: `${(hitStripTop / height) * 100}%`,
                  height: `${(hitStripHeight / height) * 100}%`,
                },
              ]}
            />
          );
        })}
      </View>
      {detail ? (
        <View style={[styles.tooltip, dark && styles.tooltipDark]} accessibilityRole="summary">
          <Text style={[styles.tooltipTitle, { color: dark ? '#F3F4F6' : '#111827' }]}>{detail.windowLabel}</Text>
          <Text style={[styles.tooltipRow, { color: label }]}>
            {requestsLabel}: {sel!.requests.toLocaleString()} · {loginsLabel}: {sel!.logins.toLocaleString()}
          </Text>
          <Text style={[styles.tooltipRow, { color: label }]}>
            {detail.totalActions === 1
              ? t('systemAdminActivityTooltipActionsOne')
              : t('systemAdminActivityTooltipActionsMany', { count: detail.totalActions })}
            {detail.loginActions > 0 ? t('systemAdminActivityTooltipLogins', { count: detail.loginActions }) : ''}
          </Text>
          {detail.topTypes.length > 0 ? (
            <View style={styles.topTypes}>
              <Text style={[styles.topTypesHeading, { color: dark ? '#D1D5DB' : '#374151' }]}>
                {t('systemAdminActivityTooltipTypes')}
              </Text>
              {detail.topTypes.map((r) => (
                <View key={r.label} style={styles.topTypeRow}>
                  <Text style={[styles.topTypeLabel, { color: dark ? '#E5E7EB' : '#1F2937' }]} numberOfLines={2}>
                    {r.label}
                  </Text>
                  <Text style={[styles.topTypeCount, { color: label }]}>{r.count.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          ) : detail.totalActions === 0 ? (
            <Text style={[styles.tooltipMuted, { color: label }]}>{t('systemAdminActivityTooltipEmpty')}</Text>
          ) : null}
        </View>
      ) : tapHint ? (
        <Text style={[styles.hint, { color: label }]}>{tapHint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center', gap: 8 },
  chartHitLayer: {
    width: '100%',
    position: 'relative',
  },
  hitStrip: {
    position: 'absolute',
    zIndex: 6,
    elevation: 4,
  },
  hitStripLight: {
    /** Near-transparent so Android still delivers touches to this view. */
    backgroundColor: 'rgba(11,79,46,0.03)',
  },
  hitStripDark: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tooltip: {
    alignSelf: 'stretch',
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  tooltipDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  tooltipTitle: { fontSize: 12, fontWeight: '800' },
  tooltipRow: { fontSize: 11, fontWeight: '600', lineHeight: 16 },
  tooltipMuted: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  topTypes: { marginTop: 4, gap: 4 },
  topTypesHeading: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  topTypeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  topTypeLabel: { fontSize: 11, fontWeight: '600', flex: 1 },
  topTypeCount: { fontSize: 11, fontWeight: '800' },
  hint: { fontSize: 11, fontWeight: '600', textAlign: 'center', paddingHorizontal: 8 },
});
