import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppPressable } from '@/components/ui/AppPressable';
import { CollapsibleFilters } from '@/components/ui/CollapsibleFilters';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useInspectorAdminWorkspace } from '@/hooks/use-inspector-admin-workspace';
import { showToast } from '@/lib/adapters/toast';
import { inspectorAdminApi } from '@/lib/api/inspector-admin';
import { saveCsvToDeviceStorage } from '@/lib/inspector-admin/reports-csv-download';
import {
  Brand,
  FormColors,
  palette,
  radius,
  shadowCard,
  spacing,
  touchTarget,
  typography,
} from '@/lib/theme';

type ReportType = 'inspection' | 'implementation' | 'certification' | 'evaluation';
type Timeframe = 'last30' | 'quarterly' | 'fiscal' | 'custom';
type RegionFilter = 'all' | 'central' | 'south' | 'west' | 'north' | 'east';

type ReportTypeMeta = {
  key: ReportType;
  icon: keyof typeof import('@expo/vector-icons/build/Ionicons').default.glyphMap;
  titleKey: string;
  descKey: string;
};

const REPORT_TYPES: ReportTypeMeta[] = [
  {
    key: 'inspection',
    icon: 'clipboard-outline',
    titleKey: 'reportsTypeInspection',
    descKey: 'reportsTypeInspectionDesc',
  },
  {
    key: 'implementation',
    icon: 'bar-chart-outline',
    titleKey: 'reportsTypeImplementation',
    descKey: 'reportsTypeImplementationDesc',
  },
  {
    key: 'certification',
    icon: 'ribbon-outline',
    titleKey: 'reportsTypeCertification',
    descKey: 'reportsTypeCertificationDesc',
  },
  {
    key: 'evaluation',
    icon: 'school-outline',
    titleKey: 'reportsTypeEvaluation',
    descKey: 'reportsTypeEvaluationDesc',
  },
];

type TFunc = (key: string, options?: Record<string, unknown>) => string;

function timeframeLabel(k: Timeframe, t: TFunc): string {
  switch (k) {
    case 'last30':
      return t('reportsTimeLast30');
    case 'quarterly':
      return t('reportsTimeQuarterly');
    case 'fiscal':
      return t('reportsTimeFiscal');
    case 'custom':
      return t('reportsTimeCustom');
  }
}

function regionLabel(k: RegionFilter, t: TFunc): string {
  switch (k) {
    case 'all':
      return t('reportsRegionAll');
    case 'central':
      return t('reportsRegionKabul');
    case 'south':
      return t('reportsRegionKandahar');
    case 'west':
      return t('reportsRegionHerat');
    case 'north':
      return t('reportsRegionBalkh');
    case 'east':
      return t('reportsRegionNangarhar');
  }
}

export default function InspectorAdminReportsScreen() {
  const { t } = useAppTranslation();
  const {
    assignments,
    submissions,
    incidents,
    certificates,
    examResults,
  } = useInspectorAdminWorkspace();

  const [reportType, setReportType] = useState<ReportType>('implementation');
  const [timeframe, setTimeframe] = useState<Timeframe>('last30');
  const [region, setRegion] = useState<RegionFilter>('all');
  const [timeOpen, setTimeOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [anonymize, setAnonymize] = useState(false);

  const datasetCount = useMemo(() => {
    switch (reportType) {
      case 'inspection':
        return submissions.length;
      case 'implementation':
        return incidents.length;
      case 'certification':
        return certificates.length;
      case 'evaluation':
        return examResults.length;
    }
  }, [reportType, submissions, incidents, certificates, examResults]);

  const exportBundle = useCallback(async () => {
    try {
      const now = new Date();
      const endDate = now.toISOString().slice(0, 10);
      const start = new Date(now);
      if (timeframe === 'last30') start.setUTCDate(start.getUTCDate() - 30);
      else if (timeframe === 'quarterly') start.setUTCDate(start.getUTCDate() - 90);
      else if (timeframe === 'fiscal') start.setUTCMonth(0, 1);
      else start.setUTCDate(start.getUTCDate() - 30);
      const startDate = start.toISOString().slice(0, 10);

      const typeMap: Record<ReportType, Parameters<typeof inspectorAdminApi.downloadReportsCsv>[0]['type']> = {
        inspection: 'inspection_summary',
        implementation: 'implementation_audit',
        certification: 'certification_registry',
        evaluation: 'evaluation_performance',
      };

      const res = await inspectorAdminApi.downloadReportsCsv({
        type: typeMap[reportType],
        startDate,
        endDate,
        region: region === 'all' ? undefined : region,
        anonymize,
      });
      if (!res.ok) throw new Error(res.message);

      await saveCsvToDeviceStorage({ csv: res.csv, filename: res.filename });
      showToast(t('reportsExported'), 'success');
    } catch {
      showToast(t('reportsExportFailed'), 'error');
    }
  }, [reportType, anonymize, timeframe, region, t]);

  const resetReportParams = useCallback(() => {
    setTimeframe('last30');
    setRegion('all');
    setAnonymize(false);
    setTimeOpen(false);
    setRegionOpen(false);
  }, []);

  const reportParamsActiveCount = useMemo(() => {
    let n = 0;
    if (timeframe !== 'last30') n += 1;
    if (region !== 'all') n += 1;
    if (anonymize) n += 1;
    return n;
  }, [anonymize, region, timeframe]);

  const paramsSummary = useMemo(
    () =>
      `${timeframeLabel(timeframe, t)} · ${regionLabel(region, t)}`.toUpperCase(),
    [region, t, timeframe],
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.headerBlock}>
        <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
          {t('reportsHeading').toUpperCase()}
        </Text>
        <Text style={styles.subheading} maxFontSizeMultiplier={1.2}>
          {t('reportsSubtitle').toUpperCase()}
        </Text>
      </View>

      {/* Step 1 — Report type */}
      <View style={[styles.card, shadowCard()]}>
        <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
          {t('reportsStep1').toUpperCase()}
        </Text>
        <View style={styles.typeList}>
          {REPORT_TYPES.map((type) => {
            const on = type.key === reportType;
            return (
              <AppPressable
                key={type.key}
                onPress={() => setReportType(type.key)}
                style={[styles.typeCard, on && styles.typeCardOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t(type.titleKey)}>
                <View style={[styles.typeIcon, on && styles.typeIconOn]}>
                  <Ionicons
                    name={type.icon}
                    size={18}
                    color={on ? Brand.green : palette.neutral500}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.typeTitle, on && styles.typeTitleOn]}
                    maxFontSizeMultiplier={1.15}>
                    {t(type.titleKey)}
                  </Text>
                  <Text
                    style={styles.typeDesc}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.15}>
                    {t(type.descKey).toUpperCase()}
                  </Text>
                </View>
              </AppPressable>
            );
          })}
        </View>
      </View>

      {/* Step 2 — Parameters */}
      <View style={[styles.card, shadowCard()]}>
        <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
          {t('reportsStep2').toUpperCase()}
        </Text>

        <CollapsibleFilters
          title={t('qbankFilters')}
          summary={paramsSummary}
          activeCount={reportParamsActiveCount}
          onReset={resetReportParams}
          resetDisabled={reportParamsActiveCount === 0}
          style={styles.reportFilters}>
        <Text style={styles.label} maxFontSizeMultiplier={1.2}>
          {t('reportsParamTimeframe').toUpperCase()}
        </Text>
        <AppPressable
          onPress={() => {
            setTimeOpen((v) => !v);
            setRegionOpen(false);
          }}
          style={styles.select}
          accessibilityRole="button"
          accessibilityState={{ expanded: timeOpen }}>
          <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {timeframeLabel(timeframe, t).toUpperCase()}
          </Text>
          <Ionicons
            name={timeOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={FormColors.subtitle}
          />
        </AppPressable>
        {timeOpen ? (
          <View style={[styles.selectMenu, shadowCard()]}>
            {(['last30', 'quarterly', 'fiscal', 'custom'] as const).map((k) => {
              const on = timeframe === k;
              return (
                <AppPressable
                  key={k}
                  onPress={() => {
                    setTimeframe(k);
                    setTimeOpen(false);
                  }}
                  style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}>
                  <Text
                    style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                    numberOfLines={1}>
                    {timeframeLabel(k, t).toUpperCase()}
                  </Text>
                </AppPressable>
              );
            })}
          </View>
        ) : null}

        <Text style={[styles.label, { marginTop: spacing.md }]} maxFontSizeMultiplier={1.2}>
          {t('reportsParamRegion').toUpperCase()}
        </Text>
        <AppPressable
          onPress={() => {
            setRegionOpen((v) => !v);
            setTimeOpen(false);
          }}
          style={styles.select}
          accessibilityRole="button"
          accessibilityState={{ expanded: regionOpen }}>
          <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {regionLabel(region, t).toUpperCase()}
          </Text>
          <Ionicons
            name={regionOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={FormColors.subtitle}
          />
        </AppPressable>
        {regionOpen ? (
          <View style={[styles.selectMenu, shadowCard()]}>
            {(['all', 'central', 'south', 'west', 'north', 'east'] as const).map((k) => {
              const on = region === k;
              return (
                <AppPressable
                  key={k}
                  onPress={() => {
                    setRegion(k);
                    setRegionOpen(false);
                  }}
                  style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}>
                  <Text
                    style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                    numberOfLines={1}>
                    {regionLabel(k, t).toUpperCase()}
                  </Text>
                </AppPressable>
              );
            })}
          </View>
        ) : null}

        <AppPressable
          onPress={() => setAnonymize((v) => !v)}
          style={styles.anonymizeRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: anonymize }}
          accessibilityLabel={t('reportsAnonymize')}>
          <View style={[styles.checkbox, anonymize && styles.checkboxOn]}>
            {anonymize ? <Ionicons name="checkmark" size={14} color={palette.white} /> : null}
          </View>
          <Text style={styles.anonymizeText} maxFontSizeMultiplier={1.15}>
            {t('reportsAnonymize').toUpperCase()}
          </Text>
        </AppPressable>
        </CollapsibleFilters>

        <AppPressable
          onPress={() => void exportBundle()}
          style={styles.exportBtn}
          accessibilityRole="button"
          accessibilityLabel={t('reportsExport')}>
          <Ionicons name="download-outline" size={18} color={palette.white} />
          <Text style={styles.exportBtnText} maxFontSizeMultiplier={1.15}>
            {t('reportsExport')}
          </Text>
        </AppPressable>

        <Text style={styles.caption} maxFontSizeMultiplier={1.15}>
          {datasetCount} rows available for this report type.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: FormColors.pageMuted,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },

  headerBlock: {
    paddingHorizontal: spacing.xs,
  },
  heading: {
    ...typography.title,
    color: FormColors.title,
    letterSpacing: 0.4,
  },
  subheading: {
    marginTop: spacing.xxs,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.neutral400,
  },

  card: {
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    gap: spacing.sm,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    color: FormColors.title,
  },
  reportFilters: {
    marginTop: spacing.sm,
  },

  typeList: {
    gap: spacing.xs,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.neutral200,
    backgroundColor: palette.white,
  },
  typeCardOn: {
    backgroundColor: palette.rowActiveWash,
    borderColor: Brand.green,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.neutral100,
  },
  typeIconOn: {
    backgroundColor: palette.white,
  },
  typeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: FormColors.title,
  },
  typeTitleOn: {
    color: FormColors.title,
  },
  typeDesc: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: palette.neutral400,
  },

  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: palette.neutral400,
    marginBottom: spacing.xxs,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.neutral100,
    borderRadius: radius.md,
    minHeight: touchTarget.min,
  },
  selectText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: FormColors.title,
  },
  selectMenu: {
    marginTop: spacing.xxs,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    overflow: 'hidden',
  },
  selectMenuRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  selectMenuRowActive: {
    backgroundColor: palette.rowActiveWash,
  },
  selectMenuText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: FormColors.title,
  },
  selectMenuTextActive: {
    color: Brand.green,
    fontWeight: '800',
  },

  anonymizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: palette.neutral300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  anonymizeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: FormColors.subtitle,
  },

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: Brand.green,
    marginTop: spacing.xs,
  },
  exportBtnText: {
    color: palette.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  caption: {
    marginTop: spacing.xs,
    fontSize: 11,
    fontWeight: '700',
    color: palette.neutral400,
    textAlign: 'center',
  },
});
