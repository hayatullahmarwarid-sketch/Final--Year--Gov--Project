import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { useAppTranslation } from '@/hooks/use-app-translation';
import { Brand, palette, radius, spacing } from '@/lib/theme';

type Point = { q: string; imp: number };

type Props = {
  series: Point[];
  netGainLabel: string;
  up: boolean;
  /** Override the gold line color (e.g. when filtered by region). */
  accentColor?: string;
  /** Override the dark green card background (e.g. when filtered by region). */
  backgroundColor?: string;
  /** Replaces the default `QUARTERLY IMPLEMENTATION DELTA` title when set. */
  heading?: string;
};

/**
 * Dark-green card with the quarterly implementation delta line chart.
 * Includes labeled y-axis, rounded gold line, and a muted ghost bar
 * chart icon on the right for visual rhythm.
 */
export function QuarterlyImplementationCard({
  series,
  netGainLabel,
  up,
  accentColor,
  backgroundColor,
  heading,
}: Props) {
  const { t, number } = useAppTranslation();
  const lineColor = accentColor ?? Brand.gold;
  const cardBg = backgroundColor ?? Brand.green;
  const [activePointIdx, setActivePointIdx] = useState<number | null>(null);

  const width = 340;
  const height = 210;
  const pad = { t: 18, r: 24, b: 36, l: 36 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const chart = useMemo(() => {
    const data = series.length > 0 ? series : [{ q: 'Q1', imp: 0 }];
    const values = data.map((p) => Number(p.imp ?? 0));
    const rawMax = Math.max(20, ...values);
    const maxY = Math.ceil(rawMax / 20) * 20;
    const minY = 0;
    const range = Math.max(1, maxY - minY);
    const n = Math.max(1, data.length - 1);

    const pts = data.map((p, i) => {
      const x = pad.l + (i / n) * innerW;
      const y = pad.t + innerH - ((Number(p.imp ?? 0) - minY) / range) * innerH;
      return { x, y, q: p.q };
    });

    const line = `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`;

    const step = maxY / 4;
    const ticks = Array.from({ length: 5 }, (_, i) => {
      const value = Math.max(0, Math.round(maxY - i * step));
      const y = pad.t + (i * innerH) / 4;
      return { value, y };
    });

    return { line, pts, ticks, data };
  }, [innerH, innerW, pad.b, pad.l, pad.r, pad.t, series]);

  const gridColor = 'rgba(255, 255, 255, 0.14)';
  const labelColor = 'rgba(255, 255, 255, 0.58)';

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.2}>
          {(heading ?? t('trackingQuarterlyHeading')).toUpperCase()}
        </Text>
        <Ionicons name="bar-chart-outline" size={26} color="rgba(255, 255, 255, 0.16)" />
      </View>

      <View style={styles.chartWrap}>
        <View style={[styles.chartFrame, { height }]}>
          <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} pointerEvents="none">
            {chart.ticks.map((tk, i) => (
              <Line
                key={`g-${i}`}
                x1={pad.l}
                x2={width - pad.r}
                y1={tk.y}
                y2={tk.y}
                stroke={gridColor}
                strokeWidth={0.6}
              />
            ))}
            {chart.ticks.map((tk, i) => (
              <SvgText
                key={`yl-${i}`}
                x={pad.l - 8}
                y={tk.y + 4}
                fill={labelColor}
                fontSize={11}
                fontWeight="600"
                textAnchor="end">
                {number(tk.value)}
              </SvgText>
            ))}
            <Path d={chart.line} stroke={lineColor} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            {chart.pts.map((p, i) => (
              <Circle
                key={`pt-${i}`}
                cx={p.x}
                cy={p.y}
                r={activePointIdx === i ? 5.5 : 4}
                fill={cardBg}
                stroke={lineColor}
                strokeWidth={2}
              />
            ))}
            {chart.pts.map((p, i) => (
              <SvgText
                key={`xl-${i}`}
                x={p.x}
                y={height - 10}
                fill={labelColor}
                fontSize={10}
                fontWeight="700"
                textAnchor="middle">
                {p.q}
              </SvgText>
            ))}
          </Svg>
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {chart.pts.map((p, i) => (
              <Pressable
                key={`pt-hit-${i}`}
                accessibilityRole="button"
                onPressIn={() => setActivePointIdx(i)}
                onPress={() => setActivePointIdx(i)}
                hitSlop={8}
                style={[
                  styles.pointHit,
                  {
                    left: `${(p.x / width) * 100}%`,
                    top: `${(p.y / height) * 100}%`,
                  },
                ]}
              />
            ))}
          </View>
          {activePointIdx !== null && chart.pts[activePointIdx] ? (
            (() => {
              const p = chart.pts[activePointIdx];
              const row = chart.data[activePointIdx] as Point | undefined;
              const tip = `${String(row?.q ?? '')} · ${number(Math.round(Number(row?.imp ?? 0)))}%`;
              const tw = Math.min(160, Math.max(100, tip.length * 7));
              const leftPct = Math.max(0, Math.min(100 - (tw / width) * 100, ((p.x - tw / 2) / width) * 100));
              const topPct = Math.max(0, Math.min(100 - 18, ((p.y - 36) / height) * 100));
              return (
                <View
                  pointerEvents="none"
                  style={[
                    styles.pointTooltip,
                    {
                      width: tw,
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                    },
                  ]}>
                  <Text style={styles.pointTooltipTxt} numberOfLines={1}>
                    {tip}
                  </Text>
                </View>
              );
            })()
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Ionicons name={up ? 'trending-up' : 'trending-down'} size={18} color={lineColor} />
          <Text style={styles.footerTitle} numberOfLines={2} maxFontSizeMultiplier={1.15}>
            {t('trackingNetGain', { delta: netGainLabel })}
          </Text>
        </View>
        <Text style={styles.footerRight} numberOfLines={2} maxFontSizeMultiplier={1.15}>
          {t('trackingQuarterlyFooter').toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.green,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    color: palette.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  chartWrap: {
    width: '100%',
  },
  chartFrame: {
    width: '100%',
    position: 'relative',
    alignSelf: 'stretch',
  },
  pointHit: {
    position: 'absolute',
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pointTooltip: {
    position: 'absolute',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  pointTooltipTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  footerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: palette.white,
    letterSpacing: 0.2,
  },
  footerRight: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: 'rgba(255, 255, 255, 0.58)',
    textAlign: 'right',
    maxWidth: 120,
  },
});
