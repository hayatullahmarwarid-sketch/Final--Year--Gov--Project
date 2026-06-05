import React, { useCallback, useMemo, useState } from 'react';

import { DecreeDetailsModal } from '@/components/dept-upload/DecreeDetailsModal';
import {
  DeptUploadCategoriesDonutCard,
  type DonutCategorySegment,
} from '@/components/dept-upload/DeptUploadCategoriesDonutCard';
import type { MostViewedBarRow } from '@/components/dept-upload/DeptUploadMostViewedCard';
import { DeptUploadMostViewedCard } from '@/components/dept-upload/DeptUploadMostViewedCard';
import { MonthlyStatsModal, type MonthlyStatsDetail } from '@/components/dept-upload/MonthlyStatsModal';
import { DeptUploadViewsOverTimeCard } from '@/components/dept-upload/DeptUploadViewsOverTimeCard';
import type { DecreeUploadDashboardDto } from '@/lib/api/decree-upload';
import { formatDecreeNumberLabelLocalized } from '@/lib/decree-number-format';
import { useAppTranslation } from '@/hooks/use-app-translation';

export type DeptUploadAnalyticsLayout = 'dashboard' | 'reports';

type Props = {
  layout: DeptUploadAnalyticsLayout;
  dashboard: DecreeUploadDashboardDto | null;
};

const COLOR_POOL = ['#047857', '#FB7185', '#FACC15', '#80c7ff', '#A78BFA', '#F97316', '#E11D48', '#0EA5E9'];

export function DeptUploadSharedAnalyticsSection({ layout, dashboard }: Props) {
  const { t, language, number } = useAppTranslation();
  const [viewsCategoryId, setViewsCategoryId] = useState<string | null>(null);
  const [mostViewedDetail, setMostViewedDetail] = useState<MostViewedBarRow | null>(null);
  const [monthlyStatsDetail, setMonthlyStatsDetail] = useState<MonthlyStatsDetail | null>(null);

  const onSelectChartMonth = useCallback((detail: MonthlyStatsDetail) => {
    setMonthlyStatsDetail(detail);
  }, []);

  const donutSegs: DonutCategorySegment[] = useMemo(() => {
    const top = dashboard?.topCategoriesByViews ?? [];
    return top.map((c, i) => ({
      categoryId: c.categoryId,
      name: c.name || '—',
      sharePct: Math.max(0, c.sharePct),
      color: COLOR_POOL[i % COLOR_POOL.length],
      pctLabel: `${number(Math.round(c.sharePct))}%`,
    }));
  }, [dashboard?.topCategoriesByViews, number]);

  const mostViewedRows: MostViewedBarRow[] = useMemo(
    () =>
      (dashboard?.mostViewedDecrees ?? []).map((d) => ({
        id: d.id,
        label: t('deptDecreeShortLabel', { label: formatDecreeNumberLabelLocalized(d, language) }),
        value: d.viewCount,
        fillPct: 0,
        barColor: '',
        decreeNum: formatDecreeNumberLabelLocalized(d, language).replace(/^\#/, '') || String(d.decreeNumber),
        fullTitle: d.titleSummary,
        category: d.categoryName,
        categoryId: d.categoryId ?? undefined,
      })),
    [dashboard?.mostViewedDecrees, language, t],
  );

  const selectCategory = useCallback((id: string | null) => {
    setViewsCategoryId(id);
  }, []);

  const donutTitle =
    layout === 'reports' ? t('deptAnalyticsCategoryDistribution') : t('deptAnalyticsCategoriesHeader');

  const viewsCard = (
    <DeptUploadViewsOverTimeCard
      dashboard={dashboard}
      selectedCategoryId={viewsCategoryId}
      onSelectMonth={onSelectChartMonth}
    />
  );
  const donutCard = (
    <DeptUploadCategoriesDonutCard
      title={donutTitle}
      segments={donutSegs}
      selectedId={viewsCategoryId}
      onSelectCategory={selectCategory}
    />
  );
  const mostCard = (
    <DeptUploadMostViewedCard
      data={mostViewedRows}
      categoryFilter={viewsCategoryId}
      onSelectBar={setMostViewedDetail}
    />
  );

  return (
    <>
      {layout === 'dashboard' ? (
        <>
          {mostCard}
          {donutCard}
          {viewsCard}
        </>
      ) : (
        <>
          {viewsCard}
          {donutCard}
          {mostCard}
        </>
      )}

      <DecreeDetailsModal visible={mostViewedDetail != null} row={mostViewedDetail} onClose={() => setMostViewedDetail(null)} />

      <MonthlyStatsModal
        visible={monthlyStatsDetail != null}
        detail={monthlyStatsDetail}
        onClose={() => setMonthlyStatsDetail(null)}
      />
    </>
  );
}
