import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

export type ZoneMetric = {
  zoneKey: string;
  zoneName: string;
  zoneAnchor: string;
  complianceAvg: number;
  incidentRatePct: number;
  inspectionsCount: number;
  /** Distinct bar color per zone (not tier-based). */
  color?: string;
};

export type ZoneLocationRow = {
  city: string;
  inspectionsCount: number;
  complianceAvg: number;
  incidentRatePct: number;
};

export type ZoneQuarterRow = {
  quarterKey: string;
  complianceAvg: number;
  inspectionsCount: number;
  incidentRatePct: number;
};

export type SelectedZoneDetail = {
  zoneKey: string;
  zoneName: string;
  zoneAnchor: string;
  inspectionsCount: number;
  complianceAvg: number;
  incidentRatePct: number;
  trendLabel: string;
  trendUp: boolean;
  netGainLabel: string;
  locations: ZoneLocationRow[];
  quarterly: ZoneQuarterRow[];
};

type Props = {
  zones: ZoneMetric[];
  selectedZone: SelectedZoneDetail | null;
  avgScorePct: string;
  avgDeltaUp: boolean;
  selectedZoneKey: string | null;
  avgAccentColor?: string;
  onClearSelection: () => void;
};

const FALLBACK_GREEN = '#166534';

export function RegionalMetricsCard({
  zones,
  selectedZone,
  avgScorePct,
  avgDeltaUp,
  selectedZoneKey,
  avgAccentColor,
  onClearSelection,
}: Props) {
  const { t, number } = useAppTranslation();
  const avgBg = avgAccentColor ?? Brand.green;

  return (
    <View style={[styles.card, shadowCard()]}>
      <View style={styles.head}>
        <Ionicons name="globe-outline" size={16} color={Brand.green} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headTitle} maxFontSizeMultiplier={1.2}>
            {t('trackingRegionalMetrics').toUpperCase()}
          </Text>
          <Text style={styles.headSub} maxFontSizeMultiplier={1.2}>
            {t('trackingRegionalMetricsSub').toUpperCase()}
          </Text>
        </View>
      </View>

      {selectedZoneKey ? (
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel} maxFontSizeMultiplier={1.2}>
            {(selectedZone?.zoneName ?? t('trackingHeading')).toUpperCase()}
          </Text>
          <AppPressable
            onPress={onClearSelection}
            style={styles.clearFilterBtn}
            accessibilityRole="button"
            accessibilityLabel={t('trackingClearFilter')}>
            <Text style={styles.clearFilterText} maxFontSizeMultiplier={1.15}>
              {t('trackingClearFilter').toUpperCase()}
            </Text>
          </AppPressable>
        </View>
      ) : null}

      <View style={styles.bars}>
        {zones
          .filter((z) => !selectedZoneKey || z.zoneKey === selectedZoneKey)
          .map((z) => {
            const color = z.color ?? FALLBACK_GREEN;
            const pct = Math.min(100, Math.max(0, z.complianceAvg));
            return (
              <View key={z.zoneKey} style={styles.barItem}>
                <View style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                    {z.zoneAnchor.toUpperCase()}
                  </Text>
                  <Text style={styles.barValue} maxFontSizeMultiplier={1.15}>
                    {number(Math.round(z.complianceAvg))}%
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                </View>
              </View>
            );
          })}
      </View>

      <View style={styles.priorityHead}>
        <Text style={styles.priorityHeadText} maxFontSizeMultiplier={1.2}>
          {t('trackingPriorityIncidents').toUpperCase()}
        </Text>
      </View>
      <View style={styles.priorityList}>
        <View style={styles.priorityRow}>
          <Ionicons name="alert-circle" size={14} color="#DC2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.priorityTitle} numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {t('trackingRegionIncidents').toUpperCase()}
            </Text>
            <Text style={styles.priorityRegion} numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {(selectedZoneKey ? selectedZone?.zoneName ?? '' : t('trackingAvgNationalScore')).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.priorityValue} maxFontSizeMultiplier={1.15}>
            {number(Math.round((selectedZone?.incidentRatePct ?? 0) * 10) / 10)}%
          </Text>
        </View>
      </View>

      {selectedZoneKey && selectedZone ? (
        <View style={styles.zoneDetails}>
          <View style={styles.detailKpis}>
            <Kpi icon="pulse-outline" label={t('trackingRegionCompliance')} value={`${number(Math.round(selectedZone.complianceAvg))}%`} />
            <Kpi icon="alert-circle-outline" label={t('trackingRegionIncidents')} value={`${number(Math.round(selectedZone.incidentRatePct * 10) / 10)}%`} />
            <Kpi icon={selectedZone.trendUp ? 'trending-up' : 'trending-down'} label={t('trackingRegionTrend')} value={selectedZone.trendLabel} />
          </View>

          <View style={styles.netGainRow}>
            <Text style={styles.netGainLabel} maxFontSizeMultiplier={1.15}>
              {t('trackingNetGain', { delta: selectedZone.netGainLabel.replace(/^Net\s+Gain\s+/i, '') })}
            </Text>
          </View>

          <View style={styles.locationsHead}>
            <Text style={styles.locationsTitle} maxFontSizeMultiplier={1.15}>
              {t('trackingRegionLocations').toUpperCase()}
            </Text>
            <Text style={styles.locationsMeta} maxFontSizeMultiplier={1.15}>
              {t('trackingRegionLocationsCount', { count: number(selectedZone.locations.length) }).toUpperCase()}
            </Text>
          </View>
          <View style={styles.locationsList}>
            {selectedZone.locations.slice(0, 12).map((loc) => (
              <View key={loc.city} style={styles.locationRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.locationCity} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                    {String(loc.city).toUpperCase()}
                  </Text>
                  <Text style={styles.locationMeta} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                    {t('trackingRegionLocationsInspections', { count: number(loc.inspectionsCount) })}
                  </Text>
                </View>
                <View style={styles.locationRight}>
                  <Text style={styles.locationScore} maxFontSizeMultiplier={1.15}>
                    {number(Math.round(loc.complianceAvg))}%
                  </Text>
                  <Text style={styles.locationIncident} maxFontSizeMultiplier={1.15}>
                    {number(Math.round(loc.incidentRatePct * 10) / 10)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.avgCard, { backgroundColor: avgBg }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.avgLabel} maxFontSizeMultiplier={1.2}>
            {(selectedZoneKey && selectedZone
              ? t('trackingRegionAvgLabel', { region: selectedZone.zoneAnchor })
              : t('trackingAvgNationalScore')
            ).toUpperCase()}
          </Text>
          <Text style={styles.avgValue} maxFontSizeMultiplier={1.15}>
            {avgScorePct}
          </Text>
        </View>
        <Ionicons
          name={avgDeltaUp ? 'trending-up' : 'trending-down'}
          size={22}
          color={Brand.gold}
        />
      </View>
    </View>
  );
}

function Kpi({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <View style={styles.kpiHead}>
        <Ionicons name={icon} size={12} color={palette.neutral500} />
        <Text style={styles.kpiLabel} maxFontSizeMultiplier={1.15}>
          {label.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.kpiValue} maxFontSizeMultiplier={1.15}>
        {value}
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
    gap: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.green,
    letterSpacing: 0.6,
  },
  headSub: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: palette.neutral400,
  },

  /* Filter header when region selected */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Brand.green,
  },
  clearFilterBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Brand.green,
  },

  /* Bars */
  bars: {
    gap: spacing.md,
  },
  barItem: {
    gap: spacing.xxs,
  },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: FormColors.subtitle,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '800',
    color: FormColors.title,
    letterSpacing: 0.3,
  },
  barTrack: {
    height: 10,
    borderRadius: 4,
    backgroundColor: palette.neutral100,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: 4,
  },

  /* Priority national incidents */
  priorityHead: {
    marginTop: spacing.xs,
  },
  priorityHeadText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.neutral400,
  },
  priorityEmpty: {
    fontSize: 12,
    color: palette.neutral500,
    fontWeight: '500',
  },
  priorityList: {
    gap: spacing.xs,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FECACA',
  },
  priorityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: FormColors.title,
  },
  priorityRegion: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#DC2626',
  },
  priorityValue: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
    color: '#B91C1C',
  },

  zoneDetails: {
    gap: spacing.sm,
  },
  detailKpis: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kpi: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: palette.neutral50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  kpiHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: palette.neutral500,
  },
  kpiValue: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
    color: FormColors.title,
  },
  netGainRow: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(212, 175, 55, 0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  netGainLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
    color: Brand.green,
  },
  locationsHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  locationsTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: palette.neutral400,
  },
  locationsMeta: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: palette.neutral500,
  },
  locationsList: {
    gap: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: palette.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  locationCity: {
    fontSize: 12,
    fontWeight: '900',
    color: FormColors.title,
    letterSpacing: 0.4,
  },
  locationMeta: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '700',
    color: palette.neutral500,
    letterSpacing: 0.2,
  },
  locationRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  locationScore: {
    fontSize: 12,
    fontWeight: '900',
    color: Brand.green,
    letterSpacing: 0.2,
  },
  locationIncident: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B91C1C',
    letterSpacing: 0.2,
  },

  /* Avg card */
  avgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: Brand.green,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  avgLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  avgValue: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: '800',
    color: palette.white,
    letterSpacing: 0.2,
  },
});
