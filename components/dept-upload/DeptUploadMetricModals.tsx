import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';

import { AppPressable } from '@/components/ui/AppPressable';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useAppTranslation } from '@/hooks/use-app-translation';
import type { DecreeUploadDashboardDto, SerializedDecree } from '@/lib/api/decree-upload';
import { listDecrees, publishDecree } from '@/lib/api/decree-upload';
import { Brand, FormColors, palette } from '@/lib/theme';
import { showToast } from '@/lib/adapters/toast';
import { formatDecreeNumberLabel } from '@/lib/decree-number-format';

export type DeptUploadMetricModalKind =
  | 'totalDecrees'
  | 'newThisMonth'
  | 'pendingApproval'
  | 'totalViews'
  | null;

type Props = {
  active: DeptUploadMetricModalKind;
  onClose: () => void;
  /** Dashboard aggregate (engagement, monthly views, etc.); may be null before first load. */
  dashboard: DecreeUploadDashboardDto | null;
  publishedDecreeCount: number;
  onRefreshLists?: () => void;
};

const HEADER_BG = '#F8F9FA';
const TABLE_HEADER_TEXT = '#1A202C';
const BORDER = '#E5E7EB';
const MUTED = '#6B7280';

type TableStatus = 'published' | 'pending' | 'draft' | 'rejected';

function firstCategoryName(d: SerializedDecree): string {
  return d.categories?.[0]?.name?.trim() || '—';
}

function tableStatusFromApi(s: string): TableStatus {
  const x = s.toLowerCase();
  if (x === 'active') return 'published';
  if (x === 'pending') return 'pending';
  if (x === 'draft') return 'draft';
  if (x === 'archived' || x === 'superseded') return 'rejected';
  return 'draft';
}

async function fetchAllDecrees(
  base: NonNullable<Parameters<typeof listDecrees>[0]>,
): Promise<{ ok: true; items: SerializedDecree[] } | { ok: false; message: string }> {
  const out: SerializedDecree[] = [];
  let page = 1;
  for (;;) {
    const r = await listDecrees({ ...base, page, limit: 100 });
    if (!r.ok) return { ok: false, message: r.message };
    out.push(...r.items);
    if (r.items.length < 100 || out.length >= r.meta.total) break;
    page += 1;
  }
  return { ok: true, items: out };
}

const CHART_W = 300;
const CHART_H = 180;
const PAD_L = 36;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 28;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function StatusPill({ status }: { status: TableStatus }) {
  const map: Record<TableStatus, { bg: string; fg: string; label: string }> = {
    published: { bg: 'rgba(34, 197, 94, 0.2)', fg: Brand.green, label: 'published' },
    pending: { bg: '#FEF3C7', fg: '#92400E', label: 'pending' },
    draft: { bg: '#F3F4F6', fg: '#4B5563', label: 'draft' },
    rejected: { bg: '#FEE2E2', fg: '#B91C1C', label: 'archived' },
  };
  const s = map[status];
  return (
    <View style={[pillStyles.pill, { backgroundColor: s.bg }]}>
      <Text style={[pillStyles.txt, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  txt: { fontSize: 11, fontWeight: '700', textTransform: 'lowercase' },
});

function ModalChrome({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { height } = useWindowDimensions();
  const { t } = useAppTranslation();
  const maxH = Math.min(height * 0.88, 640);
  return (
    <View style={chromeStyles.sheet}>
      <View style={[chromeStyles.card, { maxHeight: maxH }]}>
        <View style={chromeStyles.head}>
          <Text style={chromeStyles.title}>{title}</Text>
          <AppPressable onPress={onClose} style={chromeStyles.closeBtn} accessibilityLabel={t('a11yClose')}>
            <Ionicons name="close" size={26} color="#9CA3AF" />
          </AppPressable>
        </View>
        <View style={chromeStyles.divider} />
        {children}
      </View>
    </View>
  );
}

const chromeStyles = StyleSheet.create({
  sheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: palette.white,
    borderRadius: 18,
    overflow: 'hidden',
    ...DeptUploadDash.shadow,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TABLE_HEADER_TEXT,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
  },
});

function TableModalBody({
  columns,
  minTableWidth,
  children,
}: {
  columns: { key: string; label: string; width: number }[];
  minTableWidth: number;
  children: React.ReactNode;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      style={tableStyles.hScroll}
      contentContainerStyle={{ minWidth: minTableWidth, paddingBottom: 12 }}>
      <View style={{ width: minTableWidth }}>
        <View style={[tableStyles.tr, tableStyles.trHead]}>
          {columns.map((c) => (
            <View key={c.key} style={[tableStyles.th, { width: c.width }]}>
              <Text style={tableStyles.thTxt}>{c.label}</Text>
            </View>
          ))}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

function DataRow({
  cells,
  widths,
}: {
  cells: React.ReactNode[];
  widths: number[];
}) {
  return (
    <View style={[tableStyles.tr, tableStyles.trData]}>
      {cells.map((cell, i) => (
        <View key={i} style={[tableStyles.td, { width: widths[i] }]}>
          {cell}
        </View>
      ))}
    </View>
  );
}

const tableStyles = StyleSheet.create({
  hScroll: { maxHeight: 480 },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  trHead: {
    backgroundColor: HEADER_BG,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  trData: {
    backgroundColor: palette.white,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  th: { paddingHorizontal: 8 },
  thTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: TABLE_HEADER_TEXT,
  },
  td: { paddingHorizontal: 8, justifyContent: 'center' },
  tdTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  tdMuted: {
    fontSize: 13,
    fontWeight: '500',
    color: MUTED,
  },
  tdDate: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
});


function ViewsAnalyticsContent({ dashboard, publishedCount }: { dashboard: DecreeUploadDashboardDto; publishedCount: number }) {
  const { t, number } = useAppTranslation();
  const [tipIndex, setTipIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const activeTip = hoverIndex ?? tipIndex;

  const months = (dashboard.viewsByMonth12 ?? []).map((m) => m.count);
  const n = months.length;
  const ymax = Math.max(1, ...months, 1);

  const yScaleV = (v: number) => {
    const t = v / ymax;
    return PAD_T + (1 - t) * (CHART_H - PAD_T - PAD_B);
  };
  const xScaleV = (i: number) => {
    if (n <= 1) return PAD_L;
    return PAD_L + (i / (n - 1)) * (CHART_W - PAD_L - PAD_R);
  };

  const { linePoints, fillPolygon, pointCoords } = useMemo(() => {
    if (!n) {
      return { linePoints: '', fillPolygon: '', pointCoords: [] as { x: number; y: number }[] };
    }
    const pts = months.map((v, i) => ({ x: xScaleV(i), y: yScaleV(v) }));
    const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
    const bottom = CHART_H - PAD_B;
    const poly = `${pts.map((p) => `${p.x},${p.y}`).join(' ')} ${pts[pts.length - 1].x},${bottom} ${pts[0].x},${bottom}`;
    return { linePoints: line, fillPolygon: poly, pointCoords: pts };
  }, [months, n, ymax]);

  const totalV = dashboard.engagement?.totalViews ?? 0;
  const avg = publishedCount > 0 ? Math.round(totalV / publishedCount) : 0;
  const peakI = n ? months.indexOf(Math.max(...months)) : 0;
  const peakKey = (dashboard.viewsByMonth12 ?? [])[peakI]?.month ?? '';
  const peakLabel =
    peakKey.length >= 7
      ? `${MONTH_LABELS[Number(peakKey.slice(5, 7)) - 1] ?? ''} ${peakKey.slice(0, 4)}`.trim()
      : '—';
  const webHover = Platform.OS === 'web';

  return (
    <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
      <View style={viewsStyles.summaryRow}>
        <View style={viewsStyles.summaryCard}>
          <Text style={[viewsStyles.summaryVal, { color: Brand.green }]}>{number(totalV)}</Text>
            <Text style={viewsStyles.summaryLbl}>{t('deptViewsTotal')}</Text>
        </View>
        <View style={viewsStyles.summaryCard}>
          <Text style={[viewsStyles.summaryVal, { color: '#0088FF' }]}>{number(avg)}</Text>
            <Text style={viewsStyles.summaryLbl}>{t('deptViewsAvgPerDecree')}</Text>
        </View>
        <View style={viewsStyles.summaryCard}>
          <Text style={[viewsStyles.summaryVal, { color: Brand.gold }]} numberOfLines={1}>
            {peakLabel}
          </Text>
            <Text style={viewsStyles.summaryLbl}>{t('deptViewsPeakMonth')}</Text>
        </View>
      </View>

        <Text style={viewsStyles.sectionTitle}>{t('deptViewsUnique12mo')}</Text>
      <View style={viewsStyles.chartOuter} collapsable={Platform.OS === 'android' ? false : undefined}>
        {n ? (
          <>
            <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} pointerEvents="none">
              <Defs>
                <LinearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={Brand.green} stopOpacity="0.22" />
                  <Stop offset="1" stopColor={Brand.green} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>
              <Polygon points={fillPolygon} fill="url(#vg)" />
              <Polyline
                points={linePoints}
                fill="none"
                stroke={Brand.green}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pointCoords.map((p, i) => (
                <Circle key={`v-${i}`} cx={p.x} cy={p.y} r={4} fill={palette.white} stroke={Brand.green} strokeWidth={2} />
              ))}
            </Svg>
            <View style={viewsStyles.chartOverlay} pointerEvents="box-none">
              {pointCoords.map((p, i) => {
                const isActive = activeTip === i;
                return (
                  <Pressable
                    key={`hit-${i}`}
                    {...(webHover
                      ? {
                          onHoverIn: () => setHoverIndex(i),
                          onHoverOut: () => setHoverIndex(null),
                        }
                      : {})}
                    onPressIn={() => setTipIndex(i)}
                    onPress={() => setTipIndex(i)}
                    hitSlop={6}
                    style={[viewsStyles.hit, { left: p.x - 26, top: p.y - 26 }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('deptViewsMonthA11y')}>
                    <View style={[viewsStyles.dot, isActive && viewsStyles.dotActive]} />
                  </Pressable>
                );
              })}
            </View>
            {activeTip !== null ? (
              <View
                style={[
                  viewsStyles.tooltip,
                  {
                    left: Math.min(CHART_W - 124, Math.max(6, (pointCoords[activeTip]?.x ?? 0) - 58)),
                    top: Math.max(4, (pointCoords[activeTip]?.y ?? 0) - 56),
                  },
                ]}>
                <Text style={viewsStyles.tooltipMonth}>
                  {(dashboard.viewsByMonth12 ?? [])[activeTip]?.month ?? ''}
                </Text>
                <Text style={viewsStyles.tooltipVal}>
                  {t('deptViewsTooltipValue', { count: number(months[activeTip] ?? 0) })}
                </Text>
              </View>
            ) : null}
            <View style={viewsStyles.xLabels}>
              {months.map((_, i) => {
                if (i % 2 === 1) return null;
                const lab = (dashboard.viewsByMonth12 ?? [])[i]?.month;
                const short = lab && lab.length >= 7 ? `${MONTH_LABELS[Number(lab.slice(5, 7)) - 1]}` : String(i);
                return (
                  <Text key={lab ?? i} style={viewsStyles.xLab}>
                    {short}
                  </Text>
                );
              })}
            </View>
          </>
        ) : (
          <Text style={{ padding: 16, color: MUTED }}>{t('deptViewsNoData')}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const viewsStyles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 17,
    fontWeight: '800',
  },
  summaryLbl: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TABLE_HEADER_TEXT,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  chartOuter: {
    marginHorizontal: 16,
    marginBottom: 20,
    minHeight: CHART_H,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    position: 'relative',
    overflow: 'visible',
    zIndex: 0,
  },
  chartOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: CHART_H,
    zIndex: 4,
    elevation: 6,
  },
  hit: {
    position: 'absolute',
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.white,
    borderWidth: 2,
    borderColor: Brand.green,
  },
  dotActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: palette.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 20,
  },
  tooltipMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: FormColors.title,
  },
  tooltipVal: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    marginTop: 2,
  },
  xLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  xLab: { fontSize: 9, color: '#9CA3AF' },
});

export function DeptUploadMetricModals({ active, onClose, dashboard, publishedDecreeCount, onRefreshLists }: Props) {
  const { t, number } = useAppTranslation();
  const colsMain = useMemo(
    () =>
      [
        { key: 'n', label: t('deptTableColNumber'), width: 48 },
        { key: 't', label: t('submissionsColTitle'), width: 180 },
        { key: 'c', label: t('certCardCategoryLabel'), width: 88 },
        { key: 's', label: t('systemAdminTableStatus'), width: 100 },
        { key: 'v', label: t('deptPreviewViewsLabel'), width: 56 },
        { key: 'u', label: t('deptPreviewUploadDateLabel'), width: 96 },
      ] as const,
    [t],
  );
  const colsPend = useMemo(
    () =>
      [
        { key: 'n', label: t('deptTableColNumber'), width: 48 },
        { key: 't', label: t('submissionsColTitle'), width: 160 },
        { key: 'c', label: t('certCardCategoryLabel'), width: 80 },
        { key: 's', label: t('systemAdminTableStatus'), width: 88 },
        { key: 'a', label: t('resultsColActions'), width: 88 },
      ] as const,
    [t],
  );
  const widthsMain = useMemo(() => colsMain.map((c) => c.width), [colsMain]);
  const widthsPend = useMemo(() => colsPend.map((c) => c.width), [colsPend]);
  const minWMain = useMemo(() => colsMain.reduce((a, c) => a + c.width, 0) + 24, [colsMain]);
  const minPend = useMemo(() => colsPend.reduce((a, c) => a + c.width, 0) + 32, [colsPend]);
  const visible = active != null;
  const [rows, setRows] = useState<SerializedDecree[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const title =
    active === 'totalDecrees'
      ? t('deptMetricModalAllDecrees')
      : active === 'newThisMonth'
        ? t('deptMetricModalNewThisMonth')
        : active === 'pendingApproval'
          ? t('deptMetricModalPendingApproval')
          : active === 'totalViews'
            ? t('deptMetricModalViewsDownloads')
            : '';

  const load = useCallback(async () => {
    if (!active || active === 'totalViews') return;
    setLoading(true);
    setErr(null);
    setRows([]);
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const to = new Date();
    let res: { ok: true; items: SerializedDecree[] } | { ok: false; message: string };
    if (active === 'totalDecrees') {
      res = await fetchAllDecrees({ sort: '-updatedAt' });
    } else if (active === 'newThisMonth') {
      res = await fetchAllDecrees({
        from: from.toISOString(),
        to: to.toISOString(),
        dateField: 'createdAt',
        sort: '-createdAt',
      });
    } else {
      const [ra, rb] = await Promise.all([
        fetchAllDecrees({ status: 'pending', sort: '-updatedAt' }),
        fetchAllDecrees({ status: 'draft', sort: '-updatedAt' }),
      ]);
      if (!ra.ok) {
        setErr(ra.message);
        setRows([]);
        setLoading(false);
        return;
      }
      if (!rb.ok) {
        setErr(rb.message);
        setRows([]);
        setLoading(false);
        return;
      }
      const byId = new Map<string, SerializedDecree>();
      for (const d of ra.items) byId.set(d.id, d);
      for (const d of rb.items) byId.set(d.id, d);
      setRows(
        [...byId.values()].sort((p, q) => String(q.updatedAt ?? '').localeCompare(String(p.updatedAt ?? ''))),
      );
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setErr(res.message);
      setRows([]);
    } else {
      setRows(res.items);
    }
    setLoading(false);
  }, [active]);

  useEffect(() => {
    if (active && active !== 'totalViews') {
      void load();
    }
  }, [active, load]);

  const onApprove = useCallback(
    async (id: string) => {
      setPublishing(id);
      const r = await publishDecree(id, {});
      setPublishing(null);
      if (!r.ok) {
        showToast(r.message, 'error');
        return;
      }
      showToast(t('deptPublished'), 'success');
      onRefreshLists?.();
      void load();
    },
    [load, onRefreshLists, t],
  );

  const listBody = () => {
    if (!active || active === 'totalViews') return null;
    if (loading) {
      return (
        <View style={{ padding: 32, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      );
    }
    if (err) {
      return (
        <Text style={{ padding: 16, color: '#B91C1C' }} numberOfLines={3}>
          {err}
        </Text>
      );
    }
    if (active === 'pendingApproval') {
      if (rows.length === 0) {
        return <Text style={{ padding: 20, color: MUTED, textAlign: 'center' }}>{t('deptNoPendingDecrees')}</Text>;
      }
      return (
        <TableModalBody columns={[...colsPend]} minTableWidth={minPend}>
          {rows.map((d) => (
            <DataRow
              key={d.id}
              widths={widthsPend}
              cells={[
                <Text key="n" style={tableStyles.tdTxt}>
                  {formatDecreeNumberLabel(d)}
                </Text>,
                <Text key="t" style={tableStyles.tdTxt} numberOfLines={1}>
                  {d.titleSummary}
                </Text>,
                <Text key="c" style={tableStyles.tdMuted} numberOfLines={1}>
                  {firstCategoryName(d)}
                </Text>,
                <StatusPill key="s" status={tableStatusFromApi(d.status)} />,
                <AppPressable
                  key="a"
                  onPress={() => void onApprove(d.id)}
                  disabled={publishing === d.id}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    backgroundColor: FormColors.primaryButtonBg,
                    borderRadius: 8,
                    alignSelf: 'center',
                  }}>
                  <Text style={{ color: palette.white, fontWeight: '800', fontSize: 12 }}>
                    {publishing === d.id ? '…' : t('btnPublish')}
                  </Text>
                </AppPressable>,
              ]}
            />
          ))}
        </TableModalBody>
      );
    }

    if (rows.length === 0) {
      return <Text style={{ padding: 20, color: MUTED, textAlign: 'center' }}>{t('deptNoDecreesInList')}</Text>;
    }

    return (
      <TableModalBody columns={[...colsMain]} minTableWidth={minWMain}>
        {rows.map((d) => {
          const uploaded = d.createdAt ? String(d.createdAt).slice(0, 10) : '—';
          return (
            <DataRow
              key={d.id}
              widths={widthsMain}
              cells={[
                <Text key="n" style={tableStyles.tdTxt}>
                  {formatDecreeNumberLabel(d)}
                </Text>,
                <Text key="t" style={tableStyles.tdTxt} numberOfLines={1}>
                  {d.titleSummary}
                </Text>,
                <Text key="c" style={tableStyles.tdMuted} numberOfLines={1}>
                  {firstCategoryName(d)}
                </Text>,
                <StatusPill key="s" status={tableStatusFromApi(d.status)} />,
                <Text key="v" style={tableStyles.tdTxt}>
                  {number(d.viewCount ?? 0)}
                </Text>,
                <Text key="u" style={tableStyles.tdDate}>
                  {uploaded}
                </Text>,
              ]}
            />
          );
        })}
      </TableModalBody>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('a11yClose')} />
        <View style={styles.centerWrap} pointerEvents="box-none">
          <View style={styles.cardWrap}>
            <ModalChrome title={title} onClose={onClose}>
              {active === 'totalViews' && dashboard ? (
                <ViewsAnalyticsContent dashboard={dashboard} publishedCount={publishedDecreeCount} />
              ) : null}
              {active === 'totalViews' && !dashboard ? (
                <Text style={{ padding: 24, color: MUTED, textAlign: 'center' }}>{t('deptOpenAfterDashboardLoads')}</Text>
              ) : null}
              {active && active !== 'totalViews' ? listBody() : null}
            </ModalChrome>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 520,
  },
});
