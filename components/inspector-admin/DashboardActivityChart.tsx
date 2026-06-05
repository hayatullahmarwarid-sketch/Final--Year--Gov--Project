import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { Brand, palette } from '@/lib/theme';

export type ActivityPoint = { day: string; val: number };

/**
 * Recent-activity area chart with labeled x + y axes and subtle gridlines.
 * Matches the "Dashboard" widget style used on the Inspector Admin home screen.
 */
export function DashboardActivityChart({
  data,
  height = 200,
  color = Brand.green,
}: {
  data: ActivityPoint[];
  height?: number;
  color?: string;
}) {
  const w = 320;
  const pad = { t: 12, r: 16, b: 28, l: 32 };
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const { linePath, fillPath, yTicks, xLabels } = useMemo(() => {
    const ys = data.map((d) => Number(d.val ?? 0));
    const rawMax = Math.max(4, ...ys);
    // Round up to the next multiple of 4 so ticks land on 0, 4, 8, 12, 16…
    const maxY = Math.ceil(rawMax / 4) * 4;
    const n = Math.max(1, data.length - 1);
    const pts = data.map((d, i) => {
      const x = pad.l + (i / n) * innerW;
      const y = pad.t + innerH - (Number(d.val ?? 0) / maxY) * innerH;
      return { x, y };
    });
    const baseY = pad.t + innerH;
    const first = pts[0] ?? { x: pad.l, y: baseY };
    const last = pts[pts.length - 1] ?? first;
    const line = `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
    const fill = `M ${first.x} ${baseY} L ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${last.x} ${baseY} Z`;

    const step = maxY / 4;
    const ticks = Array.from({ length: 5 }, (_, i) => {
      const value = Math.round(maxY - i * step);
      const y = pad.t + (i * innerH) / 4;
      return { value, y };
    });

    const labels = data.map((d, i) => ({
      text: d.day,
      x: pad.l + (i / n) * innerW,
    }));

    return { linePath: line, fillPath: fill, yTicks: ticks, xLabels: labels };
  }, [data, innerH, innerW, pad.b, pad.l, pad.r, pad.t]);

  const gridColor = palette.neutral200;
  const labelColor = palette.neutral400;

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
        {yTicks.map((tick, i) => (
          <Line
            key={`g-${i}`}
            x1={pad.l}
            x2={w - pad.r}
            y1={tick.y}
            y2={tick.y}
            stroke={gridColor}
            strokeWidth={0.5}
          />
        ))}
        {yTicks.map((tick, i) => (
          <SvgText
            key={`ty-${i}`}
            x={pad.l - 8}
            y={tick.y + 4}
            fill={labelColor}
            fontSize={10}
            fontWeight="600"
            textAnchor="end">
            {String(tick.value)}
          </SvgText>
        ))}
        <Path d={fillPath} fill={color} fillOpacity={0.15} />
        <Path d={linePath} stroke={color} strokeWidth={2} fill="none" />
        {xLabels.map((label, i) => (
          <SvgText
            key={`tx-${i}`}
            x={label.x}
            y={height - 6}
            fill={labelColor}
            fontSize={10}
            fontWeight="600"
            textAnchor="middle">
            {label.text}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'stretch',
  },
});
