import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  LiveImplementationMap,
  type MapZone,
  type TopCity,
} from '@/components/inspector-admin/LiveImplementationMap';
import { QuarterlyImplementationCard } from '@/components/inspector-admin/QuarterlyImplementationCard';
import {
  RegionalMetricsCard,
  type SelectedZoneDetail,
  type ZoneMetric,
} from '@/components/inspector-admin/RegionalMetricsCard';
import { AppPressable } from '@/components/ui/AppPressable';
import {
  implementationDeltaLabel,
} from '@/data/inspector-admin-store';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useInspectorAdminWorkspace } from '@/hooks/use-inspector-admin-workspace';
import { showToast } from '@/lib/adapters/toast';
import { inspectorAdminApi } from '@/lib/api/inspector-admin';
import { downloadNationalImplementationMatrixPdf } from '@/lib/inspector-admin/tracking-report-download';
import {
  Brand,
  FormColors,
  palette,
  primaryBtn,
  radius,
  spacing,
  touchTarget,
  typography,
} from '@/lib/theme';

type ZoneStyle = { accentCard: string; accentLine: string };
const ZONE_STYLES: Record<string, ZoneStyle> = {
  central: { accentCard: palette.primary, accentLine: palette.primaryTint2 },
  western: { accentCard: palette.primaryShade1, accentLine: palette.primaryTint1 },
  south_western: { accentCard: palette.primaryTint1, accentLine: palette.primaryShade1 },
  south_eastern: { accentCard: palette.primaryTint2, accentLine: palette.primaryShade2 },
  eastern: { accentCard: palette.primaryShade2, accentLine: palette.primaryTint2 },
  northern: { accentCard: palette.primaryShade1, accentLine: palette.primary },
  north_eastern: { accentCard: palette.primaryShade2, accentLine: palette.primaryTint1 },
  central_highlands: { accentCard: palette.primary, accentLine: palette.primaryTint1 },
};

export default function InspectorAdminImplementationScreen() {
  const { t, number } = useAppTranslation();
  const { usesLiveApi } = useInspectorAdminWorkspace();
  const [selectedZoneKey, setSelectedZoneKey] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [selectedZone, setSelectedZone] = useState<SelectedZoneDetail | null>(null);
  const [topCities, setTopCities] = useState<TopCity[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!usesLiveApi) {
        setSummary(null);
        setSelectedZone(null);
        setTopCities([]);
        return;
      }
      void (async () => {
        const r = await inspectorAdminApi.getTrackingSummary({});
        if (!r.ok || !r.data || typeof r.data !== 'object') {
          showToast(t('trackingLiveRequired'), 'error');
          return;
        }
        const d = r.data as any;
        setSummary(d);
        setTopCities(Array.isArray(d.topCities) ? (d.topCities as TopCity[]) : []);
        const top = typeof d.topZoneKey === 'string' ? d.topZoneKey : null;
        setSelectedZoneKey((prev) => prev ?? top);
      })();
    }, [t, usesLiveApi]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!usesLiveApi || !selectedZoneKey) {
        setSelectedZone(null);
        return;
      }
      void (async () => {
        const r = await inspectorAdminApi.getTrackingZone(selectedZoneKey, {});
        if (!r.ok || !r.data || typeof r.data !== 'object') return;
        const d = r.data as any;
        setSelectedZone((d.zone as SelectedZoneDetail) ?? null);
      })();
    }, [selectedZoneKey, usesLiveApi]),
  );

  const zones = useMemo<ZoneMetric[]>(() => {
    const list = Array.isArray(summary?.zones) ? (summary.zones as any[]) : [];
    return list.map((z) => {
      const key = String(z.zoneKey ?? '');
      const style = ZONE_STYLES[key] ?? { accentCard: Brand.green, accentLine: Brand.gold };
      return {
        zoneKey: key,
        zoneName: String(z.zoneName ?? ''),
        zoneAnchor: String(z.zoneAnchor ?? ''),
        complianceAvg: Number(z.complianceAvg ?? 0),
        incidentRatePct: Number(z.incidentRatePct ?? 0),
        inspectionsCount: Number(z.inspectionsCount ?? 0),
        color: style.accentCard,
      };
    });
  }, [summary]);

  const mapZones = useMemo<MapZone[]>(() => zones.map((z) => ({ ...z })), [zones]);

  const quarterlySeries = useMemo(() => {
    const q = selectedZone?.quarterly ?? [];
    if (!Array.isArray(q) || q.length === 0) return [];
    return q.map((row: any) => ({ q: String(row.quarterKey ?? ''), imp: Number(row.complianceAvg ?? 0) }));
  }, [selectedZone]);

  const delta = useMemo(() => implementationDeltaLabel(quarterlySeries), [quarterlySeries]);

  const nationalAvg = useMemo(() => {
    const zs = zones.filter((z) => z.inspectionsCount > 0);
    const denom = zs.reduce((s, z) => s + z.inspectionsCount, 0);
    if (denom <= 0) return '0%';
    const weighted = zs.reduce((s, z) => s + z.complianceAvg * z.inspectionsCount, 0) / denom;
    return `${Math.round(weighted)}%`;
  }, [zones]);

  const regionAvg = useMemo(() => {
    if (!selectedZoneKey || !selectedZone) return nationalAvg;
    return `${Math.round(Number(selectedZone.complianceAvg ?? 0))}%`;
  }, [nationalAvg, selectedZone, selectedZoneKey]);

  const exportReport = useCallback(async () => {
    try {
      const r = await downloadNationalImplementationMatrixPdf();
      if (!r.ok) showToast(r.message, 'error');
    } catch {
      showToast(t('trackingExportFailed'), 'error');
    }
  }, [t]);

  const viewRawData = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(JSON.stringify({ summary, selectedZone }, null, 2));
      showToast(t('trackingExportCopied'), 'success');
    } catch {
      showToast(t('trackingExportFailed'), 'error');
    }
  }, [selectedZone, summary, t]);

  const quarterlyHeading = selectedZone
    ? t('trackingRegionQuarterlyLabel', { region: selectedZone.zoneAnchor })
    : undefined;

  const selectedStyle = selectedZoneKey ? ZONE_STYLES[selectedZoneKey] : undefined;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.toolbar}>
        <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
          {t('trackingHeading')}
        </Text>
        <AppPressable
          onPress={() => void exportReport()}
          style={({ pressed }) => [styles.exportBtn, pressed && styles.exportBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('trackingExport')}>
          <Ionicons name="download-outline" size={16} color={palette.white} />
          <Text style={styles.exportText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {t('trackingExport')}
          </Text>
        </AppPressable>
      </View>

      <LiveImplementationMap
        zones={mapZones}
        topCities={topCities}
        selectedZoneKey={selectedZoneKey}
        onZoneSelect={setSelectedZoneKey}
        onViewRawData={() => void viewRawData()}
      />

      <RegionalMetricsCard
        zones={zones}
        selectedZone={selectedZone}
        avgScorePct={regionAvg}
        avgDeltaUp={delta.up}
        selectedZoneKey={selectedZoneKey}
        avgAccentColor={selectedStyle?.accentCard}
        onClearSelection={() => setSelectedZoneKey(null)}
      />

      <QuarterlyImplementationCard
        series={quarterlySeries}
        netGainLabel={delta.label.replace(/^Net\s+Gain\s+/i, '')}
        up={delta.up}
        accentColor={selectedStyle?.accentLine}
        backgroundColor={selectedStyle?.accentCard}
        heading={quarterlyHeading}
      />

      <Text style={styles.refCaption} maxFontSizeMultiplier={1.15}>
        {number(quarterlySeries.length)} quarters tracked
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: FormColors.pageMuted,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heading: {
    flex: 1,
    ...typography.title,
    color: FormColors.title,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: Brand.green,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Brand.green,
    minHeight: touchTarget.min,
    maxWidth: 172,
  },
  exportBtnPressed: {
    backgroundColor: primaryBtn.activeBg,
    borderColor: primaryBtn.activeBorder,
  },
  exportText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  refCaption: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: palette.neutral400,
    marginTop: spacing.xs,
  },
});
