import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, router, useLocalSearchParams } from 'expo-router';
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
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CollapsibleFilters } from '@/components/ui/CollapsibleFilters';
import { Brand } from '@/constants/brand';
import { usePublicUserData } from '@/contexts/public-user-data-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import {
  countExamsByFilter,
  EXAM_FILTER_TABS,
  type ExamFilterTab,
  type ExamListItem,
} from '@/data/exams';
import { listPublicExamsPage, listPublicResultsPage } from '@/lib/api/public-user';
import {
  apiExamSummaryToListItem,
  mergeExamCatalogWithResults,
  resultsRowsToScoreMap,
} from '@/lib/public/exam-cert-adapters';
import { collapsibleFiltersPaletteForPublic, usePublicScreenTheme } from '@/lib/public-screen-theme';

const SUBTITLE = 'rgba(183, 220, 198, 0.95)';
const CATEGORY_PILL_BG = 'rgba(212, 175, 55, 0.28)';
const CATEGORY_PILL_TEXT = '#6B5B2E';
const EXAM_FILTER_KEYS: Record<ExamFilterTab, string> = {
  all: 'examFilterAll',
  available: 'examFilterAvailable',
  upcoming: 'examFilterUpcoming',
  completed: 'examFilterCompleted',
};

function ExamCard({ item }: { item: ExamListItem }) {
  const { t, number } = useAppTranslation();
  const th = usePublicScreenTheme();
  const attempt = usePublicUserData().data.examAttempts[item.id];
  const scoreDisplay = attempt?.scorePct ?? item.scorePct ?? 0;
  const canReview =
    item.status === 'completed' && (Boolean(attempt) || typeof item.scorePct === 'number');
  const statusLabel =
    item.status === 'available'
      ? t('examStatusAvailable')
      : item.status === 'upcoming'
        ? t('examStatusUpcoming')
        : t('examStatusCompleted');
  const statusStyles =
    item.status === 'available'
      ? {
          bg: 'rgba(11, 79, 46, 0.1)',
          text: Brand.green,
          dot: Brand.green,
        }
      : item.status === 'upcoming'
        ? {
            bg: 'rgba(212, 175, 55, 0.2)',
            text: '#B45309',
            dot: Brand.gold,
          }
        : {
            bg: th.examCompletedPillBg,
            text: th.examCompletedPillText,
            dot: th.examCompletedDot,
          };

  const bump = () => {
    void Haptics.selectionAsync();
  };

  return (
    <View style={[styles.card, { backgroundColor: th.cardBg }]}>
      <View style={styles.cardTop}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText} maxFontSizeMultiplier={1.08}>
            {item.category}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyles.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusStyles.dot }]} />
          <Text style={[styles.statusText, { color: statusStyles.text }]} maxFontSizeMultiplier={1.05}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardTitle, { color: th.textPrimary }]} maxFontSizeMultiplier={1.12} numberOfLines={2}>
        {item.title}
      </Text>

      <View style={styles.infoGrid}>
        <View style={[styles.infoCell, { backgroundColor: th.examInfoCellBg }]}>
          <Ionicons name="time-outline" size={18} color={th.textSecondary} />
          <Text style={[styles.infoValue, { color: th.textPrimary }]} maxFontSizeMultiplier={1.1}>
            {number(item.durationMin)} {t('examMinSuffix')}
          </Text>
        </View>
        <View style={[styles.infoCell, { backgroundColor: th.examInfoCellBg }]}>
          <MaterialCommunityIcons name="help-circle-outline" size={18} color={th.textSecondary} />
          <Text style={[styles.infoValue, { color: th.textPrimary }]} maxFontSizeMultiplier={1.1}>
            {number(item.questionCount)}
          </Text>
        </View>
        <View style={[styles.infoCell, { backgroundColor: th.examInfoCellBg }]}>
          <MaterialCommunityIcons name="target" size={18} color={th.textSecondary} />
          <Text style={[styles.infoValue, { color: th.textPrimary }]} maxFontSizeMultiplier={1.1}>
            {number(item.passMarkPct)}%
          </Text>
        </View>
      </View>
      <View style={styles.infoLabelsRow}>
        <Text style={[styles.infoLabel, { color: th.textSecondary }]}>{t('examDurationLabel')}</Text>
        <Text style={[styles.infoLabel, { color: th.textSecondary }]}>{t('examQuestionsLabel')}</Text>
        <Text style={[styles.infoLabel, { color: th.textSecondary }]}>{t('examPassMarkLabel')}</Text>
      </View>

      {item.status === 'available' ? (
        <View style={styles.cardFooterRow}>
          <Text style={[styles.footerHint, { color: th.textSecondary }]} maxFontSizeMultiplier={1.05}>
            {t('examFooterHint', {
              questions: number(item.questionCount),
              minutes: number(item.durationMin),
            })}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}
            onPress={() => {
              bump();
              router.push(`/exam/${item.id}/instructions` as Href);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('a11yStartExam')}>
            <Text style={styles.startBtnText}>{t('examStartExam')}</Text>
            <Ionicons
              name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
              size={18}
              color="#fff"
            />
          </Pressable>
        </View>
      ) : null}

      {item.status === 'upcoming' ? (
        <View style={styles.upcomingFooter}>
          <Text style={[styles.upcomingText, { color: th.textSecondary }]} maxFontSizeMultiplier={1.05}>
            {t('examAvailableSoon')}
          </Text>
        </View>
      ) : null}

      {item.status === 'completed' ? (
        <View style={styles.cardFooterRow}>
          <Text style={[styles.scoreText, { color: th.textPrimary }]} maxFontSizeMultiplier={1.05}>
            {t('examYourScore')} {number(scoreDisplay)}%
          </Text>
          <Pressable
            style={styles.reviewPress}
            onPress={() => {
              bump();
              if (!canReview) return;
              router.push(`/exam/${item.id}/results` as Href);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('a11yReviewExam')}
            accessibilityState={{ disabled: !canReview }}>
            <Text style={[styles.reviewLink, !canReview && { color: th.textMuted }]}>{t('examReview')}</Text>
            <Ionicons
              name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
              size={16}
              color={canReview ? Brand.green : th.textMuted}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function ExamsTabScreen() {
  const { width } = useWindowDimensions();
  const { t, number } = useAppTranslation();
  const th = usePublicScreenTheme();
  const filterPal = useMemo(() => collapsibleFiltersPaletteForPublic(th), [th]);
  const horizontal = width < 360 ? 14 : 18;
  const { history } = useLocalSearchParams<{ history?: string }>();
  const historyMode = history === '1';
  const { data, active } = usePublicUserData();
  const [filter, setFilter] = useState<ExamFilterTab>('all');
  const [catalog, setCatalog] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const exams = await listPublicExamsPage({ page: 1, limit: 100 });
      if (cancelled) return;
      if (!exams.ok) {
        setError(exams.message);
        setCatalog([]);
        setLoading(false);
        return;
      }
      const base = exams.items.map((row) => apiExamSummaryToListItem(row as Record<string, unknown>));
      let merged = base;
      if (active) {
        const res = await listPublicResultsPage({ page: 1, limit: 200 });
        if (!cancelled) {
          if (res.ok) {
            const scoreMap = resultsRowsToScoreMap(res.items as Record<string, unknown>[]);
            merged = mergeExamCatalogWithResults(base, scoreMap);
          } else {
            merged = base;
          }
        }
      } else {
        merged = mergeExamCatalogWithResults(
          base,
          new Map(
            Object.values(data.examAttempts).map((a) => [a.examId, { scorePct: a.scorePct }] as const),
          ),
        );
      }
      if (cancelled) return;
      setCatalog(merged);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, nonce, data.examAttempts]);

  const mergedCatalog = catalog;

  const historyItems = useMemo((): ExamListItem[] => {
    return Object.values(data.examAttempts)
      .sort((x, y) => (x.completedAt < y.completedAt ? 1 : -1))
      .flatMap((a) => {
        const base = mergedCatalog.find((e) => e.id === a.examId);
        if (!base) return [];
        const row: ExamListItem = { ...base, status: 'completed', scorePct: a.scorePct };
        return [row];
      });
  }, [data.examAttempts, mergedCatalog]);

  const filtered = useMemo(() => {
    if (historyMode) return historyItems;
    if (filter === 'all') return mergedCatalog;
    return mergedCatalog.filter((e) => e.status === filter);
  }, [historyMode, historyItems, filter, mergedCatalog]);

  const examsFilterActiveCount = filter !== 'all' ? 1 : 0;
  const resetExamTabFilter = useCallback(() => setFilter('all'), []);

  const renderItem = ({ item }: { item: ExamListItem }) => <ExamCard item={item} />;

  return (
    <View style={[styles.shell, { backgroundColor: th.pageBg }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: horizontal }]}>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={1.15}>
            {historyMode ? t('examsTitleHistory') : t('examsTitle')}
          </Text>
          <Text style={styles.headerSubtitle} maxFontSizeMultiplier={1.12}>
            {historyMode ? t('examsSubtitleHistory') : t('examsSubtitleCatalog')}
          </Text>
        </View>
      </SafeAreaView>

      {historyMode ? null : (
        <CollapsibleFilters
          style={[styles.examsFiltersCard, { marginHorizontal: horizontal, backgroundColor: th.filterCardBg }]}
          adminPalette={filterPal}
          summary={t(EXAM_FILTER_KEYS[filter])}
          activeCount={examsFilterActiveCount}
          onReset={resetExamTabFilter}
          resetDisabled={filter === 'all'}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
            accessibilityRole="scrollbar">
            {EXAM_FILTER_TABS.map(({ key, dot }) => {
              const selected = filter === key;
              const n = countExamsByFilter(mergedCatalog, key);
              const label = t(EXAM_FILTER_KEYS[key]);
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
                  accessibilityLabel={t('a11yChipExamsCount', { label, count: number(n) })}>
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
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={[styles.list, { backgroundColor: th.pageBg }]}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: horizontal, paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator
        extraData={`${filter}-${th.isDark}`}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={Brand.green} />
          ) : error ? (
            <View style={{ paddingHorizontal: 24, alignItems: 'center', marginTop: 24 }}>
              <Text style={[styles.empty, { color: th.textSecondary }]} maxFontSizeMultiplier={1.1}>
                {error}
              </Text>
              <Pressable onPress={() => setNonce((n) => n + 1)} style={{ marginTop: 12 }}>
                <Text style={[styles.empty, { color: Brand.green, fontWeight: '700' }]}>{t('a11yRetry')}</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.empty, { color: th.textSecondary }]} maxFontSizeMultiplier={1.1}>
              {historyMode ? t('examsEmptyHistory') : t('examsEmptyCategory')}
            </Text>
          )
        }
      />
    </View>
  );
}

const HEADER_RADIUS = 22;

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
  examsFiltersCard: {
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
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 10,
          }
        : { elevation: 3 }),
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  categoryPill: {
    backgroundColor: CATEGORY_PILL_BG,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: CATEGORY_PILL_TEXT,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
    lineHeight: 24,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  infoCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoLabelsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  infoLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerHint: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.green,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  startBtnPressed: {
    opacity: 0.92,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  upcomingFooter: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  upcomingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  reviewPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.green,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 15,
  },
});
