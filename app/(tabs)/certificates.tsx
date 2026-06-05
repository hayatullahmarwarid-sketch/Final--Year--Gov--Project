import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CollapsibleFilters } from '@/components/ui/CollapsibleFilters';
import { Brand } from '@/constants/brand';
import { usePublicUserData } from '@/contexts/public-user-data-context';
import {
  CERTIFICATE_FILTER_TABS,
  countCertificatesByFilter,
  type CertificateFilterTab,
  type CertificateLevel,
  type CertificateListItem,
} from '@/data/certificates';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { listPublicCertificatesPage } from '@/lib/api/public-user';
import { collapsibleFiltersPaletteForPublic, usePublicScreenTheme } from '@/lib/public-screen-theme';
import { apiCertificateToListItem } from '@/lib/public/exam-cert-adapters';

const SUBTITLE = 'rgba(183, 220, 198, 0.95)';
const HEADER_RADIUS = 22;

/** Level visuals aligned with design reference */
const LEVEL_STYLES: Record<
  CertificateLevel,
  {
    bar: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    levelLabel: string;
    placeholderAccent: string;
    barAccent2: string;
  }
> = {
  advanced: {
    bar: '#F1B434',
    badgeBg: 'rgba(241, 180, 52, 0.22)',
    badgeBorder: '#F1B434',
    badgeText: '#B45309',
    levelLabel: 'Advanced',
    placeholderAccent: '#F1B434',
    barAccent2: 'rgba(241, 180, 52, 0.55)',
  },
  intermediate: {
    bar: '#1B7340',
    badgeBg: 'rgba(27, 115, 64, 0.14)',
    badgeBorder: '#1B7340',
    badgeText: '#1B7340',
    levelLabel: 'Intermediate',
    placeholderAccent: '#1B7340',
    barAccent2: 'rgba(27, 115, 64, 0.45)',
  },
  basic: {
    bar: Brand.green,
    badgeBg: 'rgba(0, 136, 255, 0.2)',
    badgeBorder: Brand.green,
    badgeText: Brand.green,
    levelLabel: 'Basic',
    placeholderAccent: Brand.green,
    barAccent2: 'rgba(0, 136, 255, 0.5)',
  },
};

const CERT_FILTER_KEYS: Record<CertificateFilterTab, string> = {
  all: 'certFilterAll',
  advanced: 'certLevelAdvanced',
  intermediate: 'certLevelIntermediate',
  basic: 'certLevelBasic',
};

function CertificateCard({
  item,
  cardWidth,
}: {
  item: CertificateListItem;
  cardWidth: number;
}) {
  const { t } = useAppTranslation();
  const th = usePublicScreenTheme();
  const lvl = LEVEL_STYLES[item.level];
  const bump = () => {
    void Haptics.selectionAsync();
  };

  const openDetail = () => {
    bump();
    router.push(`/certificate/${item.id}` as Href);
  };

  return (
    <View style={[styles.card, { width: cardWidth, backgroundColor: th.cardBg }]}>
      <Pressable
        onPress={openDetail}
        accessibilityRole="button"
        accessibilityLabel={t('a11yOpenCertCategory', { category: item.categoryTitle })}>
        <View style={[styles.cardTopBar, { backgroundColor: lvl.bar }]} />
        <View style={styles.cardBody}>
          <View style={styles.placeholderWrap}>
            <View style={[styles.emblemOuter, { borderColor: lvl.placeholderAccent }]}>
              <View style={[styles.emblemInner, { backgroundColor: `${lvl.placeholderAccent}18` }]}>
                <MaterialCommunityIcons name="certificate-outline" size={24} color={lvl.placeholderAccent} />
              </View>
            </View>
            <Text style={[styles.placeholderCategory, { color: th.textSecondary }]} maxFontSizeMultiplier={1.05}>
              Category
            </Text>
            <View style={styles.placeholderBars}>
              <View style={[styles.placeholderBar, { backgroundColor: lvl.barAccent2 }]} />
              <View style={[styles.placeholderBar, { backgroundColor: lvl.barAccent2 }]} />
            </View>
          </View>

          <Text style={[styles.categoryTitle, { color: th.textPrimary }]} maxFontSizeMultiplier={1.12} numberOfLines={2}>
            {item.categoryTitle}
          </Text>

          <View
            style={[
              styles.levelBadge,
              {
                backgroundColor: lvl.badgeBg,
                borderColor: lvl.badgeBorder,
              },
            ]}>
            {item.level === 'advanced' ? (
              <Ionicons name="star" size={14} color={lvl.badgeText} />
            ) : item.level === 'intermediate' ? (
              <MaterialCommunityIcons name="ribbon" size={14} color={lvl.badgeText} />
            ) : (
              <View style={[styles.basicDot, { backgroundColor: lvl.badgeText }]} />
            )}
            <Text style={[styles.levelBadgeText, { color: lvl.badgeText }]} maxFontSizeMultiplier={1.05}>
              {item.level === 'advanced'
                ? t('certLevelAdvanced')
                : item.level === 'intermediate'
                  ? t('certLevelIntermediate')
                  : t('certLevelBasic')}
            </Text>
          </View>
        </View>
      </Pressable>

      <View
        style={[
          styles.cardFooter,
          styles.cardFooterInCard,
          { borderTopColor: th.cardFooterBorder },
        ]}>
        <Text style={[styles.dateText, { color: th.textSecondary }]} maxFontSizeMultiplier={1.05}>
          {item.dateLabel}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.downloadBtn,
            { backgroundColor: th.certDownloadBtnBg },
            pressed && styles.downloadBtnPressed,
          ]}
          onPress={openDetail}
          accessibilityRole="button"
          accessibilityLabel={t('a11yOpenCertDownload', { category: item.categoryTitle })}>
          <Ionicons name="download-outline" size={22} color={th.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

export default function CertificatesTabScreen() {
  const { width } = useWindowDimensions();
  const { t, number } = useAppTranslation();
  const th = usePublicScreenTheme();
  const filterPal = useMemo(() => collapsibleFiltersPaletteForPublic(th), [th]);
  const horizontal = width < 360 ? 14 : 18;
  const gap = 12;
  const cardWidth = (width - horizontal * 2 - gap) / 2;
  const { earnedOnly } = useLocalSearchParams<{ earnedOnly?: string }>();
  const earnedOnlyMode = earnedOnly === '1';
  const { data } = usePublicUserData();

  const [filter, setFilter] = useState<CertificateFilterTab>('all');
  const [apiItems, setApiItems] = useState<CertificateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchNonce, setFetchNonce] = useState(0);

  const loadCerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await listPublicCertificatesPage({ page: 1, limit: 100 });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      setApiItems([]);
      return;
    }
    setApiItems(r.items.map((row) => apiCertificateToListItem(row as Record<string, unknown>)));
  }, []);

  useEffect(() => {
    void loadCerts();
  }, [loadCerts, fetchNonce]);

  const sourceList = useMemo(() => {
    if (!earnedOnlyMode) return apiItems;
    const allowed = new Set(data.earnedCertificateIds);
    return apiItems.filter((c) => allowed.has(c.id));
  }, [earnedOnlyMode, data.earnedCertificateIds, apiItems]);

  const filtered = useMemo(() => {
    if (filter === 'all') return sourceList;
    return sourceList.filter((c) => c.level === filter);
  }, [filter, sourceList]);

  const resetCertificateTabFilter = useCallback(() => setFilter('all'), []);
  const certFilterActiveCount = filter !== 'all' ? 1 : 0;

  const totalEarned = earnedOnlyMode ? sourceList.length : apiItems.length;

  const renderItem = ({ item }: { item: CertificateListItem }) => (
    <CertificateCard item={item} cardWidth={cardWidth} />
  );

  return (
    <View style={[styles.shell, { backgroundColor: th.pageBg }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: horizontal }]}>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={1.15}>
            {earnedOnlyMode ? t('certHeaderMy') : t('certHeaderBrowse')}
          </Text>
          <Text style={styles.headerSubtitle} maxFontSizeMultiplier={1.12}>
            {earnedOnlyMode
              ? totalEarned > 0
                ? totalEarned === 1
                  ? t('certSubtitleEarnedOne')
                  : t('certSubtitleEarnedMany', { count: number(totalEarned) })
                : t('certSubtitlePassFirst')
              : apiItems.length === 1
                ? t('certSubtitleBrowseOne')
                : t('certSubtitleBrowseMany', { count: number(apiItems.length) })}
          </Text>
        </View>
      </SafeAreaView>

      <CollapsibleFilters
        style={[styles.certFiltersCard, { marginHorizontal: horizontal, backgroundColor: th.filterCardBg }]}
        adminPalette={filterPal}
        summary={t(CERT_FILTER_KEYS[filter])}
        activeCount={certFilterActiveCount}
        onReset={resetCertificateTabFilter}
        resetDisabled={filter === 'all'}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
          accessibilityRole="scrollbar">
          {CERTIFICATE_FILTER_TABS.map(({ key, dot }) => {
            const selected = filter === key;
            const n = countCertificatesByFilter(sourceList, key);
            const label = t(CERT_FILTER_KEYS[key]);
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setFilter(key);
                  void Haptics.selectionAsync();
                }}
                style={({ pressed }) => [
                  styles.chip,
                  selected
                    ? styles.chipSelected
                    : [styles.chipIdle, { backgroundColor: th.examChipIdleBg }],
                  pressed && styles.chipPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={t('certFilterChipA11y', { label, count: number(n) })}>
                {!selected ? <View style={[styles.chipDot, { backgroundColor: dot }]} /> : null}
                <Text
                  style={[
                    styles.chipLabel,
                    selected ? styles.chipLabelSelected : [styles.chipLabelIdle, { color: th.examChipIdleText }],
                  ]}
                  maxFontSizeMultiplier={1.1}>
                  {label}
                </Text>
                <View
                  style={[
                    styles.chipCount,
                    selected
                      ? styles.chipCountSelected
                      : [styles.chipCountIdle, { backgroundColor: th.examChipCountIdleBg }],
                  ]}>
                  <Text
                    style={[
                      styles.chipCountText,
                      selected
                        ? styles.chipCountTextSelected
                        : [styles.chipCountTextIdle, { color: th.examChipCountIdleText }],
                    ]}
                    maxFontSizeMultiplier={1.05}>
                    {number(n)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </CollapsibleFilters>

      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={[styles.gridRow, styles.gridRowSpacing]}
        style={[styles.list, { backgroundColor: th.pageBg }]}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontal, paddingBottom: 24 }]}
        showsVerticalScrollIndicator
        extraData={`${filter}-${th.isDark}`}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={Brand.green} />
          ) : error ? (
            <View style={{ paddingTop: 24, alignItems: 'center', gap: 12 }}>
              <Text style={[styles.empty, { color: th.textSecondary }]}>{error}</Text>
              <Pressable onPress={() => setFetchNonce((n) => n + 1)}>
                <Text style={[styles.empty, { color: Brand.green, fontWeight: '700' }]}>{t('certRetry')}</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.empty, { color: th.textSecondary }]} maxFontSizeMultiplier={1.1}>
              {t('certEmpty')}
            </Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  safeTop: {
    backgroundColor: Brand.green,
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 8,
    paddingBottom: 22,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: SUBTITLE,
    lineHeight: 22,
  },
  certFiltersCard: {
    marginTop: 12,
    marginBottom: 8,
  },
  chipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  chipIdle: {},
  chipSelected: {
    backgroundColor: Brand.green,
  },
  chipPressed: {
    opacity: 0.92,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipLabelIdle: {},
  chipLabelSelected: {
    color: '#fff',
  },
  chipCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCountIdle: {},
  chipCountSelected: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  chipCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipCountTextIdle: {},
  chipCountTextSelected: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridRowSpacing: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  cardTopBar: {
    height: 11,
    width: '100%',
  },
  cardBody: {
    padding: 12,
    paddingTop: 14,
  },
  placeholderWrap: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  emblemOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emblemInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCategory: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  placeholderBars: {
    width: '70%',
    gap: 6,
  },
  placeholderBar: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 10,
    minHeight: 40,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 12,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  basicDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardFooterInCard: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnPressed: {
    opacity: 0.88,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 15,
  },
});
