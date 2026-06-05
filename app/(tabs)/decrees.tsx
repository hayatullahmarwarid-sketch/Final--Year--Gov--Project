import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CollapsibleFilters } from '@/components/ui/CollapsibleFilters';
import { DecreeBrowseCard } from '@/components/decrees/DecreeBrowseCard';
import { PublicMobileColumn } from '@/components/layout/public-mobile-column';
import { Brand } from '@/constants/brand';
import {
  DEFAULT_TAB_CATEGORY_VISUAL,
  DECREE_TAB_CATEGORY_VISUAL,
} from '@/constants/decree-category-styles';
import { FormColors } from '@/constants/form';
import { getPublicUiCopy } from '@/constants/public-ui-copy';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import type { DecreeListItem } from '@/data/decree-models';
import { listPublicDecreeCategoriesPage, listPublicDecreesPage } from '@/lib/api/public-user';
import { showToast } from '@/lib/adapters/toast';
import { apiDecreeToListItem } from '@/lib/public/decree-adapters';
import { downloadPublicDecreePdf } from '@/lib/public/public-decree-download';
import { collapsibleFiltersPaletteForPublic, usePublicScreenTheme } from '@/lib/public-screen-theme';
import { palette } from '@/lib/theme';

type CategoryRow = { id: string; name: string; decreeCount: number };

export default function DecreesTabScreen() {
  const { width } = useWindowDimensions();
  const { language } = useAppLanguage();
  const { t, number } = useAppTranslation();
  const th = usePublicScreenTheme();
  const filterPal = useMemo(() => collapsibleFiltersPaletteForPublic(th), [th]);
  const c = useMemo(() => getPublicUiCopy(language), [language]);
  const horizontal = width < 360 ? 14 : 16;
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [creationFrom, setCreationFrom] = useState('');
  const [creationTo, setCreationTo] = useState('');
  const [listItems, setListItems] = useState<DecreeListItem[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingDecrees, setLoadingDecrees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchNonce, setFetchNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCats(true);
      setError(null);
      const res = await listPublicDecreeCategoriesPage({ page: 1, limit: 100 });
      if (cancelled) return;
      if (!res.ok) {
        setError(res.message);
        setCategories([]);
        setLoadingCats(false);
        return;
      }
      const rows = res.items
        .map((r) => {
          const o = r as Record<string, unknown>;
          const id = typeof o.id === 'string' ? o.id : '';
          const rawName = (() => {
            const l = language === 'prs' ? 'fa' : language;
            const read = (k: string) => (typeof o[k] === 'string' ? String(o[k]).trim() : '');
            const nameEn = read('name');
            const namePs = read('namePs');
            const nameFa = read('nameFa');
            const slug = read('slug');
            const want = l === 'ps' ? [namePs, nameFa, nameEn] : l === 'fa' ? [nameFa, namePs, nameEn] : [nameEn, namePs, nameFa];
            return want.find(Boolean) || slug || '';
          })();
          const name = rawName;
          const decreeCount = typeof o.decreeCount === 'number' ? o.decreeCount : 0;
          const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
          return { id, name, decreeCount, sortOrder };
        })
        .filter((x) => Boolean(x.id && x.name))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ id, name, decreeCount }) => ({ id, name, decreeCount }));
      setCategories(rows);
      setActiveCategoryId((prev) => {
        if (prev && rows.some((x) => x.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
      setLoadingCats(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchNonce, language]);

  useEffect(() => {
    if (!activeCategoryId) {
      setListItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingDecrees(true);
      setError(null);
      const from =
        creationFrom.trim() && /^\d{4}-\d{2}-\d{2}$/.test(creationFrom.trim())
          ? new Date(`${creationFrom.trim()}T00:00:00.000Z`)
          : undefined;
      const to =
        creationTo.trim() && /^\d{4}-\d{2}-\d{2}$/.test(creationTo.trim())
          ? new Date(`${creationTo.trim()}T23:59:59.999Z`)
          : undefined;
      const res = await listPublicDecreesPage({
        page: 1,
        limit: 100,
        categoryId: activeCategoryId,
        search: query.trim() || undefined,
        dateField: from || to ? 'creationDate' : undefined,
        from,
        to,
      });
      if (cancelled) return;
      if (!res.ok) {
        setError(res.message);
        setListItems([]);
        setLoadingDecrees(false);
        return;
      }
      setListItems(res.items.map((row) => apiDecreeToListItem(row as Record<string, unknown>, language)));
      setLoadingDecrees(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCategoryId, query, creationFrom, creationTo, fetchNonce, language]);

  const activeCategory = useMemo((): CategoryRow | null => {
    const byId = categories.find((x) => x.id === activeCategoryId);
    if (byId) return byId;
    return categories[0] ?? null;
  }, [categories, activeCategoryId]);

  const cs = DECREE_TAB_CATEGORY_VISUAL[activeCategoryId ?? ''] ?? DEFAULT_TAB_CATEGORY_VISUAL;

  const goExam = useCallback(() => {
    router.push('/(tabs)/exams' as Href);
  }, []);

  const onRetry = useCallback(() => {
    setFetchNonce((n) => n + 1);
  }, []);

  const decreesActiveCount = useMemo(() => {
    let n = 0;
    if (query.trim()) n += 1;
    if (creationFrom.trim()) n += 1;
    if (creationTo.trim()) n += 1;
    return n;
  }, [creationFrom, creationTo, query]);

  const resetDecreesFilters = useCallback(() => {
    setQuery('');
    setCreationFrom('');
    setCreationTo('');
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
      <DecreeBrowseCard
        item={item}
        onView={() => router.push(`/decree/${item.id}` as Href)}
        onDownload={() => onDecreeDownload(item)}
      />
    ),
    [onDecreeDownload],
  );

  const listHeader = (
    <View style={{ paddingBottom: 8 }}>
      <View style={styles.sectionRow}>
        <View style={[styles.sectionIconWrap, { backgroundColor: cs.light, borderColor: cs.border }]}>
          <MaterialCommunityIcons name="bookmark-multiple" size={20} color={cs.accent} />
        </View>
        <View style={styles.sectionTitles}>
          <Text style={[styles.sectionTitle, { color: th.textPrimary }]} maxFontSizeMultiplier={1.15}>
            {activeCategory?.name ?? '—'}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: th.textSecondary }]} maxFontSizeMultiplier={1.1}>
            {listItems.length === 1
              ? t('decreesSectionDecreeCountOne', { count: number(listItems.length) })
              : t('decreesSectionDecreeCountMany', { count: number(listItems.length) })}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.takeExamBtn, pressed && styles.takeExamBtnPressed]}
          onPress={goExam}
          accessibilityRole="button"
          accessibilityLabel={t('a11yTakeExamCategory')}>
          <MaterialCommunityIcons name="school" size={16} color={palette.white} />
          <Text style={styles.takeExamLabel} maxFontSizeMultiplier={1.05}>
            {t('decreesTakeExam')}
          </Text>
        </Pressable>
      </View>
      <CollapsibleFilters
        style={[styles.decreesFiltersCard, { marginHorizontal: horizontal, backgroundColor: th.filterCardBg }]}
        adminPalette={filterPal}
        activeCount={decreesActiveCount}
        onReset={resetDecreesFilters}
        resetDisabled={decreesActiveCount === 0}>
        <View
          style={[
            styles.searchShell,
            { backgroundColor: th.searchInputBg, borderColor: th.searchBorder },
          ]}>
          <Ionicons name="search" size={14} color={th.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: th.searchInputText }]}
            placeholder={t('decreesSearchInCategory', {
              category: activeCategory?.name && activeCategory.name.trim() ? activeCategory.name : '—',
            })}
            placeholderTextColor={FormColors.placeholder}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('a11yClearSearch')}>
              <Text style={[styles.clearText, { color: th.textMuted }]}>{'\u2715'}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterCol}>
            <Text style={[styles.filterLabel, { color: th.textSecondary }]}>{t('decreesCreationFrom')}</Text>
            <TextInput
              style={[
                styles.filterInput,
                { backgroundColor: th.searchInputBg, borderColor: th.searchBorder, color: th.searchInputText },
              ]}
              placeholder={t('decreesDatePlaceholder')}
              placeholderTextColor={FormColors.placeholder}
              value={creationFrom}
              onChangeText={setCreationFrom}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.filterCol}>
            <Text style={[styles.filterLabel, { color: th.textSecondary }]}>{t('decreesCreationTo')}</Text>
            <TextInput
              style={[
                styles.filterInput,
                { backgroundColor: th.searchInputBg, borderColor: th.searchBorder, color: th.searchInputText },
              ]}
              placeholder={t('decreesDatePlaceholder')}
              placeholderTextColor={FormColors.placeholder}
              value={creationTo}
              onChangeText={setCreationTo}
              autoCapitalize="none"
            />
          </View>
        </View>
      </CollapsibleFilters>
    </View>
  );

  const listFooter =
    listItems.length > 0 ? (
      <View style={styles.examBanner}>
        <View style={styles.examBannerTopLine} />
        <View style={styles.examBannerInner}>
          <View style={styles.examBannerIcon}>
            <MaterialCommunityIcons name="school" size={22} color={palette.white} />
          </View>
          <View style={styles.examBannerText}>
            <Text style={styles.examBannerTitle}>{t('decreesBannerTitle')}</Text>
            <Text style={styles.examBannerSub}>
              {listItems.length === 1
                ? t('decreesBannerSub', {
                    category: activeCategory?.name ?? '—',
                    count: number(listItems.length),
                  })
                : t('decreesBannerSubMany', {
                    category: activeCategory?.name ?? '—',
                    count: number(listItems.length),
                  })}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.examStartBtn, pressed && { opacity: 0.94 }]}
            onPress={goExam}
            accessibilityRole="button"
            accessibilityLabel={t('a11yStartExam')}>
            <Text style={styles.examStartLabel}>{t('decreesStart')}</Text>
            <Ionicons
              name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
              size={16}
              color={Brand.green}
            />
          </Pressable>
        </View>
      </View>
    ) : null;

  return (
    <PublicMobileColumn backgroundColor={th.columnBg}>
      <View style={[styles.shell, { backgroundColor: th.pageBg }]}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeTop} edges={['top']}>
          <View style={[styles.header, { paddingHorizontal: horizontal }]}>
            <View style={styles.headerTop}>
              <View style={styles.titleBlock}>
                <Text style={styles.titleEn} maxFontSizeMultiplier={1.15}>
                  {c.homeAppTitle}
                </Text>
              </View>
              <View style={styles.headerBookBtn}>
                <MaterialCommunityIcons name="book-open-page-variant" size={22} color={palette.white} />
              </View>
            </View>
          </View>
        </SafeAreaView>

        <View
          style={[
            styles.chipsStrip,
            { backgroundColor: th.elevatedSurface, borderBottomColor: th.chipsStripBorder },
          ]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.chipsContent, { paddingHorizontal: horizontal }]}>
            {categories.map((cat) => {
              const selected = cat.id === activeCategoryId;
              const cs2 = DECREE_TAB_CATEGORY_VISUAL[cat.id] ?? DEFAULT_TAB_CATEGORY_VISUAL;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    setActiveCategoryId(cat.id);
                    setQuery('');
                  }}
                  style={({ pressed }) => [
                    styles.chip,
                    selected
                      ? styles.chipSelected
                      : [styles.chipIdle, { backgroundColor: th.chipIdleBg, borderColor: 'transparent' }],
                    pressed && { opacity: 0.92 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t('a11yCategoryDecrees', {
                    name: cat.name,
                    count: number(cat.decreeCount),
                  })}>
                  {!selected ? <View style={[styles.chipDot, { backgroundColor: cs2.dot }]} /> : null}
                  <Text
                    style={[
                      styles.chipLabel,
                      selected ? styles.chipLabelSelected : [styles.chipLabelIdle, { color: th.chipIdleText }],
                    ]}
                    maxFontSizeMultiplier={1.1}>
                    {cat.name}
                  </Text>
                  <View
                    style={[
                      styles.chipCount,
                      selected
                        ? styles.chipCountSelected
                        : [styles.chipCountIdle, { backgroundColor: th.chipIdleCountBg }],
                    ]}>
                    <Text
                      style={[
                        styles.chipCountText,
                        selected
                          ? styles.chipCountTextSelected
                          : [styles.chipCountTextIdle, { color: th.chipIdleCountText }],
                      ]}
                      maxFontSizeMultiplier={1.05}>
                      {number(cat.decreeCount)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={listItems}
          keyExtractor={(item) => item.id}
          extraData={`${activeCategoryId}-${th.isDark}`}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListFooterComponent={
            <>
              {listFooter}
              <View style={{ height: 28 }} />
            </>
          }
          style={[styles.list, { backgroundColor: th.pageBg }]}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: horizontal, paddingBottom: 8 },
          ]}
          showsVerticalScrollIndicator
          ListEmptyComponent={
            loadingCats || loadingDecrees ? (
              <ActivityIndicator style={{ marginTop: 48 }} color={Brand.green} />
            ) : error ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { color: th.textSecondary }]}>{error}</Text>
                <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('a11yRetry')}>
                  <Text style={[styles.emptyHint, { color: Brand.green, fontWeight: '700' }]}>{t('a11yRetry')}</Text>
                </Pressable>
              </View>
            ) : categories.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { color: th.textSecondary }]}>{t('decreesNoCategories')}</Text>
                <Text style={[styles.emptyHint, { color: th.textMuted }]}>{t('decreesTryLater')}</Text>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIcon, { backgroundColor: th.emptyIconBg }]}>
                  <Ionicons name="search" size={26} color={th.iconMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: th.textSecondary }]}>{t('homeNoDecrees')}</Text>
                <Text style={[styles.emptyHint, { color: th.textMuted }]}>{t('decreesTryDifferentKeyword')}</Text>
              </View>
            )
          }
        />
      </View>
    </PublicMobileColumn>
  );
}

const styles = StyleSheet.create({
  shell: {
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
  },
  titleBlock: {
    flex: 1,
    paddingEnd: 12,
    paddingTop: 2,
  },
  titlePs: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  titleEn: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  headerBookBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsStrip: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
          }
        : { elevation: 2 }),
  },
  chipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipIdle: {
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
    ...(Platform.OS === 'ios'
        ? {
            shadowColor: Brand.green,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
          }
        : { elevation: 3 }),
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipLabelIdle: {},
  chipLabelSelected: {
    color: palette.white,
  },
  chipCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCountIdle: {},
  chipCountSelected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  chipCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chipCountTextIdle: {},
  chipCountTextSelected: {
    color: palette.white,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitles: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  takeExamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Brand.green,
    borderWidth: 1,
    borderColor: palette.primaryAlpha.a35,
    ...(Platform.OS === 'ios'
        ? {
            shadowColor: Brand.green,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
          }
        : { elevation: 4 }),
  },
  takeExamBtnPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.98 }],
  },
  takeExamLabel: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '700',
  },
  decreesFiltersCard: {
    marginTop: 10,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
          }
        : { elevation: 1 }),
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: Platform.OS === 'android' ? 4 : 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  filterCol: { flex: 1, minWidth: 0 },
  filterLabel: { fontSize: 11, marginBottom: 6, fontWeight: '600' },
  filterInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13,
  },
  clearText: {
    fontSize: 12,
    paddingHorizontal: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 12,
  },
  examBanner: {
    marginTop: 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Brand.green,
    borderWidth: 1,
    borderColor: palette.primaryAlpha.a35,
    ...(Platform.OS === 'ios'
        ? {
            shadowColor: Brand.green,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
          }
        : { elevation: 4 }),
  },
  examBannerTopLine: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    opacity: 0.9,
  },
  examBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  examBannerIcon: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  examBannerText: {
    flex: 1,
    minWidth: 0,
  },
  examBannerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  examBannerSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 4,
  },
  examStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.white,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    ...(Platform.OS === 'ios'
        ? {
            shadowColor: palette.white,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          }
        : { elevation: 3 }),
  },
  examStartLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.green,
  },
});
