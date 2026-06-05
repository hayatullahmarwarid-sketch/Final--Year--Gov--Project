import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';

import { DeptUploadDash } from '@/constants/dept-upload-dashboard';

const R = 52;
const STROKE = 22;
const CX = 70;
const CY = 70;
const CIRC = 2 * Math.PI * R;

const COLORS = ['#047857', '#FB7185', '#FACC15', '#80c7ff', '#A78BFA', '#F97316'];

export type DonutCategorySegment = {
  categoryId: string;
  name: string;
  sharePct: number;
  color: string;
  pctLabel: string;
};

type Props = {
  /** Selection is by real category id from the API. */
  selectedId: string | null;
  onSelectCategory: (id: string | null) => void;
  title?: string;
  segments: DonutCategorySegment[];
};

export function DeptUploadCategoriesDonutCard({
  selectedId,
  onSelectCategory,
  title = 'Categories',
  segments,
}: Props) {
  const c = useDeptUploadThemeColorsOptional();
  const { t } = useAppTranslation();
  const norm = useMemo(() => {
    const raw = (segments ?? []).map((s, i) => ({
      ...s,
      color: s.color || COLORS[i % COLORS.length],
    }));
    const total = raw.reduce((a, s) => a + s.sharePct, 0) || 1;
    return raw.map((s) => ({
      ...s,
      /** Fraction of circle 0..1. */
      frac: Math.max(0, s.sharePct / total),
    }));
  }, [segments]);

  const circles = useMemo(() => {
    let cum = 0;
    return norm.map((s) => {
      const dash = s.frac * CIRC;
      const gap = CIRC - dash;
      const dim = selectedId != null && selectedId !== s.categoryId;
      const el = (
        <Circle
          key={s.categoryId}
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={s.color}
          strokeWidth={STROKE}
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={-cum}
          opacity={dim ? 0.38 : 1}
        />
      );
      cum += dash;
      return el;
    });
  }, [norm, selectedId]);

  const segmentHits = useMemo(() => {
    let cumFrac = 0;
    return norm.map((s) => {
      const midDeg = -90 + (cumFrac + s.frac / 2) * 360;
      const rad = (midDeg * Math.PI) / 180;
      const rMid = R - STROKE * 0.35;
      const left = CX + rMid * Math.cos(rad) - 26;
      const top = CY + rMid * Math.sin(rad) - 26;
      cumFrac += s.frac;
      return { categoryId: s.categoryId, left, top };
    });
  }, [norm]);

  if (!norm.length) {
    return (
      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
        <Text style={[styles.empty, { color: c.textMuted }]}>{t('deptNoCategoryViewDataYet')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
      <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
      <View style={styles.chartWrap}>
        <View style={styles.donutFrame}>
          <Svg width={140} height={140} viewBox="0 0 140 140" pointerEvents="none">
            <G transform={`rotate(-90 ${CX} ${CY})`}>{circles}</G>
          </Svg>
          {segmentHits.map((h) => (
            <Pressable
              key={`seg-hit-${h.categoryId}`}
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => onSelectCategory(selectedId === h.categoryId ? null : h.categoryId)}
              style={[styles.segHit, { left: h.left, top: h.top }]}
            />
          ))}
        </View>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          {norm.slice(0, 3).map((item) => (
            <Pressable
              key={item.categoryId}
              onPress={() => onSelectCategory(selectedId === item.categoryId ? null : item.categoryId)}
              style={[
                styles.legendItem,
                selectedId === item.categoryId && {
                  backgroundColor: c.segmentTrack,
                  borderWidth: 1,
                  borderColor: c.cardBorder,
                },
              ]}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendTxt, { color: c.textSecondary }]} numberOfLines={1}>
                {item.name} ({item.pctLabel})
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.legendRow2}>
          {norm.slice(3).map((item) => (
            <Pressable
              key={item.categoryId}
              onPress={() => onSelectCategory(selectedId === item.categoryId ? null : item.categoryId)}
              style={[
                styles.legendItem,
                selectedId === item.categoryId && {
                  backgroundColor: c.segmentTrack,
                  borderWidth: 1,
                  borderColor: c.cardBorder,
                },
              ]}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendTxt, { color: c.textSecondary }]} numberOfLines={1}>
                {item.name} ({item.pctLabel})
              </Text>
            </Pressable>
          ))}
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
    marginBottom: 14,
  },
  empty: { textAlign: 'center', paddingVertical: 16, fontSize: 13, fontWeight: '500' },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  donutFrame: {
    width: 140,
    height: 140,
    position: 'relative',
  },
  segHit: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,136,255,0.04)',
  },
  legend: {
    marginTop: 10,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  legendRow2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendTxt: {
    fontSize: 11,
    maxWidth: 100,
  },
});
