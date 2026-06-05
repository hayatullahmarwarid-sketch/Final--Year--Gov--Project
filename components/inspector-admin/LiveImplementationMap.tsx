import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { AppPressable } from '@/components/ui/AppPressable';
import { useAppTranslation } from '@/hooks/use-app-translation';
import {
  Brand,
  FormColors,
  palette,
  radius,
  shadowCard,
  spacing,
} from '@/lib/theme';

export type MapZone = {
  zoneKey: string;
  zoneName: string;
  zoneAnchor: string;
  complianceAvg: number;
  incidentRatePct: number;
  inspectionsCount: number;
  /** Unique fill color for the zone polygon. */
  color?: string;
};

export type TopCity = {
  city: string;
  complianceAvg: number;
  inspectionsCount: number;
};

type Props = {
  zones: MapZone[];
  topCities: TopCity[];
  selectedZoneKey: string | null;
  onZoneSelect: (zoneKey: string | null) => void;
  onViewRawData?: () => void;
};

const HIGH_PIN = '#DC2626';
const LOW_PIN = '#FCA5A5';
const FALLBACK_FILL = '#166534';

/** Map legend: high / medium / low (semantic colors; not imported elsewhere). */
const LEGEND_HIGH = Brand.green;
const LEGEND_MEDIUM = palette.warning;
const LEGEND_LOW = '#DC2626';

/**
 * Stylised 8-zone Afghanistan map (schematic) with colored segments,
 * incident-rate pins, and a floating detail card when a zone is tapped.
 * Pure SVG — no `react-native-maps`.
 */
export function LiveImplementationMap({
  zones,
  topCities,
  selectedZoneKey,
  onZoneSelect,
  onViewRawData,
}: Props) {
  const { t, number } = useAppTranslation();

  const selected = useMemo(() => zones.find((z) => z.zoneKey === selectedZoneKey) ?? null, [
    zones,
    selectedZoneKey,
  ]);

  const trendLabel = (pct: number, incidentRatePct: number): string => {
    if (pct >= 90 && incidentRatePct <= 5) return t('trackingRegionTrendLeading');
    if (pct >= 85 && incidentRatePct <= 10) return t('trackingRegionTrendStable');
    if (pct >= 70) return t('trackingRegionTrendWatch');
    return t('trackingRegionTrendAtRisk');
  };

  const footerCount = topCities.length;

  return (
    <View style={[styles.card, shadowCard()]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>
            {t('trackingLiveMap').toUpperCase()}
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
            {t('trackingLiveMapSub').toUpperCase()}
          </Text>
        </View>
        <View style={styles.legendWrap}>
          <Legend color={LEGEND_HIGH} label={t('trackingLegendHigh')} />
          <Legend color={LEGEND_MEDIUM} label={t('trackingLegendMedium')} />
          <Legend color={LEGEND_LOW} label={t('trackingLegendLow')} />
        </View>
      </View>

      <View style={styles.mapArea}>
        <Svg width="100%" height={260} viewBox="0 0 360 280">
          {/* 8-zone schematic layout (4x2 grid with a soft outer frame) */}
          <Rect
            x={34}
            y={32}
            width={292}
            height={200}
            rx={18}
            ry={18}
            fill="#F0FDF4"
            stroke="rgba(22, 101, 52, 0.22)"
            strokeWidth={1.2}
          />

          {zones.map((zone, idx) => {
            const fill = zone.color ?? FALLBACK_FILL;
            const isSelected = selectedZoneKey === zone.zoneKey;
            const incidentRate = zone.incidentRatePct ?? 0;
            const pinColor = incidentRate >= 18 ? HIGH_PIN : incidentRate >= 8 ? LOW_PIN : palette.white;

            // grid placement (row-major): 4 columns x 2 rows
            const col = idx % 4;
            const row = Math.floor(idx / 4);
            const cellW = 292 / 4;
            const cellH = 200 / 2;
            const x = 34 + col * cellW;
            const y = 32 + row * cellH;
            const pad = 8;
            const poly = `M ${x + pad} ${y + pad} L ${x + cellW - pad} ${y + pad} L ${x + cellW - pad} ${
              y + cellH - pad
            } L ${x + pad} ${y + cellH - pad} Z`;
            const pinCx = x + cellW / 2;
            const pinCy = y + cellH / 2 + 6;
            return (
              <G key={zone.zoneKey}>
                <Path
                  d={poly}
                  fill={fill}
                  fillOpacity={isSelected ? 1 : 0.92}
                  stroke={isSelected ? Brand.gold : palette.white}
                  strokeWidth={isSelected ? 3 : 1.5}
                  strokeLinejoin="round"
                  onPress={() => onZoneSelect(isSelected ? null : zone.zoneKey)}
                />
                <Circle
                  cx={pinCx}
                  cy={pinCy}
                  r={12}
                  fill={pinColor}
                  stroke={palette.white}
                  strokeWidth={2}
                  onPress={() => onZoneSelect(isSelected ? null : zone.zoneKey)}
                />
                {incidentRate > 0 ? (
                  <SvgText
                    x={pinCx}
                    y={pinCy + 4}
                    fill={palette.white}
                    fontSize={11}
                    fontWeight="800"
                    textAnchor="middle">
                    {number(Math.round(incidentRate))}
                  </SvgText>
                ) : null}
                <SvgText
                  x={pinCx}
                  y={y + 20}
                  fill="rgba(255,255,255,0.92)"
                  fontSize={9}
                  fontWeight="800"
                  textAnchor="middle">
                  {zone.zoneAnchor.toUpperCase()}
                </SvgText>
              </G>
            );
          })}
        </Svg>

        {selected ? (
          <View style={[styles.detailCard, shadowCard()]}>
            <View style={styles.detailHeader}>
              <Ionicons name="location-outline" size={14} color={Brand.green} />
              <Text style={styles.detailTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {selected.zoneName.toUpperCase()}
              </Text>
              <AppPressable
                onPress={() => onZoneSelect(null)}
                style={styles.detailClose}
                accessibilityRole="button"
                accessibilityLabel={t('a11yClose')}>
                <Ionicons name="close" size={14} color={palette.neutral500} />
              </AppPressable>
            </View>
            <View style={styles.detailGrid}>
              <View style={styles.detailCell}>
                <View style={styles.detailCellHead}>
                  <Ionicons name="pulse-outline" size={11} color={palette.neutral500} />
                  <Text style={styles.detailCellLabel} maxFontSizeMultiplier={1.2}>
                    {t('trackingRegionCompliance').toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.detailCellValue,
                    {
                      color:
                        selected.complianceAvg > 85
                          ? Brand.green
                          : selected.complianceAvg >= 70
                            ? '#B45309'
                            : '#DC2626',
                    },
                  ]}
                  maxFontSizeMultiplier={1.15}>
                  {number(Math.round(selected.complianceAvg))}%
                </Text>
              </View>
              <View style={styles.detailCell}>
                <View style={styles.detailCellHead}>
                  <Ionicons name="alert-circle-outline" size={11} color={palette.neutral500} />
                  <Text style={styles.detailCellLabel} maxFontSizeMultiplier={1.2}>
                    {t('trackingRegionIncidents').toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.detailCellValue,
                    { color: (selected.incidentRatePct ?? 0) > 10 ? '#DC2626' : Brand.green },
                  ]}
                  maxFontSizeMultiplier={1.15}>
                  {number(Math.round((selected.incidentRatePct ?? 0) * 10) / 10)}%
                </Text>
              </View>
            </View>
            <Text style={styles.detailTrend} maxFontSizeMultiplier={1.15}>
              {t('trackingRegionTrend').toUpperCase()}:{' '}
              <Text style={styles.detailTrendValue}>
                {trendLabel(selected.complianceAvg, selected.incidentRatePct ?? 0).toUpperCase()}
              </Text>
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={styles.footerDot} />
          <Text style={styles.footerText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {footerCount === 0 ? t('trackingMapFooterZero').toUpperCase() : t('trackingTopCities').toUpperCase()}
          </Text>
        </View>
        {onViewRawData ? (
          <AppPressable
            onPress={onViewRawData}
            style={styles.footerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('trackingViewRawData')}>
            <Text style={styles.footerLink} maxFontSizeMultiplier={1.15}>
              {t('trackingViewRawData').toUpperCase()}
            </Text>
          </AppPressable>
        ) : null}
      </View>

      {topCities.length > 0 ? (
        <View style={styles.topCities}>
          {topCities.slice(0, 5).map((c) => (
            <View key={c.city} style={styles.topCityChip}>
              <Ionicons name="star" size={12} color={Brand.gold} />
              <Text style={styles.topCityText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {String(c.city).toUpperCase()} · {number(Math.round(c.complianceAvg))}%
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: FormColors.title,
    letterSpacing: 0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: palette.neutral400,
  },
  legendWrap: {
    gap: spacing.xxs,
    alignItems: 'flex-start',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: FormColors.subtitle,
  },

  mapArea: {
    marginTop: spacing.sm,
    position: 'relative',
  },

  detailCard: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.xs,
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: FormColors.title,
  },
  detailClose: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.neutral100,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  detailCell: {
    flex: 1,
  },
  detailCellHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detailCellLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: palette.neutral500,
  },
  detailCellValue: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '800',
  },
  detailTrend: {
    marginTop: spacing.xs,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: palette.neutral500,
  },
  detailTrendValue: {
    color: Brand.green,
    fontWeight: '800',
  },

  footer: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.rowActiveWash,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(22, 101, 52, 0.2)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  footerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Brand.green,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Brand.green,
  },
  footerBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  footerLink: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Brand.green,
  },

  topCities: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  topCityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: palette.neutral50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  topCityText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
    color: FormColors.title,
    maxWidth: 170,
  },
});
