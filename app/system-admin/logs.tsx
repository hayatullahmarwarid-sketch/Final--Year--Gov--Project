import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { showToast } from '@/lib/adapters/toast';

import { CollapsibleFilters } from '@/components/ui/CollapsibleFilters';
import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { useSystemAdminUi } from '@/contexts/system-admin-ui-context';
import { listAllAuditLogs } from '@/lib/api/system-admin';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { spacing, touchTarget } from '@/lib/theme';
import { auditRowToEntry } from '@/lib/system-admin-mapper';
import {
  auditLogsToCsv,
  formatRelativeTime,
  getSystemAdminState,
  initialsFromName,
  type AuditLogEntry,
} from '@/data/system-admin-store';

const COL_TS = 172;
const COL_USER = 176;
const COL_MODULE = 132;
const COL_ACTION = 268;
const COL_IP = 128;
const COL_STATUS = 100;
const TABLE_MIN_WIDTH = COL_TS + COL_USER + COL_MODULE + COL_ACTION + COL_IP + COL_STATUS;

function formatAuditFetchError(message: string, status: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (status === 401) return t('systemAdminSessionExpiredAuditLogs');
  if (status === 403) return t('systemAdminNoPermissionAuditLogs');
  if (status === 0) return message || t('systemAdminNetworkErrorAuditLogs');
  return message || t('systemAdminCouldNotLoadAuditLogs');
}

export default function SystemAdminLogsScreen() {
  const { t } = useAppTranslation();
  const params = useLocalSearchParams<{ security24h?: string }>();
  const security24h = params.security24h === '1' || params.security24h === 'true';
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchNonce, setFetchNonce] = useState(0);

  const { isDarkMode } = useSystemAdminUi();
  const [logModuleFilter, setLogModuleFilter] = useState<string>('all');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'SUCCESS' | 'FAILURE'>('all');
  const [logDetailModal, setLogDetailModal] = useState<AuditLogEntry | null>(null);
  const [modulePickerOpen, setModulePickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [hideRawHttp, setHideRawHttp] = useState(true);

  const reload = useCallback(
    async (opts: { toastOnSuccess?: boolean; toastOnError?: boolean } = {}) => {
      setLoading(true);
      setError(null);
      const fromIso = security24h ? new Date(Date.now() - 24 * 3600_000).toISOString() : undefined;
      const r = await listAllAuditLogs(500, fromIso ? { from: fromIso } : undefined);
      setLoading(false);
      if (r.ok) {
        const entries = r.items.map(auditRowToEntry).filter(Boolean) as AuditLogEntry[];
        setAuditLogs(entries);
        setError(null);
        if (opts.toastOnSuccess) showToast(t('systemAdminLogsRefreshed'), 'success');
      } else {
        setAuditLogs(getSystemAdminState().auditLogs);
        const msg = formatAuditFetchError(r.message, r.status, t);
        setError(msg);
        if (opts.toastOnError) showToast(msg, 'error');
      }
    },
    [t, security24h],
  );

  useEffect(() => {
    void reload({});
  }, [fetchNonce, reload]);

  useEffect(() => {
    if (security24h) setHideRawHttp(true);
  }, [security24h]);

  const allLogsSorted = useMemo(() => {
    const rows = [...auditLogs];
    rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return rows;
  }, [auditLogs]);

  const sortedAuditLogs = useMemo(() => {
    let rows = [...allLogsSorted];
    if (hideRawHttp) rows = rows.filter((r) => r.actionKey !== 'http.write');
    if (security24h) rows = rows.filter((r) => r.actionKey !== 'http.write');
    if (logModuleFilter !== 'all') rows = rows.filter((r) => r.module === logModuleFilter);
    if (logStatusFilter !== 'all') rows = rows.filter((r) => r.status === logStatusFilter);
    return rows;
  }, [allLogsSorted, hideRawHttp, security24h, logModuleFilter, logStatusFilter]);

  const logModules = useMemo(() => {
    const s = new Set(auditLogs.map((l) => l.module));
    return ['all', ...Array.from(s).sort()];
  }, [auditLogs]);

  const cardSurface = isDarkMode ? '#111827' : '#fff';
  const borderC = isDarkMode ? '#1F2937' : '#E5E7EB';
  const textMuted = isDarkMode ? '#9CA3AF' : '#6B7280';
  const textTitle = isDarkMode ? '#F3F4F6' : '#111827';
  const textBody = isDarkMode ? '#E5E7EB' : '#374151';
  const filterBandBg = isDarkMode ? '#0B1220' : '#F3F4F6';
  const tableHeaderBg = isDarkMode ? '#1F2937' : '#F3F4F6';
  const selectSurface = isDarkMode ? '#111827' : '#fff';
  const iconAmberBg = isDarkMode ? '#422006' : '#FFFBEB';

  const onExportLogs = async () => {
    const csv = auditLogsToCsv(sortedAuditLogs);
    try {
      await Share.share({
        title: t('auditExportFilename'),
        message: csv,
      });
      showToast(t('systemAdminExportedRows', { count: sortedAuditLogs.length }), 'success');
    } catch {
      showToast(t('systemAdminCouldNotOpenShareSheet'), 'error');
    }
  };

  const onRefresh = () => {
    void reload({ toastOnSuccess: true, toastOnError: true });
  };

  const statusSelectLabel =
    logStatusFilter === 'all' ? t('systemAdminLogsStatusAll') : logStatusFilter;

  const resetLogFilters = useCallback(() => {
    setLogModuleFilter('all');
    setLogStatusFilter('all');
    setHideRawHttp(true);
    setModulePickerOpen(false);
    setStatusPickerOpen(false);
  }, []);

  const logFiltersActiveCount = useMemo(() => {
    let n = 0;
    if (logModuleFilter !== 'all') n += 1;
    if (logStatusFilter !== 'all') n += 1;
    if (!hideRawHttp) n += 1;
    return n;
  }, [hideRawHttp, logModuleFilter, logStatusFilter]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: isDarkMode ? '#030712' : FormColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {error ? (
          <View
            style={[
              styles.syncWarn,
              { borderColor: borderC, backgroundColor: isDarkMode ? '#422006' : '#FFFBEB' },
            ]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.syncWarnText, { color: isDarkMode ? '#FDE68A' : '#B45309' }]}>
                {t('saOfflineDataBanner')}
              </Text>
              <Text style={[styles.syncWarnText, { fontSize: 10, opacity: 0.9 }]}>{error}</Text>
            </View>
            <Pressable
              onPress={() => setFetchNonce((n) => n + 1)}
              style={styles.syncRetry}
              accessibilityRole="button"
              accessibilityLabel={t('a11yRetryAuditLogs')}>
              <Text style={styles.syncRetryLbl}>{t('certRetry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {security24h ? (
          <View
            style={[
              styles.filterBanner,
              { borderColor: borderC, backgroundColor: isDarkMode ? '#064E3B' : '#ECFDF5' },
            ]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Brand.green} />
            <Text style={[styles.filterBannerText, { color: isDarkMode ? '#A7F3D0' : '#065F46' }]}>
              {t('systemAdminSecurityLogsFilterBanner')}
            </Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: cardSurface, borderColor: borderC }]}>
          <View style={[styles.cardTitleBlock, { borderBottomColor: borderC }]}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.iconAmber, { backgroundColor: iconAmberBg }]}>
                <Ionicons name="shield-outline" size={22} color="#D97706" />
              </View>
              <View style={styles.cardHeadText}>
                <Text style={[styles.h2, { color: textTitle }]}>{t('systemAdminAuditLogs')}</Text>
                <Text style={[styles.sub, { color: textMuted }]}>
                  {t('systemAdminAuditLogsSubtitle', { count: sortedAuditLogs.length.toLocaleString() })}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.cardToolbar, { borderBottomColor: borderC }]}>
            <View style={styles.logFiltersFlex}>
              <CollapsibleFilters
                title={t('systemAdminFilters')}
                summary={sortedAuditLogs.length.toLocaleString()}
                activeCount={logFiltersActiveCount}
                onReset={resetLogFilters}
                resetDisabled={logFiltersActiveCount === 0}
                adminPalette={{
                  cardBg: selectSurface,
                  borderColor: borderC,
                  titleColor: textTitle,
                  mutedColor: textMuted,
                  triggerIdleBg: filterBandBg,
                  accentColor: Brand.green,
                }}
                style={styles.logFiltersCard}>
                <Pressable
                  style={styles.httpToggleRow}
                  onPress={() => setHideRawHttp((v) => !v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: hideRawHttp }}>
                  <Text style={[styles.filterLbl, { color: textMuted, marginBottom: 0 }]}>
                    {t('systemAdminHideHttpTraffic')}
                  </Text>
                  <Ionicons name={hideRawHttp ? 'checkbox' : 'square-outline'} size={22} color={Brand.green} />
                </Pressable>
                <View style={styles.filterTwoCol}>
                  <View style={styles.filterCol}>
                    <Text style={[styles.filterLbl, { color: textMuted }]}>{t('systemAdminModule')}</Text>
                    <Pressable
                      style={[styles.selectField, { borderColor: borderC, backgroundColor: selectSurface }]}
                      onPress={() => setModulePickerOpen(true)}>
                      <Text style={[styles.selectFieldTxt, { color: textTitle }]} numberOfLines={1}>
                        {logModuleFilter === 'all' ? t('systemAdminAllModules') : logModuleFilter}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={textMuted} />
                    </Pressable>
                  </View>
                  <View style={[styles.filterCol, styles.filterColNarrow]}>
                    <Text style={[styles.filterLbl, { color: textMuted }]}>{t('systemAdminStatus')}</Text>
                    <Pressable
                      style={[styles.selectField, { borderColor: borderC, backgroundColor: selectSurface }]}
                      onPress={() => setStatusPickerOpen(true)}>
                      <Text style={[styles.selectFieldTxt, { color: textTitle }]} numberOfLines={1}>
                        {statusSelectLabel}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={textMuted} />
                    </Pressable>
                  </View>
                </View>
              </CollapsibleFilters>
            </View>
            <Pressable
              style={[styles.iconToolBtn, { borderColor: borderC, backgroundColor: selectSurface }]}
              onPress={() => void onExportLogs()}
              accessibilityLabel={t('systemAdminExport')}>
              <Ionicons name="download-outline" size={20} color={textMuted} />
            </Pressable>
            <Pressable
              style={[styles.iconToolBtn, { borderColor: borderC, backgroundColor: selectSurface }]}
              onPress={onRefresh}
              accessibilityLabel={t('systemAdminRefresh')}>
              <Ionicons name="refresh" size={20} color={textMuted} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingBlock} accessibilityLabel={t('a11yLoadingAuditLogs')}>
              <ActivityIndicator size="large" color={Brand.green} />
              <Text style={[styles.loadingHint, { color: textMuted }]}>{t('systemAdminLoadingAuditTrail')}</Text>
            </View>
          ) : !error && auditLogs.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={[styles.emptyTitle, { color: textTitle }]}>{t('systemAdminNoAuditEvents')}</Text>
              <Text style={[styles.emptySub, { color: textMuted }]}>{t('systemAdminNoAuditEventsHint')}</Text>
            </View>
          ) : !error && sortedAuditLogs.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={[styles.emptyTitle, { color: textTitle }]}>{t('systemAdminNoMatchingRows')}</Text>
              <Text style={[styles.emptySub, { color: textMuted }]}>{t('systemAdminNoMatchingRowsHint')}</Text>
            </View>
          ) : null}

          {!loading && !error && sortedAuditLogs.length > 0 ? (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator
              {...(Platform.OS === 'ios' ? { indicatorStyle: isDarkMode ? 'white' : 'default' } : {})}
              contentContainerStyle={styles.tableScrollContent}>
              <View style={[styles.tableInner, { minWidth: TABLE_MIN_WIDTH }]}>
                <View style={[styles.trHeader, { backgroundColor: tableHeaderBg, borderBottomColor: borderC }]}>
                  <Text style={[styles.th, { width: COL_TS, color: textMuted }]}>{t('systemAdminLogsColTimestamp')}</Text>
                  <Text style={[styles.th, { width: COL_USER, color: textMuted }]}>{t('systemAdminLogsColUser')}</Text>
                  <Text style={[styles.th, { width: COL_MODULE, color: textMuted }]}>{t('systemAdminLogsColModule')}</Text>
                  <Text style={[styles.th, { width: COL_ACTION, color: textMuted }]}>{t('systemAdminLogsColAction')}</Text>
                  <Text style={[styles.th, { width: COL_IP, color: textMuted }]}>{t('systemAdminLogsColIpAddress')}</Text>
                  <Text style={[styles.th, { width: COL_STATUS, color: textMuted }]}>{t('systemAdminLogsColStatus')}</Text>
                </View>
                {sortedAuditLogs.map((log) => (
                  <Pressable
                    key={log.id}
                    onPress={() => setLogDetailModal(log)}
                    style={[styles.tr, { borderBottomColor: borderC }]}
                    accessibilityRole="button">
                    <View style={[styles.td, { width: COL_TS }]}>
                      <Text style={[styles.cellTs, { color: textMuted }]} selectable>
                        {new Date(log.timestamp).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.td, styles.tdUser, { width: COL_USER }]}>
                      <View style={[styles.avatar, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }]}>
                        <Text style={[styles.avatarTxt, { color: isDarkMode ? '#E5E7EB' : '#4B5563' }]}>{initialsFromName(log.user)}</Text>
                      </View>
                      <Text style={[styles.cellUser, { color: textTitle }]} numberOfLines={2}>
                        {log.user}
                      </Text>
                    </View>
                    <View style={[styles.td, { width: COL_MODULE }]}>
                      <Text style={[styles.cellModule, { color: textBody }]} numberOfLines={3}>
                        {log.module}
                      </Text>
                    </View>
                    <View style={[styles.td, { width: COL_ACTION }]}>
                      <Text style={[styles.cellAction, { color: textBody }]} numberOfLines={4}>
                        {log.action}
                      </Text>
                    </View>
                    <View style={[styles.td, { width: COL_IP }]}>
                      <Text style={[styles.cellIp, { color: textMuted }]} selectable numberOfLines={2}>
                        {log.ip}
                      </Text>
                    </View>
                    <View style={[styles.td, styles.tdStatus, { width: COL_STATUS }]}>
                      <View style={[styles.st, log.status === 'SUCCESS' ? styles.stOk : styles.stBad]}>
                        <Text style={[styles.stTxt, log.status === 'SUCCESS' ? styles.stTxtOk : styles.stTxtBad]}>{log.status}</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={modulePickerOpen} transparent animationType="fade" onRequestClose={() => setModulePickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModulePickerOpen(false)} />
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>{t('systemAdminModule')}</Text>
          <ScrollView>
            {logModules.map((m) => (
              <Pressable
                key={m}
                style={styles.pickerRow}
                onPress={() => {
                  setLogModuleFilter(m);
                  setModulePickerOpen(false);
                }}>
                <Text>{m === 'all' ? t('systemAdminAllModules') : m}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={statusPickerOpen} transparent animationType="fade" onRequestClose={() => setStatusPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setStatusPickerOpen(false)} />
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>{t('systemAdminStatus')}</Text>
          {(['all', 'SUCCESS', 'FAILURE'] as const).map((s) => (
            <Pressable
              key={s}
              style={styles.pickerRow}
              onPress={() => {
                setLogStatusFilter(s);
                setStatusPickerOpen(false);
              }}>
              <Text>{s === 'all' ? t('systemAdminLogsStatusAll') : s}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>

      <Modal visible={logDetailModal !== null} animationType="slide" transparent onRequestClose={() => setLogDetailModal(null)}>
        <View style={styles.modalEnd}>
          <Pressable style={styles.backdrop} onPress={() => setLogDetailModal(null)} />
          {logDetailModal ? (
            <View style={styles.detailSheet}>
              <Text style={styles.detailTitle}>{t('systemAdminAuditDetails')}</Text>
              <Text style={styles.detailAction}>{logDetailModal.action}</Text>
              <Text style={styles.detailSub}>
                {new Date(logDetailModal.timestamp).toLocaleString()} · {formatRelativeTime(logDetailModal.timestamp)}
              </Text>
              <View style={styles.detailGrid}>
                <Row k={t('systemAdminInitiator')} v={logDetailModal.user} />
                <Row k={t('systemAdminCategory')} v={logDetailModal.module} />
                {logDetailModal.actionKey ? <Row k={t('systemAdminActionKey')} v={logDetailModal.actionKey} /> : null}
                <Row k={t('systemAdminIp')} v={logDetailModal.ip} />
                <Row k={t('systemAdminStatus')} v={logDetailModal.status} />
              </View>
              <Text style={styles.fpLbl}>{t('systemAdminIntegrity')}</Text>
              <Text style={[styles.fpVal, !logDetailModal.integrityHash?.trim() && styles.fpValMuted]} selectable>
                {logDetailModal.integrityHash?.trim() ? logDetailModal.integrityHash : t('systemAdminNoIntegrityHash')}
              </Text>
              <Pressable style={styles.dismiss} onPress={() => setLogDetailModal(null)}>
                <Text style={styles.dismissTxt}>{t('systemAdminDismiss')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kk}>{k}</Text>
      <Text style={styles.vv}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  syncWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  syncWarnText: { fontSize: 12 },
  syncRetry: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FCD34D',
  },
  syncRetryLbl: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterBannerText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  loadingBlock: { paddingVertical: 36, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingHint: { fontSize: 12 },
  emptyBlock: { paddingVertical: 28, paddingHorizontal: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptySub: { fontSize: 12, marginTop: 8, textAlign: 'center', lineHeight: 18, maxWidth: 320 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardTitleBlock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardTitleRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  cardHeadText: { flex: 1, minWidth: 0 },
  cardToolbar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logFiltersFlex: {
    flex: 1,
    minWidth: 0,
  },
  logFiltersCard: {
    marginBottom: 0,
  },
  iconAmber: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  h2: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 4 },
  iconToolBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  httpToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  filterTwoCol: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  filterCol: { flex: 1.45, minWidth: 0 },
  filterColNarrow: { flex: 1 },
  filterLbl: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectFieldTxt: { flex: 1, fontSize: 14, fontWeight: '500' },
  tableScrollContent: { paddingBottom: spacing.sm },
  tableInner: { flexGrow: 1 },
  trHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  th: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  tr: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: 12, paddingHorizontal: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  td: { paddingHorizontal: 4, justifyContent: 'center' },
  tdUser: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tdStatus: { justifyContent: 'center', alignItems: 'flex-start', paddingTop: 4 },
  cellTs: { fontSize: 11, lineHeight: 15 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 10, fontWeight: '700' },
  cellUser: { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 17 },
  cellModule: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  cellAction: { fontSize: 12, lineHeight: 17 },
  cellIp: { fontSize: 11, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), lineHeight: 15 },
  st: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  stOk: { backgroundColor: '#ECFDF5' },
  stBad: { backgroundColor: '#FEF2F2' },
  stTxt: { fontSize: 10, fontWeight: '800' },
  stTxtOk: { color: '#166534' },
  stTxtBad: { color: '#B91C1C' },
  modalEnd: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  pickerSheet: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    maxHeight: 360,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
  },
  pickerTitle: { fontWeight: '800', marginBottom: 8, fontSize: 16 },
  pickerRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  detailSheet: {
    marginHorizontal: 16,
    marginBottom: 32,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  detailTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  detailAction: { fontSize: 15, fontWeight: '700', color: '#111827' },
  detailSub: { fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 12 },
  detailGrid: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, gap: 8 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  kk: { fontSize: 11, color: '#9CA3AF' },
  vv: { fontSize: 11, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'right' },
  fpLbl: { marginTop: 14, fontSize: 10, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase' },
  fpVal: { marginTop: 6, fontSize: 11, color: '#059669', fontWeight: '700' },
  fpValMuted: { color: '#6B7280', fontWeight: '500' },
  dismiss: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  dismissTxt: { fontSize: 12, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' },
});
