import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, I18nManager, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { PublicDecreeTitleCanvas } from '@/components/decree/PublicDecreeTitleCanvas';
import { useAppLanguage } from '@/contexts/app-language-context';
import { usePublicUserData } from '@/contexts/public-user-data-context';
import { Brand } from '@/constants/brand';
import { DEFAULT_TAB_CATEGORY_VISUAL, DECREE_TAB_CATEGORY_VISUAL } from '@/constants/decree-category-styles';
import { FormColors } from '@/constants/form';
import type { DecreeListItem } from '@/data/decree-models';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { publicDecreeCardTokens, usePublicScreenTheme } from '@/lib/public-screen-theme';
import { palette } from '@/lib/theme';

type DecreeCardProps = {
  item: DecreeListItem;
  onView?: () => void;
  onDownload?: () => void | Promise<void>;
};

/** Home feed card — parity with zip `HomeDecreeCard.tsx`. */
export function DecreeCard({ item, onView, onDownload }: DecreeCardProps) {
  const { isBookmarked, toggleBookmark, active: bookmarkActive } = usePublicUserData();
  const { t, number } = useAppTranslation();
  const { language } = useAppLanguage();
  const bookmarked = bookmarkActive && isBookmarked(item.id);
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pressed, setPressed] = useState(false);
  const th = usePublicScreenTheme();
  const tk = useMemo(() => publicDecreeCardTokens(th), [th]);
  const cat = DECREE_TAB_CATEGORY_VISUAL[item.categoryId] ?? DEFAULT_TAB_CATEGORY_VISUAL;
  const idxN = parseInt(String(item.indexLabel).replace(/[^\d]+/g, ''), 10);
  const idx = Number.isFinite(idxN) ? number(idxN) : String(item.indexLabel);
  const active = pressed;

  const handleDownload = async () => {
    if (downloading) return;
    if (!onDownload) return;
    setDownloading(true);
    try {
      await onDownload();
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch {
      /* parent shows error toast */
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t('appDecreeOpenDetailsHint')}
      onPress={() => {
        void Haptics.selectionAsync();
        onView?.();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={() => [styles.card, tk.card, active && styles.cardActive]}>
      <View style={styles.topGradientRow}>
        <View style={[styles.topGradSeg, { backgroundColor: Brand.green }]} />
        <View style={[styles.topGradSeg, { backgroundColor: cat.accent }]} />
        <View style={[styles.topGradSeg, { backgroundColor: Brand.gold }]} />
      </View>

      <View style={styles.ornament} pointerEvents="none">
        <Svg width={56} height={56} viewBox="0 0 56 56">
          <Circle cx="28" cy="28" r="26" stroke={palette.primaryShade2} strokeWidth="1.5" fill="none" />
          <Circle cx="28" cy="28" r="18" stroke={palette.primaryTint2} strokeWidth="1" fill="none" />
          <Circle cx="28" cy="28" r="10" stroke={palette.primaryShade2} strokeWidth="0.8" fill="none" />
          <Line x1="2" y1="28" x2="54" y2="28" stroke={palette.primaryShade2} strokeWidth="0.6" />
          <Line x1="28" y1="2" x2="28" y2="54" stroke={palette.primaryShade2} strokeWidth="0.6" />
          <Line x1="9.4" y1="9.4" x2="46.6" y2="46.6" stroke={palette.primaryTint2} strokeWidth="0.5" />
          <Line x1="46.6" y1="9.4" x2="9.4" y2="46.6" stroke={palette.primaryTint2} strokeWidth="0.5" />
        </Svg>
      </View>

      <View style={styles.cardInner}>
        <View style={styles.rowTop}>
          <View style={styles.badgeRow}>
            <View style={styles.idxBadge}>
              {I18nManager.isRTL ? (
                <>
                  <Text style={styles.idxBadgeText} maxFontSizeMultiplier={1.15}>
                    {idx}
                  </Text>
                  <Text style={styles.hashMark}>#</Text>
                </>
              ) : (
                <>
                  <Text style={styles.hashMark}>#</Text>
                  <Text style={styles.idxBadgeText} maxFontSizeMultiplier={1.15}>
                    {idx}
                  </Text>
                </>
              )}
            </View>
            <View style={[styles.catBadge, { backgroundColor: cat.light, borderColor: cat.border }]}>
              <View style={[styles.catDot, { backgroundColor: cat.dot }]} />
              <Text style={[styles.catBadgeText, { color: cat.accent }]} maxFontSizeMultiplier={1.1}>
                {item.category}
              </Text>
            </View>
            {item.isVerified ? (
              <View style={styles.verBadge}>
                <Ionicons name="shield-checkmark" size={12} color={palette.primaryShade1} />
                <Text style={styles.verBadgeText} maxFontSizeMultiplier={1.1}>
                  {t('decreeVerified')}
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable
            hitSlop={10}
            onPress={(e) => {
              e.stopPropagation();
              toggleBookmark(item.id);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            accessibilityRole="button"
            accessibilityLabel={bookmarked ? t('a11yRemoveBookmark') : t('a11yBookmark')}
            style={({ pressed: p }) => [
              styles.bookmarkHit,
              bookmarked && styles.bookmarkHitActive,
              p && { opacity: 0.9 },
            ]}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={bookmarked ? Brand.gold : th.bookmarkIconIdle}
            />
          </Pressable>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleIconWrap}>
            <Ionicons name="document-text" size={14} color={Brand.green} />
          </View>
          <View style={styles.titleCanvas}>
            <PublicDecreeTitleCanvas
              text={item.title}
              language={language}
              textStyle={[styles.title, tk.title]}
              maxFontSizeMultiplier={1.2}
            />
          </View>
        </View>

        <View style={styles.docRow}>
          <View style={styles.pdfBadge}>
            <View style={styles.pdfIconBox}>
              <MaterialCommunityIcons name="download" size={10} color="#fff" />
            </View>
            <Text style={styles.pdfText}>{t('decreePdfLabel')}</Text>
          </View>
          <View style={styles.pagesBadge}>
            <Text style={styles.pagesText} maxFontSizeMultiplier={1.1}>
              {t('decreePagesCount', { count: number(item.pageCount) })}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, tk.divider]} />

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <View style={styles.metaIconMint}>
              <Ionicons name="eye" size={12} color={Brand.green} />
            </View>
            <Text style={[styles.metaText, tk.metaText]} maxFontSizeMultiplier={1.1}>
              <Text style={[styles.metaBold, tk.metaBold]}>
                {t('decreeViewsInline', { count: number(item.viewCount) })}
              </Text>
            </Text>
          </View>
          <View style={[styles.metaDot, tk.metaDot]} />
          <View style={styles.metaItem}>
            <View style={styles.metaIconGold}>
              <Ionicons name="calendar-outline" size={12} color={palette.primaryShade1} />
            </View>
            <Text style={[styles.metaTextMuted, tk.metaTextMuted]} maxFontSizeMultiplier={1.1}>
              {item.dateLabel}
            </Text>
          </View>
          {item.creationDateLabel && item.creationDateLabel !== '—' ? (
            <>
              <View style={[styles.metaDot, tk.metaDot]} />
              <View style={styles.metaItem}>
                <View style={styles.metaIconGold}>
                  <Ionicons name="calendar-outline" size={12} color={palette.primaryShade1} />
                </View>
                <Text style={[styles.metaTextMuted, tk.metaTextMuted]} maxFontSizeMultiplier={1.1}>
                  {item.creationDateLabel}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed: p }) => [
              styles.downloadBtn,
              downloaded && styles.downloadBtnDone,
              p && { opacity: 0.92 },
            ]}
            disabled={downloading}
            onPress={(e) => {
              e.stopPropagation();
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void handleDownload();
            }}>
            {downloading ? (
              <ActivityIndicator size="small" color={palette.primaryShade2} />
            ) : downloaded ? (
              <>
                <Ionicons name="shield-checkmark" size={14} color={palette.primaryShade1} />
                <Text style={styles.downloadLabelDone} maxFontSizeMultiplier={1.1}>
                  {t('decreeSaved')}
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="download" size={16} color={palette.primaryShade2} />
                <Text style={styles.downloadLabel} maxFontSizeMultiplier={1.1}>
                  {t('decreeDownload')}
                </Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={({ pressed: p }) => [styles.viewBtn, p && styles.viewBtnActive]}
            onPress={(e) => {
              e.stopPropagation();
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onView?.();
            }}>
            <Ionicons name="eye" size={14} color={palette.white} />
            <Text style={styles.viewLabel} maxFontSizeMultiplier={1.1} numberOfLines={1}>
              {t('decreeView')} · {number(item.viewCount)}
            </Text>
            <Ionicons
              name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
              size={14}
              color={palette.white}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: FormColors.background,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          }
        : { elevation: 2 }),
  },
  cardActive: {
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        }
      : { elevation: 4 }),
  },
  topGradientRow: {
    flexDirection: 'row',
    height: 3,
    width: '100%',
  },
  topGradSeg: {
    flex: 1,
  },
  ornament: {
    position: 'absolute',
    top: 12,
    right: 12,
    opacity: 0.04,
  },
  cardInner: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgeRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    paddingRight: 8,
  },
  idxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.green,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hashMark: {
    color: palette.white,
    fontSize: 11,
    fontWeight: '700',
  },
  idxBadgeText: {
    color: palette.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  verBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(49,111,246,0.10)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: palette.primaryShade1,
  },
  bookmarkHit: {
    padding: 6,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  bookmarkHitActive: {
    backgroundColor: 'rgba(49,111,246,0.10)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  titleCanvas: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  titleIconWrap: {
    marginTop: 2,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(49,111,246,0.08)',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  pdfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.18)',
  },
  pdfIconBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  pagesBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(49,111,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(49,111,246,0.22)',
  },
  pagesText: {
    fontSize: 11,
    fontWeight: '500',
    color: palette.primaryShade2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(49,111,246,0.12)',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIconMint: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(49,111,246,0.08)',
  },
  metaIconGold: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(49,111,246,0.10)',
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaBold: {
    color: '#1F2937',
    fontWeight: '600',
  },
  metaTextMuted: {
    fontSize: 12,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    paddingTop: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(49,111,246,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(49,111,246,0.25)',
  },
  downloadBtnDone: {
    backgroundColor: 'rgba(49,111,246,0.10)',
    borderColor: 'rgba(49,111,246,0.25)',
  },
  downloadLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.primaryShade2,
  },
  downloadLabelDone: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.primaryShade1,
  },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Brand.green,
    ...(Platform.OS === 'ios'
        ? {
            shadowColor: Brand.green,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
          }
        : { elevation: 3 }),
  },
  viewBtnActive: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  viewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.white,
    flexGrow: 1,
    flexShrink: 1,
    textAlign: 'center',
  },
});
