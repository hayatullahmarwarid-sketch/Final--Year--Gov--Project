import { Ionicons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DecreeCard } from '@/components/home/DecreeCard';
import { PublicMobileColumn } from '@/components/layout/public-mobile-column';
import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { HomeColors } from '@/constants/home';
import { getPublicUiCopy } from '@/constants/public-ui-copy';
import { useAppAppearance } from '@/contexts/app-appearance-context';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useNotificationInbox } from '@/contexts/notification-inbox-context';
import type { DecreeListItem } from '@/data/decree-models';
import { listPublicDecreesPage } from '@/lib/api/public-user';
import { showToast } from '@/lib/adapters/toast';
import { apiDecreeToListItem } from '@/lib/public/decree-adapters';
import { downloadPublicDecreePdf } from '@/lib/public/public-decree-download';
import type { PublicScreenTheme } from '@/lib/public-screen-theme';
import { usePublicScreenTheme } from '@/lib/public-screen-theme';
import { palette } from '@/lib/theme';

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 400;

function SkeletonCard({ th }: { th: PublicScreenTheme }) {
  const bar = th.skeletonBar;
  return (
    <View
      style={[
        skStyles.card,
        { backgroundColor: th.skeletonCardBg, borderColor: th.skeletonBorder },
      ]}>
      <View style={[skStyles.bar, { backgroundColor: bar }]} />
      <View style={skStyles.inner}>
        <View style={skStyles.rowChips}>
          <View style={[skStyles.chip, { width: 56, backgroundColor: bar }]} />
          <View style={[skStyles.chip, { width: 72, backgroundColor: bar }]} />
          <View style={[skStyles.chip, { width: 48, backgroundColor: bar }]} />
        </View>
        <View style={[skStyles.line, { width: '75%', backgroundColor: bar }]} />
        <View style={[skStyles.line, { backgroundColor: bar }]} />
        <View style={[skStyles.line, { width: '83%', backgroundColor: bar }]} />
        <View style={skStyles.rowChips}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[skStyles.chipSm, { backgroundColor: bar }]} />
          ))}
        </View>
        <View style={skStyles.grid2}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[skStyles.lineSm, { backgroundColor: bar }]} />
          ))}
        </View>
        <View style={skStyles.actions}>
          <View style={[skStyles.btn, { backgroundColor: bar }]} />
          <View style={[skStyles.btnSm, { backgroundColor: bar }]} />
        </View>
      </View>
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  bar: { height: 6, width: '100%' },
  inner: { padding: 16, gap: 12 },
  rowChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { height: 24, borderRadius: 999 },
  chipSm: { height: 20, width: 64, borderRadius: 999 },
  line: { height: 12, borderRadius: 4, width: '100%' },
  lineSm: { height: 10, borderRadius: 4 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  btn: { flex: 1, height: 36, borderRadius: 12 },
  btnSm: { width: 64, height: 36, borderRadius: 12 },
});

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const { language } = useAppLanguage();
  const { t, number } = useAppTranslation();
  const c = useMemo(() => getPublicUiCopy(language), [language]);
  const horizontal = width < 360 ? 14 : 16;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [listItems, setListItems] = useState<DecreeListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchNonce, setFetchNonce] = useState(0);
  const { unreadCount } = useNotificationInbox();
  const th = usePublicScreenTheme();
  const { colorScheme, toggleColorScheme } = useAppAppearance();
  const isDarkMode = colorScheme === 'dark';

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setDebouncedSearch('');
      return;
    }
    const t = setTimeout(() => setDebouncedSearch(q), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await listPublicDecreesPage({
        page: 1,
        limit: PAGE_LIMIT,
        search: debouncedSearch || undefined,
      });
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.message);
        setListItems([]);
        setPage(1);
        setTotalPages(1);
        setTotalItems(0);
        return;
      }
      const mapped = res.items.map((row) => apiDecreeToListItem(row as Record<string, unknown>, language));
      setListItems(mapped);
      setPage(res.meta.page);
      setTotalPages(res.meta.totalPages);
      setTotalItems(res.meta.total);
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, fetchNonce, language]);

  const hasMore = totalPages > 0 && page < totalPages;
  const allLoaded = !hasMore && !loading && listItems.length > 0;

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || error || !hasMore) return;
    setLoadingMore(true);
    const res = await listPublicDecreesPage({
      page: page + 1,
      limit: PAGE_LIMIT,
      search: debouncedSearch || undefined,
    });
    setLoadingMore(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    const mapped = res.items.map((row) => apiDecreeToListItem(row as Record<string, unknown>, language));
    setListItems((prev) => [...prev, ...mapped]);
    setPage(res.meta.page);
    setTotalPages(res.meta.totalPages);
    setTotalItems(res.meta.total);
  }, [loading, loadingMore, error, hasMore, page, debouncedSearch, language]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    const res = await listPublicDecreesPage({
      page: 1,
      limit: PAGE_LIMIT,
      search: debouncedSearch || undefined,
    });
    if (!res.ok) {
      setError(res.message);
      setRefreshing(false);
      return;
    }
    const mapped = res.items.map((row) => apiDecreeToListItem(row as Record<string, unknown>, language));
    setListItems(mapped);
    setPage(res.meta.page);
    setTotalPages(res.meta.totalPages);
    setTotalItems(res.meta.total);
    setRefreshing(false);
  }, [debouncedSearch, language]);

  const onRetry = useCallback(() => {
    setFetchNonce((n) => n + 1);
  }, []);

  const onDecreeDownload = useCallback(
    async (item: DecreeListItem) => {
      try {
        await downloadPublicDecreePdf(item.id, { suggestedName: `decree-${item.indexLabel}`, locale: language });
      } catch (e) {
        showToast(e instanceof Error ? e.message : t('decreeDownloadFailed'), 'error');
        throw e;
      }
    },
    [t, language],
  );

  const renderItem = useCallback(
    ({ item }: { item: DecreeListItem }) => (
      <DecreeCard
        item={item}
        onView={() => router.push(`/decree/${item.id}` as Href)}
        onDownload={() => onDecreeDownload(item)}
      />
    ),
    [onDecreeDownload],
  );

  const listHeader = (
    <>
      {debouncedSearch ? (
        <View style={styles.resultRow}>
          <Text style={[styles.resultMuted, { color: th.textSecondary }]} maxFontSizeMultiplier={1.15}>
            {totalItems === 1
              ? t('homeResultsForOne', { count: number(totalItems) })
              : t('homeResultsForMany', { count: number(totalItems) })}
          </Text>
          <View
            style={[
              styles.queryChip,
              { backgroundColor: th.queryChipBg, borderColor: th.queryChipBorder },
            ]}>
            <Text style={styles.queryChipText} numberOfLines={1}>
              &quot;{debouncedSearch}&quot;
            </Text>
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={{ paddingBottom: 4 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={`sk-${i}`} th={th} />
          ))}
        </View>
      ) : null}
    </>
  );

  const listFooter = !loading ? (
    <View>
      {error && listItems.length > 0 ? (
        <View style={styles.moreErrorWrap}>
          <Text style={[styles.moreErrorText, { color: th.isDark ? '#FBBF24' : '#B45309' }]}>{error}</Text>
          <Text style={[styles.moreErrorHint, { color: th.textMuted }]}>{t('homeMoreErrorHint')}</Text>
        </View>
      ) : null}
      {loadingMore ? (
        <View style={{ gap: 16, marginBottom: 16 }}>
          {Array.from({ length: Math.min(3, Math.max(1, totalPages - page)) }).map((_, i) => (
            <SkeletonCard key={`more-${i}`} th={th} />
          ))}
        </View>
      ) : null}
      {allLoaded ? (
        <View style={styles.endFeed}>
          <View style={styles.endLineRow}>
            <View style={styles.endLineFade} />
            <View style={styles.endCircle}>
              <Text style={styles.endCheck}>{'\u2713'}</Text>
            </View>
            <View style={[styles.endLineFade, styles.endLineFadeFlip]} />
          </View>
          <Text style={[styles.endCaption, { color: th.textMuted }]}>
            {totalItems === 1
              ? t('homeOneDecreeLoaded')
              : t('homeAllDecreesLoaded', { total: number(totalItems) })}
          </Text>
        </View>
      ) : null}
      <View style={{ height: 24 }} />
    </View>
  ) : null;

  return (
    <PublicMobileColumn backgroundColor={th.columnBg}>
      <View style={[styles.columnRoot, { backgroundColor: th.pageBg }]}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeTop} edges={['top']}>
          <View style={[styles.header, { paddingHorizontal: horizontal }]}>
            <View style={styles.headerTop}>
              <View style={styles.titleBlock}>
                <Text style={styles.titleEn} maxFontSizeMultiplier={1.15}>
                  {c.homeAppTitle}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  style={styles.themeBtnWrap}
                  accessibilityRole="button"
                  accessibilityLabel={isDarkMode ? t('a11yToggleLightMode') : t('a11yToggleDarkMode')}
                  onPress={toggleColorScheme}>
                  <Ionicons
                    name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
                    size={22}
                    color="#fff"
                  />
                </Pressable>
                <Pressable
                  style={styles.bellWrap}
                  accessibilityRole="button"
                  accessibilityLabel={
                    unreadCount > 0
                      ? t('a11yNotificationsUnread', { count: number(unreadCount) })
                      : t('a11yNotifications')
                  }
                  onPress={() => router.push('/notifications')}>
                  <Ionicons name="notifications-outline" size={22} color="#fff" />
                  {unreadCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? `${number(99)}+` : number(unreadCount)}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            </View>
            <View
              style={[
                styles.searchShell,
                {
                  backgroundColor: th.searchInputBg,
                  borderWidth: th.isDark ? StyleSheet.hairlineWidth : 0,
                  borderColor: th.searchBorder,
                },
                searchFocused && styles.searchShellFocused,
              ]}>
              <Ionicons
                name="search"
                size={16}
                color={searchFocused ? Brand.green : FormColors.placeholder}
              />
              <TextInput
                style={[styles.searchInput, { color: th.searchInputText }]}
                placeholder={c.homeSearchPlaceholder}
                placeholderTextColor={FormColors.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                returnKeyType="search"
                onSubmitEditing={() => {
                  const s = searchQuery.trim();
                  if (s.length >= 2) {
                    router.push({ pathname: '/search', params: { q: s } } as Href);
                  }
                }}
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => setSearchQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11yClearSearch')}
                  style={[styles.clearSearch, { backgroundColor: th.clearChipBg }]}>
                  <Ionicons name="close" size={14} color={th.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          </View>
        </SafeAreaView>

        <FlatList
          data={loading ? [] : listItems}
          keyExtractor={(item) => item.id}
          extraData={`${page}-${listItems.length}-${error ?? ''}-${th.isDark}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onPullRefresh()}
              tintColor={Brand.green}
              colors={[Brand.green]}
              progressViewOffset={Platform.OS === 'android' ? 0 : undefined}
            />
          }
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              {listHeader}
            </>
          }
          ListEmptyComponent={
            loading ? null : error ? (
              <View style={styles.empty}>
                <Text style={[styles.emptyTitle, { color: th.textSecondary }]}>{error}</Text>
                <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('a11yRetry')}>
                  <Text style={[styles.emptyHint, styles.retryLink]}>{t('a11yRetry')}</Text>
                </Pressable>
              </View>
            ) : listItems.length === 0 ? (
              <View style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: th.emptyIconBg }]}>
                  <Ionicons name="search" size={28} color={th.iconMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: th.textSecondary }]}>{t('homeNoDecrees')}</Text>
                <Text style={[styles.emptyHint, { color: th.textMuted }]}>{t('homeEmptyHint')}</Text>
              </View>
            ) : null
          }
          ListFooterComponent={listFooter}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: loading ? 0 : 16,
              paddingBottom: 8,
              paddingHorizontal: horizontal,
            },
          ]}
          style={[styles.list, { backgroundColor: th.pageBg }]}
          showsVerticalScrollIndicator
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.35}
        />
      </View>
    </PublicMobileColumn>
  );
}

const styles = StyleSheet.create({
  columnRoot: {
    flex: 1,
  },
  safeTop: {
    backgroundColor: Brand.green,
    ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
          }
        : { elevation: 6 }),
  },
  header: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleBlock: {
    flex: 1,
    paddingEnd: 12,
    paddingTop: 2,
  },
  titleEn: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  themeBtnWrap: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bellWrap: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    end: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Brand.green,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    minHeight: 48,
    ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
          }
        : { elevation: 3 }),
  },
  searchShellFocused: {
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: Platform.OS === 'android' ? 4 : 2,
  },
  clearSearch: {
    padding: 6,
    borderRadius: 999,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  resultMuted: {
    fontSize: 12,
    color: '#6B7280',
  },
  queryChip: {
    backgroundColor: 'rgba(11,79,46,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(11,79,46,0.1)',
    maxWidth: '70%',
  },
  queryChipText: {
    fontSize: 12,
    color: Brand.green,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 56,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptyHint: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryLink: {
    marginTop: 12,
    color: Brand.green,
    fontWeight: '700',
  },
  endFeed: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
  },
  endLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  endLineFade: {
    flex: 1,
    height: 1,
    backgroundColor: palette.primaryAlpha.a30,
    opacity: 0.6,
  },
  endLineFadeFlip: {
    opacity: 0.6,
  },
  endCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: palette.primaryAlpha.a40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCheck: {
    fontSize: 12,
    color: Brand.green,
    fontWeight: '700',
  },
  endCaption: {
    fontSize: 12,
  },
  moreErrorWrap: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
    alignItems: 'center',
    gap: 4,
  },
  moreErrorText: {
    fontSize: 12,
    color: '#B45309',
    textAlign: 'center',
  },
  moreErrorHint: {
    fontSize: 11,
    textAlign: 'center',
  },
});
