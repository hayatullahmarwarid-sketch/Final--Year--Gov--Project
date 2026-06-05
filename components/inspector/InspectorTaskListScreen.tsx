import { Ionicons } from '@expo/vector-icons';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { HomeColors } from '@/constants/home';
import { useInspectorLang } from '@/contexts/inspector-lang-context';
import { CollapsibleFilters } from '@/components/ui/CollapsibleFilters';
import { palette } from '@/lib/theme';
import { type InspectorTask, type TaskStatus } from '@/data/inspector-tasks';
import { useInspectorWorkspace } from '@/contexts/inspector-workspace-context';

import { INSPECTOR_BAR_BG, inspectorHeaderShadow } from './inspector-chrome';
import { InspectorBottomNav, inspectorBottomNavOffset } from './InspectorBottomNav';
import { INSPECTOR_TRANSLATIONS, inspectorDashboardStatusText } from './inspector-translations';

const FILTERS: (TaskStatus | 'all')[] = [
  'all',
  'assigned',
  'in-progress',
  'overdue',
  'draft',
  'completed',
  'returned',
];

function statusStyle(status: InspectorTask['status']) {
  switch (status) {
    case 'assigned':
      return { bg: palette.primaryWash, text: palette.primaryShade2, border: palette.primaryWashBorder };
    case 'in-progress':
      return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
    case 'overdue':
      return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' };
    case 'draft':
      return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
    case 'completed':
      return { bg: '#D1FAE5', text: '#047857', border: '#A7F3D0' };
    case 'returned':
      return { bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE' };
    default:
      return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
  }
}

function filterChipLabel(lang: 'ps' | 'dr', f: TaskStatus | 'all'): string {
  const t = INSPECTOR_TRANSLATIONS[lang];
  if (f === 'all') return t.filterAll;
  return inspectorDashboardStatusText(lang, f);
}

export function InspectorTaskListScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarOffset = inspectorBottomNavOffset(insets.bottom);
  const { lang } = useInspectorLang();
  const t = INSPECTOR_TRANSLATIONS[lang];
  const { tasks: INSPECTOR_TASKS, loading: workspaceLoading, error: workspaceError } = useInspectorWorkspace();
  const params = useLocalSearchParams<{ filter?: string | string[]; q?: string | string[] }>();
  const horizontal = width < 360 ? 14 : 16;
  const gutter = width >= 768 ? 24 : 16;
  const listColumnWidth = width > 0 ? Math.max(280, Math.min(width - gutter * 2, 680)) : 560;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<TaskStatus | 'all'>('all');

  useEffect(() => {
    const rawQ = params.q;
    const q = typeof rawQ === 'string' ? rawQ : Array.isArray(rawQ) ? rawQ[0] : undefined;
    if (q != null && q.length > 0) {
      setSearchQuery(q);
    }
  }, [params.q]);

  useEffect(() => {
    const raw = params.filter;
    const v = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (!v) {
      setActiveFilter('all');
      return;
    }
    if (FILTERS.includes(v as TaskStatus | 'all')) {
      setActiveFilter(v as TaskStatus | 'all');
    }
  }, [params.filter]);

  const filtered = useMemo(() => {
    return INSPECTOR_TASKS.filter((task) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        task.title.toLowerCase().includes(q) ||
        task.id.toLowerCase().includes(q) ||
        task.region.toLowerCase().includes(q);
      const matchesFilter = activeFilter === 'all' || task.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/inspector' as Href);
  }, []);

  const resetTaskStatusFilter = useCallback(() => setActiveFilter('all'), []);

  return (
    <View style={styles.columnRoot}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={[styles.headerBlue, { paddingHorizontal: horizontal }]}>
          <View style={styles.header}>
            <Pressable onPress={goBack} style={styles.backBtn} accessibilityRole="button">
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </Pressable>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle} maxFontSizeMultiplier={1.2} numberOfLines={1}>
                {t.taskDirectory}
              </Text>
            </View>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.92)" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t.searchPlaceholder}
              placeholderTextColor="rgba(255,255,255,0.42)"
              style={styles.searchInput}
              maxFontSizeMultiplier={1.2}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery('')} accessibilityRole="button" hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.55)" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <CollapsibleFilters
          title={t.filter}
          summary={filterChipLabel(lang, activeFilter)}
          activeCount={activeFilter !== 'all' ? 1 : 0}
          onReset={resetTaskStatusFilter}
          resetDisabled={activeFilter === 'all'}
          style={[styles.taskFiltersCard, { marginHorizontal: gutter }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}>
            {FILTERS.map((f) => {
              const active = activeFilter === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={[styles.filterChip, active && styles.filterChipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}>
                  <Text style={[styles.filterChipText, active && styles.filterChipTextOn]} maxFontSizeMultiplier={1.1}>
                    {filterChipLabel(lang, f)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </CollapsibleFilters>

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={{
            paddingBottom: tabBarOffset + 48,
            paddingTop: 12,
            width: '100%',
            alignItems: 'center',
          }}>
          <View style={[styles.listColumn, { width: listColumnWidth, maxWidth: '100%' }]}>
          {workspaceLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Brand.green} size="large" />
              <Text style={styles.loadingTxt} maxFontSizeMultiplier={1.1}>
                {t.loadingAssignments}
              </Text>
            </View>
          ) : null}
          {workspaceError ? (
            <View style={styles.errBox}>
              <Text style={styles.errTxt} maxFontSizeMultiplier={1.1}>
                {workspaceError}
              </Text>
            </View>
          ) : null}
          {filtered.length > 0 ? (
            filtered.map((task, idx) => {
              const st = statusStyle(task.status);
              const displayId = idx + 1;
              return (
                <Pressable
                  key={task.id}
                  onPress={() => router.push(`/inspector/tasks/${task.id}` as Href)}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.97 }]}>
                  <View
                    style={[
                      styles.prioTop,
                      {
                        backgroundColor:
                          task.priority === 'high'
                            ? palette.primaryShade1
                            : task.priority === 'medium'
                              ? Brand.green
                              : palette.primaryTint1,
                      },
                    ]}
                  />
                  <View style={styles.cardInner}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.statusPill, { backgroundColor: st.bg, borderColor: st.border, color: st.text }]} maxFontSizeMultiplier={1.05}>
                        {inspectorDashboardStatusText(lang, task.status).toUpperCase()}
                      </Text>
                      <Text style={styles.taskId}>#{displayId}</Text>
                    </View>
                    <Text style={styles.cardTitle} maxFontSizeMultiplier={1.15}>
                      {task.title}
                    </Text>
                    <Text style={styles.cardDecree} maxFontSizeMultiplier={1.1}>
                      {task.decreeTitle}
                    </Text>
                    <View style={styles.grid2}>
                      <View style={styles.meta}>
                        <Ionicons name="location-outline" size={12} color="#D1D5DB" />
                        <Text style={styles.metaTxt} maxFontSizeMultiplier={1.1}>
                          {task.region}
                        </Text>
                      </View>
                      <View style={[styles.meta, { justifyContent: 'flex-end' }]}>
                        <Ionicons name="calendar-outline" size={12} color="#D1D5DB" />
                        <Text
                          style={[styles.metaTxt, task.status === 'overdue' && { color: '#EF4444', fontWeight: '800' }]}
                          maxFontSizeMultiplier={1.1}>
                          {`Deadline ${task.deadline}`}
                        </Text>
                      </View>
                    </View>
                    {task.status === 'returned' && task.returnReason ? (
                      <View style={styles.revision}>
                        <Ionicons name="alert-circle" size={12} color="#7C3AED" />
                        <Text style={styles.revisionTxt} maxFontSizeMultiplier={1.1}>
                          {task.returnReason}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.15}>
                {t.noMatchingTasks}
              </Text>
              <Text style={styles.emptySub} maxFontSizeMultiplier={1.1}>
                {t.tryAdjustFilters}
              </Text>
            </View>
          )}
          </View>
        </ScrollView>

        <Pressable
          style={[styles.fab, { right: gutter, bottom: tabBarOffset + 16 }]}
          accessibilityRole="button"
          accessibilityLabel={t.menuSyncQueue}
          onPress={() => router.push('/inspector/sync' as Href)}>
          <Ionicons name="cloud-upload-outline" size={26} color="#fff" />
        </Pressable>

        <InspectorBottomNav />
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
  headerBlue: {
    width: '100%',
    backgroundColor: INSPECTOR_BAR_BG,
    flexShrink: 0,
  },
  body: { flex: 1, width: '100%', minHeight: 0, backgroundColor: HomeColors.pageBg },
  header: {
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: { padding: 8, marginLeft: -4, borderRadius: 999 },
  headerTitleWrap: { flex: 1, minWidth: 0, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    paddingTop: 4,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#fff',
  },
  taskFiltersCard: {
    marginTop: 4,
    marginBottom: 4,
  },
  filterScroll: { flexGrow: 0, flexShrink: 0, width: '100%', maxHeight: 56 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    flexGrow: 1,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  filterChipOn: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  filterChipText: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.6, textTransform: 'uppercase' },
  filterChipTextOn: { color: '#fff' },
  listScroll: { flex: 1, width: '100%', minHeight: 0 },
  listColumn: { alignSelf: 'center' },
  loadingWrap: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  loadingTxt: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  errBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginBottom: 12,
    width: '100%',
  },
  errTxt: { fontSize: 12, fontWeight: '600', color: '#92400E', lineHeight: 18 },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.primaryWashBorder,
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'stretch',
  },
  prioTop: { height: 4, width: '100%' },
  cardInner: { padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statusPill: {
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  taskId: { fontSize: 10, color: '#9CA3AF', fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 4 },
  cardDecree: { fontSize: 10, color: '#9CA3AF', marginBottom: 12 },
  grid2: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  metaTxt: { fontSize: 10, color: '#4B5563', fontWeight: '600' },
  revision: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    gap: 8,
  },
  revisionTxt: { flex: 1, fontSize: 9, fontWeight: '600', color: '#6D28D9', lineHeight: 14 },
  empty: { alignItems: 'center', paddingVertical: 56, opacity: 0.85 },
  emptyTitle: { marginTop: 16, fontSize: 14, fontWeight: '800', color: '#6B7280', letterSpacing: 1, textTransform: 'uppercase' },
  emptySub: { marginTop: 6, fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Brand.green,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
});
