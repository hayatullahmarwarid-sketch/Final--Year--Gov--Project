import { useMemo } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';

import { HomeColors } from '@/constants/home';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CollapsibleFiltersAdminPalette } from '@/components/ui/CollapsibleFilters';
import { palette } from '@/lib/theme';

export type PublicScreenTheme = {
  isDark: boolean;
  pageBg: string;
  columnBg: string;
  cardBg: string;
  cardBorder: string;
  elevatedSurface: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  chipIdleBg: string;
  chipIdleText: string;
  chipIdleCountBg: string;
  chipIdleCountText: string;
  divider: string;
  rowPressBg: string;
  iconMuted: string;
  emptyIconBg: string;
  searchInputBg: string;
  searchInputText: string;
  searchBorder: string;
  clearChipBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabInactive: string;
  skeletonCardBg: string;
  skeletonBar: string;
  skeletonBorder: string;
  signOutBg: string;
  chevronRow: string;
  queryChipBg: string;
  queryChipBorder: string;
  chipsStripBorder: string;
  filterCardBg: string;
  examChipIdleBg: string;
  examChipIdleText: string;
  examChipCountIdleBg: string;
  examChipCountIdleText: string;
  examInfoCellBg: string;
  examCompletedPillBg: string;
  examCompletedPillText: string;
  examCompletedDot: string;
  certDownloadBtnBg: string;
  cardFooterBorder: string;
  decreeDivider: string;
  bookmarkIconIdle: string;
};

export function usePublicScreenTheme(): PublicScreenTheme {
  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';

  return useMemo(() => {
    if (!isDark) {
      return {
        isDark: false,
        pageBg: HomeColors.pageBg,
        columnBg: palette.white,
        cardBg: palette.white,
        cardBorder: 'rgba(0,0,0,0.06)',
        elevatedSurface: palette.white,
        textPrimary: palette.neutral900,
        textSecondary: palette.neutral600,
        textMuted: palette.neutral400,
        chipIdleBg: 'rgba(0,0,0,0.04)',
        chipIdleText: '#374151',
        chipIdleCountBg: 'rgba(0,0,0,0.07)',
        chipIdleCountText: '#6B7280',
        divider: palette.neutral200,
        rowPressBg: '#F9FAFB',
        iconMuted: palette.neutral300,
        emptyIconBg: palette.neutral100,
        searchInputBg: palette.white,
        searchInputText: palette.neutral800,
        searchBorder: 'rgba(0,0,0,0.07)',
        clearChipBg: palette.neutral100,
        tabBarBg: palette.white,
        tabBarBorder: palette.neutral100,
        tabInactive: palette.neutral400,
        skeletonCardBg: palette.white,
        skeletonBar: palette.neutral200,
        skeletonBorder: '#F3F4F6',
        signOutBg: '#FCE8E8',
        chevronRow: palette.neutral300,
        queryChipBg: 'rgba(11,79,46,0.08)',
        queryChipBorder: 'rgba(11,79,46,0.1)',
        chipsStripBorder: '#F3F4F6',
        filterCardBg: HomeColors.pageBg,
        examChipIdleBg: '#E5E7EB',
        examChipIdleText: '#1F2937',
        examChipCountIdleBg: '#D1D5DB',
        examChipCountIdleText: '#6B7280',
        examInfoCellBg: '#F3F4F6',
        examCompletedPillBg: '#E5E7EB',
        examCompletedPillText: '#6B7280',
        examCompletedDot: '#9CA3AF',
        certDownloadBtnBg: palette.neutral100,
        cardFooterBorder: palette.neutral200,
        decreeDivider: 'rgba(49,111,246,0.12)',
        bookmarkIconIdle: HomeColors.bookmark,
      };
    }

    const C = Colors.dark;
    return {
      isDark: true,
      pageBg: C.background,
      columnBg: C.background,
      cardBg: '#1E293B',
      cardBorder: C.border,
      elevatedSurface: '#1E293B',
      textPrimary: C.text,
      textSecondary: C.textSecondary,
      textMuted: '#94A3B8',
      chipIdleBg: 'rgba(255,255,255,0.08)',
      chipIdleText: '#E2E8F0',
      chipIdleCountBg: 'rgba(255,255,255,0.12)',
      chipIdleCountText: '#CBD5E1',
      divider: '#334155',
      rowPressBg: 'rgba(255,255,255,0.06)',
      iconMuted: '#64748B',
      emptyIconBg: '#334155',
      searchInputBg: '#0F172A',
      searchInputText: C.text,
      searchBorder: '#334155',
      clearChipBg: '#334155',
      tabBarBg: '#0F172A',
      tabBarBorder: '#1E293B',
      tabInactive: '#94A3B8',
      skeletonCardBg: '#1E293B',
      skeletonBar: '#334155',
      skeletonBorder: C.border,
      signOutBg: 'rgba(220,38,38,0.18)',
      chevronRow: '#64748B',
      queryChipBg: 'rgba(0,136,255,0.12)',
      queryChipBorder: 'rgba(0,136,255,0.22)',
      chipsStripBorder: '#334155',
      filterCardBg: C.background,
      examChipIdleBg: '#334155',
      examChipIdleText: '#E2E8F0',
      examChipCountIdleBg: '#475569',
      examChipCountIdleText: '#E2E8F0',
      examInfoCellBg: '#0F172A',
      examCompletedPillBg: 'rgba(148,163,184,0.22)',
      examCompletedPillText: '#CBD5E1',
      examCompletedDot: '#94A3B8',
      certDownloadBtnBg: '#334155',
      cardFooterBorder: '#334155',
      decreeDivider: 'rgba(0,136,255,0.22)',
      bookmarkIconIdle: '#94A3B8',
    };
  }, [isDark]);
}

export type PublicDecreeCardTokenStyles = {
  card: ViewStyle;
  title: TextStyle;
  divider: ViewStyle;
  metaText: TextStyle;
  metaBold: TextStyle;
  metaTextMuted: TextStyle;
  metaDot: ViewStyle;
};

export function publicDecreeCardTokens(th: PublicScreenTheme): PublicDecreeCardTokenStyles {
  return {
    card: { backgroundColor: th.cardBg, borderColor: th.cardBorder },
    title: { color: th.textPrimary },
    divider: { backgroundColor: th.decreeDivider },
    metaText: { color: th.textSecondary },
    metaBold: { color: th.textPrimary, fontWeight: '600' },
    metaTextMuted: { color: th.textSecondary },
    metaDot: { backgroundColor: th.divider },
  };
}

export function collapsibleFiltersPaletteForPublic(theme: PublicScreenTheme): CollapsibleFiltersAdminPalette | undefined {
  if (!theme.isDark) return undefined;
  return {
    cardBg: theme.cardBg,
    borderColor: theme.cardBorder,
    titleColor: theme.textPrimary,
    mutedColor: theme.textMuted,
    triggerIdleBg: theme.searchInputBg,
    accentColor: palette.primary,
  };
}
