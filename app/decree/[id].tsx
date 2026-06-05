import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PublicDecreeTitleCanvas } from '@/components/decree/PublicDecreeTitleCanvas';
import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { HomeColors } from '@/constants/home';
import { usePublicUserData } from '@/contexts/public-user-data-context';
import { useAppLanguage } from '@/contexts/app-language-context';
import type { DecreeDetailModel } from '@/data/decree-detail-content';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useDecreeEngagementView } from '@/hooks/use-decree-engagement-view';
import { getPublicDecreeById } from '@/lib/api/public-user';
import { apiDecreeToDetailModel } from '@/lib/public/decree-adapters';

const TEAL_CHIP = '#0D9488';
const EXPANDED_HEADER_MIN = 248;
const CARD_INTRO_EST = 168;
const ARTICLE_BLOCK_EST = 168;
/** Progress row + back/title/bookmark row (excludes safe area). */
const COMPACT_HEADER_BODY = 78;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function DecreeDetailRoute() {
  const rawId = useLocalSearchParams<{ id: string | string[] }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const { t, number } = useAppTranslation();
  const { language } = useAppLanguage();

  const [detail, setDetail] = useState<DecreeDetailModel | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailNonce, setDetailNonce] = useState(0);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      setLoadingDetail(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      setDetailError(null);
      const res = await getPublicDecreeById(String(id));
      if (cancelled) return;
      if (!res.ok) {
        setDetailError(res.message);
        setDetail(null);
        setLoadingDetail(false);
        return;
      }
      setDetail(
        apiDecreeToDetailModel(res.data as Record<string, unknown>, language, () => t('decreeArticlesNotAvailable')),
      );
      setLoadingDetail(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, detailNonce, language, t]);

  useDecreeEngagementView(id ? String(id) : null, Boolean(detail && !loadingDetail && !detailError));

  const scrollY = useSharedValue(0);
  const contentHeight = useSharedValue(1);
  const layoutHeight = useSharedValue(1);

  const { isBookmarked, toggleBookmark } = usePublicUserData();
  const bookmark = id ? isBookmarked(String(id)) : false;
  const [activeArticle, setActiveArticle] = useState(0);
  const [atEnd, setAtEnd] = useState(false);

  const compactInnerMaxH = COMPACT_HEADER_BODY + 4;
  const padTop = insets.top;
  const compactHeaderStyle = useAnimatedStyle(() => {
    const show = interpolate(scrollY.value, [36, 96], [0, 1], Extrapolation.CLAMP);
    return {
      height: show * (padTop + compactInnerMaxH),
      opacity: show,
    };
  });

  const progressFillStyle = useAnimatedStyle(() => {
    const max = Math.max(1, contentHeight.value - layoutHeight.value);
    const p = Math.min(1, Math.max(0, scrollY.value / max));
    return {
      width: p * width,
      flexDirection: 'row' as const,
      height: 4,
      overflow: 'hidden' as const,
    };
  });

  const onScrollJs = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const ch = e.nativeEvent.contentSize.height;
      const lh = e.nativeEvent.layoutMeasurement.height;
      const n = detail?.articles.length ?? 1;

      const focus = y + lh * 0.22;
      const start = EXPANDED_HEADER_MIN + CARD_INTRO_EST;
      let idx = Math.floor((focus - start) / ARTICLE_BLOCK_EST);
      idx = Math.max(0, Math.min(n - 1, idx));
      setActiveArticle(idx);

      const nearEnd = y + lh >= ch - 48;
      setAtEnd(nearEnd);
    },
    [detail?.articles.length],
  );

  const copyAll = useCallback(async () => {
    if (!detail) return;
    const text = [
      detail.documentTitle,
      '',
      ...detail.articles.map((a) => `${t('decreeArticleLabel', { number: number(a.n) })}\n${a.body}`),
    ].join('\n\n');
    try {
      await Clipboard.setStringAsync(text);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('alertCopiedTitle'), t('alertCopiedMessage'));
    } catch {
      Alert.alert(t('alertCopyFailedTitle'), t('alertCopyFailedMessage'));
    }
  }, [detail, number, t]);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  if (loadingDetail) {
    return (
      <View style={[styles.missing, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <Pressable onPress={() => router.back()} style={styles.missingBack} accessibilityLabel={t('a11yGoBack')}>
          <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={Brand.green} />
        </Pressable>
        <ActivityIndicator color={Brand.green} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (detailError) {
    return (
      <View style={[styles.missing, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <Pressable onPress={() => router.back()} style={styles.missingBack} accessibilityLabel={t('a11yGoBack')}>
          <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={Brand.green} />
        </Pressable>
        <Text style={styles.missingText}>{detailError}</Text>
        <Pressable onPress={() => setDetailNonce((n) => n + 1)} style={{ marginTop: 16 }}>
          <Text style={[styles.missingText, { color: Brand.green, fontWeight: '700' }]}>{t('certRetry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.missing, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <Pressable onPress={() => router.back()} style={styles.missingBack} accessibilityLabel={t('a11yGoBack')}>
          <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={Brand.green} />
        </Pressable>
        <Text style={styles.missingText}>{t('decreeNotFound')}</Text>
      </View>
    );
  }

  const { list, documentTitle, uploadDateChip, creationDateChip, articles } = detail;
  const total = articles.length;
  const displayIndex = activeArticle + 1;
  const articleCountLabel = t('decreeArticlesCount', { count: number(total) });
  const uploadChip = uploadDateChip;
  const creationChip = creationDateChip;
  const idxN = parseInt(String(list.indexLabel).replace(/[^\d]+/g, ''), 10);
  const idx = Number.isFinite(idxN) ? number(idxN) : String(list.indexLabel);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.View style={[styles.compactHeader, compactHeaderStyle]} pointerEvents="box-none">
        <View
          style={[
            styles.compactInner,
            {
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: insets.top,
            },
          ]}>
          <View style={styles.progressTrack}>
            <Animated.View style={progressFillStyle}>
              <View style={styles.progressGreen} />
              <View style={styles.progressGold} />
            </Animated.View>
          </View>
          <View style={[styles.compactRow, { paddingHorizontal: width < 360 ? 12 : 16 }]}>
            <Pressable
              style={styles.roundBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t('a11yGoBack')}>
              <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#fff" />
            </Pressable>
            <View style={styles.compactTextCol}>
              <Text style={styles.compactKicker} numberOfLines={1}>
                {t('decreeCategoryNumberKicker', { category: list.category, number: idx })}
              </Text>
              <View style={styles.compactTitleWrap}>
                <PublicDecreeTitleCanvas
                  text={documentTitle}
                  language={language}
                  textStyle={styles.compactTitle}
                  maxFontSizeMultiplier={1.15}
                />
              </View>
            </View>
            <Pressable
              style={styles.roundBtn}
              onPress={() => {
                if (id) toggleBookmark(String(id));
                void Haptics.selectionAsync();
              }}
              accessibilityRole="button"
              accessibilityLabel={bookmark ? t('a11yRemoveBookmark') : t('a11yBookmark')}>
              <Ionicons
                name={bookmark ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color="#fff"
              />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <AnimatedScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollY.value = e.nativeEvent.contentOffset.y;
          onScrollJs(e);
        }}
        onContentSizeChange={(_, h) => {
          contentHeight.value = h;
        }}
        onLayout={(e: LayoutChangeEvent) => {
          layoutHeight.value = e.nativeEvent.layout.height;
        }}
        contentContainerStyle={styles.scrollContent}>
        <View style={[styles.expandedHeader, { paddingTop: insets.top + 8 }]}>
          <View style={[styles.expandedTop, { paddingHorizontal: width < 360 ? 14 : 18 }]}>
            <Pressable style={styles.roundBtn} onPress={() => router.back()} accessibilityLabel={t('a11yGoBack')}>
              <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#fff" />
            </Pressable>
            <View style={styles.expandedCenter}>
              <Text style={styles.expandedEyebrow}>
                {t('decreeCategoryNumberKicker', { category: list.category, number: idx })}
              </Text>
              <Text style={styles.expandedTitle}>{t('decreeDetailsTitle')}</Text>
            </View>
            <Pressable
              style={styles.roundBtn}
              onPress={() => {
                if (id) toggleBookmark(String(id));
                void Haptics.selectionAsync();
              }}
              accessibilityLabel={bookmark ? t('a11yRemoveBookmark') : t('a11yBookmark')}>
              <Ionicons
                name={bookmark ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color="#fff"
              />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}>
            <View style={styles.chipVerified}>
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={styles.chipLightText}>{t('decreeVerified')}</Text>
            </View>
            <View style={styles.chipDark}>
              <Text style={styles.chipLightText}>
                {I18nManager.isRTL ? `${idx} #` : `# ${idx}`}
              </Text>
            </View>
            <View style={styles.chipDark}>
              <Ionicons name="eye" size={14} color="#fff" />
              <Text style={styles.chipLightText}>{t('decreeViewsInline', { count: number(list.viewCount) })}</Text>
            </View>
            <View style={styles.chipDark}>
              <Ionicons name="calendar" size={14} color="#fff" />
              <Text style={styles.chipLightText}>{t('decreeUploadedAt', { date: uploadChip })}</Text>
            </View>
            <View style={styles.chipDark}>
              <Ionicons name="calendar-outline" size={14} color="#fff" />
              <Text style={styles.chipLightText}>{t('decreeCreatedAt', { date: creationChip })}</Text>
            </View>
          </ScrollView>
        </View>

        <View style={[styles.card, { marginHorizontal: width < 360 ? 14 : 18 }]}>
          <View style={styles.cardTopAccent}>
            <View style={styles.cardAccentGreen} />
            <View style={styles.cardAccentGold} />
          </View>
          <View style={styles.cardPad}>
            <View style={styles.cardHeadRow}>
              <Ionicons name="star" size={18} color={Brand.green} />
              <Text style={styles.cardKicker}>
                {t('decreeHeaderKicker', { category: list.category })}
              </Text>
              <View style={styles.articlePill}>
                <Text style={styles.articlePillText}>{articleCountLabel}</Text>
              </View>
            </View>
            <PublicDecreeTitleCanvas text={documentTitle} language={language} textStyle={styles.docTitle} maxFontSizeMultiplier={1.2} />
            <View style={styles.titleRule} />

            {articles.map((art, i) => {
              const active = i === activeArticle;
              return (
                <View key={art.n} style={[styles.articleRow, I18nManager.isRTL && { flexDirection: 'row-reverse' }]}>
                  <View style={styles.trackCol}>
                    {i > 0 ? <View style={styles.trackSeg} /> : <View style={styles.trackSpacer} />}
                    <View style={[styles.node, active && styles.nodeActive]}>
                      <Text style={[styles.nodeText, active && styles.nodeTextActive]}>{number(art.n)}</Text>
                    </View>
                    {i < total - 1 ? <View style={styles.trackSegGrow} /> : <View style={styles.trackSpacer} />}
                  </View>
                  <View style={styles.articleBody}>
                    <Text style={styles.articleLabel}>{t('decreeArticleLabel', { number: number(art.n) })}</Text>
                    <Text style={styles.articleText}>{art.body}</Text>
                  </View>
                </View>
              );
            })}

            <View style={styles.endBlock}>
              <View style={styles.endRule} />
              <Ionicons name="star" size={20} color={Brand.green} style={styles.endStar} />
              <Text style={styles.endTitle}>{t('decreeEndOfficial')}</Text>
              <Text style={styles.endMeta}>
                {t('decreeEndMeta', { count: number(total), category: list.category, date: uploadChip })}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.examCta, pressed && styles.examCtaPressed]}
                onPress={() => {
                  router.push('/(tabs)/exams' as Href);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('decreeTakeExamLabel', { category: list.category })}>
                <MaterialCommunityIcons name="school" size={22} color={Brand.gold} />
                <Text style={styles.examCtaText}>{t('decreeTakeExamLabel', { category: list.category })}</Text>
                <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
        <View style={{ height: 120 }} />
      </AnimatedScrollView>

      <View style={[styles.floatingBar, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <View style={styles.floatingInner}>
          <View style={styles.pillLeft}>
            <Ionicons name="menu" size={20} color={FormColors.title} />
            <Text style={styles.pillLeftText}>
              {number(displayIndex)} / {number(total)}
            </Text>
          </View>
          <View style={styles.dotsTrackWrap}>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.dotsScrollContent}
              style={styles.dotsScroll}>
              {articles.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeArticle ? styles.dotActive : styles.dotIdle,
                  ]}
                />
              ))}
            </ScrollView>
          </View>
          <View style={styles.barRight}>
            <Pressable
              style={styles.copyBtn}
              onPress={copyAll}
              accessibilityRole="button"
              accessibilityLabel={t('a11yCopyDecreeText')}>
              <Ionicons name="copy-outline" size={22} color={FormColors.title} />
            </Pressable>
            {atEnd ? (
              <Pressable
                style={styles.scrollTopBtn}
                onPress={scrollToTop}
                accessibilityRole="button"
                accessibilityLabel={t('a11yScrollToTop')}>
                <Ionicons name="chevron-up" size={22} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: HomeColors.pageBg,
  },
  missing: {
    flex: 1,
    backgroundColor: FormColors.background,
    padding: 24,
  },
  missingBack: {
    marginBottom: 16,
  },
  missingText: {
    fontSize: 16,
    color: FormColors.label,
  },
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    overflow: 'hidden',
    backgroundColor: Brand.green,
  },
  compactInner: {
    flex: 1,
    backgroundColor: Brand.green,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    width: '100%',
  },
  progressGreen: {
    flex: 1,
    backgroundColor: Brand.green,
  },
  progressGold: {
    width: 32,
    backgroundColor: Brand.gold,
  },
  compactRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 6,
  },
  compactTextCol: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  compactTitleWrap: {
    marginTop: 2,
    width: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
  },
  compactKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  expandedHeader: {
    backgroundColor: Brand.green,
    paddingBottom: 16,
    minHeight: EXPANDED_HEADER_MIN,
  },
  expandedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  expandedCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  expandedEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(183, 220, 198, 0.95)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  expandedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  chipVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TEAL_CHIP,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipLightText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  scrollContent: {
    paddingBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 4,
    ...(
    Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
          }
        : { elevation: 4 }),
  },
  cardTopAccent: {
    height: 3,
    flexDirection: 'row',
  },
  cardAccentGreen: {
    flex: 1,
    backgroundColor: Brand.green,
  },
  cardAccentGold: {
    flex: 1,
    backgroundColor: Brand.gold,
  },
  cardPad: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  cardHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  cardKicker: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: Brand.green,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    minWidth: 120,
  },
  articlePill: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  articlePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEAL_CHIP,
  },
  docTitle: {
    minWidth: 0,
    fontSize: 22,
    fontWeight: '800',
    color: HomeColors.decreeTitle,
    lineHeight: 30,
    marginBottom: 12,
  },
  titleRule: {
    height: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 20,
    borderRadius: 1,
  },
  articleRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 8,
  },
  trackCol: {
    width: 36,
    alignItems: 'center',
  },
  trackSpacer: {
    height: 8,
  },
  trackSeg: {
    width: 2,
    height: 14,
    backgroundColor: '#D1D5DB',
    borderRadius: 1,
  },
  trackSegGrow: {
    width: 2,
    flex: 1,
    minHeight: 36,
    backgroundColor: '#D1D5DB',
    borderRadius: 1,
    marginTop: 4,
  },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: FormColors.iconMint,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeActive: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  nodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Brand.green,
  },
  nodeTextActive: {
    color: '#fff',
  },
  articleBody: {
    flex: 1,
    paddingStart: 12,
    paddingBottom: 20,
  },
  articleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B9B8A',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  articleText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
    fontWeight: '400',
  },
  endBlock: {
    marginTop: 8,
    alignItems: 'center',
    paddingBottom: 8,
  },
  endRule: {
    height: 1,
    backgroundColor: '#E5E7EB',
    width: '100%',
    marginBottom: 20,
  },
  endStar: {
    marginBottom: 10,
    opacity: 0.9,
  },
  endTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: FormColors.label,
    marginBottom: 6,
  },
  endMeta: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  examCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Brand.green,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
  },
  examCtaPressed: {
    opacity: 0.92,
  },
  examCtaText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  floatingBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    zIndex: 30,
  },
  floatingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: 'rgba(243,244,246,0.96)',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
        }
      : Platform.OS === 'android'
        ? { elevation: 8 }
        : ({} as const)),
  },
  pillLeft: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  pillLeftText: {
    fontSize: 14,
    fontWeight: '700',
    color: FormColors.title,
  },
  dotsTrackWrap: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  dotsScroll: {
    flex: 1,
  },
  dotsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotIdle: {
    width: 8,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 28,
    backgroundColor: Brand.green,
  },
  barRight: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollTopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
