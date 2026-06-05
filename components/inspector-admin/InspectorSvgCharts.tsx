import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Polyline } from 'react-native-svg';

import { Brand } from '@/constants/brand';

type Point = { day?: string; q?: string; val?: number; imp?: number };

export function InspectorAreaChart({
  data,
  xKey,
  yKey,
  height = 180,
  color = Brand.green,
}: {
  data: Point[];
  xKey: 'day' | 'q';
  yKey: 'val' | 'imp';
  height?: number;
  color?: string;
}) {
  const w = 320;
  const pad = { t: 12, r: 8, b: 28, l: 8 };
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const { linePath, fillPath } = useMemo(() => {
    const ys = data.map((d) => Number(d[yKey] ?? 0));
    const maxY = Math.max(1, ...ys);
    const n = Math.max(1, data.length - 1);
    const pts = data.map((d, i) => {
      const x = pad.l + (i / n) * innerW;
      const y = pad.t + innerH - (Number(d[yKey] ?? 0) / maxY) * innerH;
      return { x, y };
    });
    const baseY = pad.t + innerH;
    const fill = `M ${pts[0].x} ${baseY} L ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${pts[pts.length - 1].x} ${baseY} Z`;
    const dPath = `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
    return { linePath: dPath, fillPath: fill };
  }, [data, innerH, innerW, pad.l, pad.t, yKey]);

  const axis = '#E5E7EB';

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
        <Line x1={pad.l} y1={pad.t + innerH} x2={w - pad.r} y2={pad.t + innerH} stroke={axis} strokeWidth={1} />
        <Path d={fillPath} fill={color} fillOpacity={0.18} />
        <Path d={linePath} stroke={color} strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
}

export function InspectorLineChart({
  data,
  xKey,
  yKey,
  height = 200,
  lineColor = Brand.gold,
  dark,
}: {
  data: Point[];
  xKey: 'day' | 'q';
  yKey: 'val' | 'imp';
  height?: number;
  lineColor?: string;
  dark?: boolean;
}) {
  const w = 320;
  const pad = { t: 16, r: 8, b: 28, l: 8 };
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const poly = useMemo(() => {
    const ys = data.map((d) => Number(d[yKey] ?? 0));
    const maxY = Math.max(1, ...ys);
    const n = Math.max(1, data.length - 1);
    return data
      .map((d, i) => {
        const x = pad.l + (i / n) * innerW;
        const y = pad.t + innerH - (Number(d[yKey] ?? 0) / maxY) * innerH;
        return `${x},${y}`;
      })
      .join(' ');
  }, [data, innerH, innerW, pad.l, pad.t, yKey]);

  const axis = dark ? '#374151' : '#E5E7EB';

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
        <Line x1={pad.l} y1={pad.t + innerH} x2={w - pad.r} y2={pad.t + innerH} stroke={axis} strokeWidth={1} />
        <Polyline points={poly} fill="none" stroke={lineColor} strokeWidth={2} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center' },
});
