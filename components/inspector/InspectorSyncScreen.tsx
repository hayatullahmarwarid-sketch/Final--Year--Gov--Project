import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { type Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { HomeColors } from '@/constants/home';
import { useInspectorLang } from '@/contexts/inspector-lang-context';
import { useInspectorSyncQueue } from '@/contexts/inspector-sync-queue-context';
import { useInspectorWorkspace } from '@/contexts/inspector-workspace-context';
import { inspectorsApi } from '@/lib/api/inspectors';
import { loadLocalOfflineSubmits, removeLocalOfflineSubmitsByIds } from '@/lib/inspector-offline-local-queue';
import { palette } from '@/lib/theme';

import { INSPECTOR_BAR_BG, inspectorHeaderShadow } from './inspector-chrome';
import { InspectorBottomNav, inspectorBottomNavOffset } from './InspectorBottomNav';
import { INSPECTOR_TRANSLATIONS } from './inspector-translations';

export function InspectorSyncScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarOffset = inspectorBottomNavOffset(insets.bottom);
  const horizontalPad = width >= 900 ? Math.max(24, (width - 560) / 2) : width >= 768 ? 32 : 16;
  const { lang } = useInspectorLang();
  const ti = INSPECTOR_TRANSLATIONS[lang];
  const { items, setItems } = useInspectorSyncQueue();
  const { refresh: refreshWorkspace } = useInspectorWorkspace();
  const [syncingAll, setSyncingAll] = useState(false);
  const [serverRows, setServerRows] = useState<Record<string, unknown>[]>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    (async () => {
      try {
        const s = await Network.getNetworkStateAsync();
        setIsOnline(!!s.isConnected);
      } catch {
        setIsOnline(true);
      }
    })();
    try {
      sub = Network.addNetworkStateListener((state) => {
        setIsOnline(!!state.isConnected);
      });
    } catch {
      /* ignore */
    }
    return () => sub?.remove();
  }, []);

  const loadServerSync = useCallback(async () => {
    setSyncLoading(true);
    const r = await inspectorsApi.syncStatus({ limit: 80 });
    setSyncLoading(false);
    if (r.ok !== true) {
      setServerRows([]);
      return;
    }
    const d = (r as { ok: true; data: unknown }).data as Record<string, unknown>;
    const list = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
    setServerRows(list);
    setLastSynced(typeof d.generatedAt === 'string' ? d.generatedAt : new Date().toISOString());
  }, []);

  useEffect(() => {
    void loadServerSync();
  }, [loadServerSync]);

  const syncAll = async () => {
    setSyncingAll(true);
    try {
      const net = await Network.getNetworkStateAsync();
      const online =
        net.isConnected === true &&
        net.isInternetReachable !== false &&
        net.isInternetReachable !== null;
      if (!online) {
        Alert.alert('Offline', 'Connect to the internet to sync pending inspections.');
        return;
      }
      const local = await loadLocalOfflineSubmits();
      const uploaded: string[] = [];
      for (const row of local) {
        const imp = await inspectorsApi.importOfflineInspection({
          offlineId: row.offlineId,
          assignmentId: row.assignmentId,
          answers: row.answers,
          submittedAt: row.submittedAt,
        });
        if (imp.ok) uploaded.push(row.offlineId);
      }
      if (uploaded.length) await removeLocalOfflineSubmitsByIds(uploaded);
      await inspectorsApi.syncOfflineInspections();
      await loadServerSync();
      await refreshWorkspace();
      setItems([]);
    } finally {
      setSyncingAll(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/inspector' as Href);
  };

  const updatedTs = lastSynced ? lastSynced.slice(0, 19).replace('T', ' ') : '—';

  return (
    <View style={styles.columnRoot}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backBtn} accessibilityRole="button">
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={1.2}>
            {ti.menuSyncQueue}
          </Text>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <ScrollView
          style={styles.scrollMain}
          contentContainerStyle={{
            paddingHorizontal: horizontalPad,
            paddingBottom: tabBarOffset + (items.length > 0 ? 96 : 32),
            paddingTop: 16,
          }}>
          <View style={[styles.netCard, !isOnline && styles.netCardOffline]}>
            <View style={styles.netCardTop}>
              <View style={[styles.netIconWrap, !isOnline && styles.netIconWrapOffline]}>
                <Ionicons
                  name={isOnline ? 'wifi' : 'cloud-offline-outline'}
                  size={22}
                  color={isOnline ? Brand.green : '#B45309'}
                />
              </View>
              <View style={styles.netTextCol}>
                <Text style={styles.netHeading} maxFontSizeMultiplier={1.1}>
                  {ti.syncNetHeading}
                </Text>
                <Text style={[styles.netDetail, !isOnline && styles.netDetailOffline]} maxFontSizeMultiplier={1.05}>
                  {isOnline ? ti.syncNetOnlineDetail : ti.syncNetOfflineDetail}
                </Text>
              </View>
            </View>
            <View style={styles.netDivider} />
            <Text style={styles.netMeta} maxFontSizeMultiplier={1.05}>
              {ti.syncLastUpdated.replace('{{ts}}', updatedTs)}
            </Text>
          </View>

          {syncLoading ? (
            <View style={styles.syncLoading}>
              <ActivityIndicator color={Brand.green} />
            </View>
          ) : null}

          {serverRows.length > 0 ? (
            <>
              <Text style={styles.sectionHdr} maxFontSizeMultiplier={1.05}>
                Assignments (server)
              </Text>
              {serverRows.map((row) => (
                <View key={String(row.assignmentId)} style={styles.serverCard}>
                  <Text style={styles.serverTitle} maxFontSizeMultiplier={1.05}>
                    #{String(row.assignmentId ?? '').slice(-6)}
                  </Text>
                  <Text style={styles.serverMeta} maxFontSizeMultiplier={1.05}>
                    Status: {String(row.status ?? '')}
                  </Text>
                  <Text style={styles.serverMeta} maxFontSizeMultiplier={1.05}>
                    Draft: {row.draft ? 'yes' : 'no'} · Evidence files: {String(row.evidenceFileCount ?? 0)}
                  </Text>
                </View>
              ))}
            </>
          ) : null}

          {items.length > 0 ? (
            <>
              <Text style={styles.sectionHdr} maxFontSizeMultiplier={1.05}>
                Local queue
              </Text>
              <View style={styles.listHead}>
                <Text style={styles.listHeadTxt} maxFontSizeMultiplier={1.05}>
                  {items.length} items waiting
                </Text>
                <Pressable onPress={() => setItems([])}>
                  <Text style={styles.clearAll} maxFontSizeMultiplier={1.05}>
                    Clear All
                  </Text>
                </Pressable>
              </View>
              {items.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.typeRow}>
                      <View
                        style={[
                          styles.dot,
                          item.status === 'syncing'
                            ? { backgroundColor: Brand.green }
                            : item.status === 'failed'
                              ? { backgroundColor: '#EF4444' }
                              : { backgroundColor: palette.primaryTint2 },
                        ]}
                      />
                      <Text style={styles.typeTxt} maxFontSizeMultiplier={1.05}>
                        {item.type}
                      </Text>
                    </View>
                    <Text style={styles.taskId} maxFontSizeMultiplier={1.05}>
                      #{item.taskId}
                    </Text>
                  </View>
                  <View style={styles.cardMid}>
                    <View>
                      <Text style={styles.miniLabel} maxFontSizeMultiplier={1.05}>
                        Items
                      </Text>
                      <View style={styles.chips}>
                        {item.items.map((it, i) => (
                          <Text key={i} style={styles.chip} maxFontSizeMultiplier={1.05}>
                            {it}
                          </Text>
                        ))}
                      </View>
                    </View>
                    <View>
                      <Text style={styles.miniLabel} maxFontSizeMultiplier={1.05}>
                        Size
                      </Text>
                      <Text style={styles.sizeTxt} maxFontSizeMultiplier={1.05}>
                        {item.size}
                      </Text>
                    </View>
                  </View>
                  {item.status === 'syncing' && item.progress != null ? (
                    <View style={{ marginBottom: 12 }}>
                      <View style={styles.proHead}>
                        <Text style={styles.proLabel} maxFontSizeMultiplier={1.05}>
                          Uploading...
                        </Text>
                        <Text style={styles.proLabel} maxFontSizeMultiplier={1.05}>
                          {item.progress}%
                        </Text>
                      </View>
                      <View style={styles.proTrack}>
                        <View style={[styles.proFill, { width: `${item.progress}%` }]} />
                      </View>
                    </View>
                  ) : null}
                  {item.status === 'failed' && item.error ? (
                    <View style={styles.failBox}>
                      <Ionicons name="alert-circle" size={14} color="#DC2626" />
                      <Text style={styles.failTxt} maxFontSizeMultiplier={1.05}>
                        {item.error} - Retrying in 30s
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.cardFoot}>
                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.timeTxt} maxFontSizeMultiplier={1.05}>
                        {item.timestamp}
                      </Text>
                    </View>
                    <View style={styles.footBtns}>
                      <Pressable
                        style={styles.trashBtn}
                        onPress={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
                        accessibilityRole="button">
                        <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
                      </Pressable>
                      <Pressable style={styles.retryBtn} accessibilityRole="button">
                        <Ionicons name="refresh" size={12} color="#fff" />
                        <Text style={styles.retryTxt} maxFontSizeMultiplier={1.05}>
                          Retry
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </>
          ) : !syncLoading && items.length === 0 && serverRows.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="checkmark-circle" size={40} color="#059669" />
              </View>
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.15}>
                All Synced
              </Text>
              <Text style={styles.emptySub} maxFontSizeMultiplier={1.1}>
                No pending local uploads. Server assignment snapshot is shown above when available.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <InspectorBottomNav />

        {items.length > 0 || serverRows.length > 0 ? (
          <View style={[styles.ctaBar, { bottom: tabBarOffset }]}>
            <Pressable
              disabled={syncingAll}
              onPress={syncAll}
              style={[styles.syncBtn, syncingAll && { opacity: 0.55 }]}
              accessibilityRole="button">
              {syncingAll ? (
                <>
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.syncBtnTxt} maxFontSizeMultiplier={1.1}>
                    Synchronizing...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="flash" size={20} color="#fff" />
                  <Text style={styles.syncBtnTxt} maxFontSizeMultiplier={1.1}>
                    Sync All Now
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  columnRoot: {
    flex: 1,
    width: '100%',
    backgroundColor: HomeColors.pageBg,
  },
  safeTop: {
    backgroundColor: INSPECTOR_BAR_BG,
    ...inspectorHeaderShadow,
  },
  body: { flex: 1, width: '100%', minHeight: 0, backgroundColor: HomeColors.pageBg },
  scrollMain: { flex: 1 },
  header: {
    backgroundColor: INSPECTOR_BAR_BG,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: { padding: 8, marginLeft: -4, borderRadius: 999 },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  netCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: palette.primaryWashBorder,
    elevation: 2,
    shadowColor: Brand.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  netCardOffline: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  netCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  netIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: palette.primaryWash,
    borderWidth: 1,
    borderColor: palette.primaryWashBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  netIconWrapOffline: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  netTextCol: { flex: 1, minWidth: 0 },
  netHeading: {
    color: palette.neutral900,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  netDetail: {
    marginTop: 4,
    color: palette.primaryShade2,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  netDetailOffline: {
    color: '#B45309',
  },
  netDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.neutral200,
    marginVertical: 12,
  },
  netMeta: {
    color: palette.neutral500,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  syncLoading: { paddingVertical: 24, alignItems: 'center' },
  sectionHdr: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 8,
  },
  serverCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 10,
  },
  serverTitle: { fontSize: 13, fontWeight: '800', color: '#111827' },
  serverMeta: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  listHeadTxt: { fontSize: 12, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.6, textTransform: 'uppercase' },
  clearAll: { fontSize: 10, fontWeight: '800', color: '#EF4444', letterSpacing: 0.5, textTransform: 'uppercase' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 16,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  typeTxt: { fontSize: 10, fontWeight: '800', color: '#1F2937', letterSpacing: 0.6, textTransform: 'uppercase' },
  taskId: { fontSize: 10, color: '#9CA3AF', fontWeight: '700' },
  cardMid: { flexDirection: 'row', gap: 24, marginBottom: 12 },
  miniLabel: { fontSize: 9, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.3, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chip: {
    fontSize: 8,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  sizeTxt: { fontSize: 10, fontWeight: '800', color: '#1F2937', marginTop: 4 },
  proHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  proLabel: { fontSize: 9, fontWeight: '800', color: Brand.green, textTransform: 'uppercase' },
  proTrack: { height: 6, backgroundColor: palette.primaryWash, borderRadius: 3, overflow: 'hidden' },
  proFill: { height: '100%', backgroundColor: Brand.green, borderRadius: 3 },
  failBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 8,
    marginBottom: 12,
  },
  failTxt: { flex: 1, fontSize: 9, fontWeight: '800', color: '#B91C1C', letterSpacing: 0.3, textTransform: 'uppercase' },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeTxt: { fontSize: 9, color: '#9CA3AF', fontWeight: '600' },
  footBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  trashBtn: { padding: 10, borderRadius: 8, backgroundColor: '#F9FAFB' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Brand.green,
  },
  retryTxt: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#111827', letterSpacing: 1, textTransform: 'uppercase' },
  emptySub: { marginTop: 8, fontSize: 12, color: '#9CA3AF', textAlign: 'center', maxWidth: 300, paddingHorizontal: 16, lineHeight: 18 },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  syncBtn: {
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 6,
    shadowColor: Brand.green,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  syncBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
});
