import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import type { Incident } from '@/data/inspector-admin-store';

const REGION_ROWS = [
  { id: 'central', short: 'Kabul', cx: 160, cy: 95 },
  { id: 'south', short: 'Kandahar', cx: 125, cy: 155 },
  { id: 'west', short: 'Herat', cx: 85, cy: 115 },
  { id: 'north', short: 'Balkh', cx: 115, cy: 55 },
  { id: 'east', short: 'Nangarhar', cx: 205, cy: 115 },
] as const;

type Props = {
  incidents: Incident[];
  complianceByRegionId: Record<string, number>;
  selectedRegionId: string | null;
  onRegionSelect: (id: string | null) => void;
  caption: string;
  onViewRawData?: () => void;
};

/** Native substitute for web `LiveRegionalMap` — SVG schematic + regional list (no `react-native-maps` dependency). */
export function RegionalComplianceMap({
  incidents,
  complianceByRegionId,
  selectedRegionId,
  onRegionSelect,
  caption,
  onViewRawData,
}: Props) {
  const openCount = incidents.filter((i) => i.status !== 'resolved').length;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Regional overview</Text>
        <Text style={styles.caption}>{caption}</Text>
        {onViewRawData ? (
          <Pressable onPress={onViewRawData} style={styles.linkBtn}>
            <Text style={styles.linkTxt}>Raw export →</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.mapBox}>
        <Svg width="100%" height={200} viewBox="0 0 260 200">
          <Path
            d="M40 100 Q80 40 130 50 T220 90 Q240 130 200 170 Q140 190 80 170 Q30 140 40 100 Z"
            fill="#F0FDF4"
            stroke="#BBF7D0"
            strokeWidth={1}
          />
          {REGION_ROWS.map((r) => {
            const selected = selectedRegionId === r.id;
            const pct = complianceByRegionId[r.id] ?? 70;
            const hue = pct > 85 ? Brand.green : pct > 70 ? Brand.gold : '#EF4444';
            return (
              <React.Fragment key={r.id}>
                <Circle
                  cx={r.cx * 0.72}
                  cy={r.cy * 0.85}
                  r={selected ? 14 : 10}
                  fill={hue}
                  opacity={selected ? 1 : 0.85}
                />
                <Line x1={r.cx * 0.72} y1={r.cy * 0.85} x2={r.cx * 0.72 + 18} y2={r.cy * 0.85 - 18} stroke="#D1D5DB" strokeWidth={1} />
              </React.Fragment>
            );
          })}
        </Svg>
        <Text style={styles.mapHint}>{openCount} open incidents · use the chips below to filter</Text>
      </View>

      <View style={styles.legendRow}>
        {REGION_ROWS.map((r) => {
          const val = complianceByRegionId[r.id] ?? 0;
          const on = selectedRegionId === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => onRegionSelect(on ? null : r.id)}
              style={[styles.legendChip, on && styles.legendChipOn]}>
              <Text style={[styles.legendTxt, on && styles.legendTxtOn]}>
                {r.short} {val}%
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
  },
  head: { marginBottom: 10 },
  title: { fontSize: 14, fontWeight: '800', color: FormColors.title },
  caption: { fontSize: 11, color: FormColors.subtitle, marginTop: 4 },
  linkBtn: { marginTop: 8, alignSelf: 'flex-start' },
  linkTxt: { fontSize: 11, fontWeight: '700', color: Brand.green },
  mapBox: { alignItems: 'center', marginVertical: 8 },
  mapHint: { fontSize: 10, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  legendChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  legendChipOn: { backgroundColor: 'rgba(11,79,46,0.1)', borderColor: Brand.green },
  legendTxt: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  legendTxtOn: { color: Brand.green },
});
