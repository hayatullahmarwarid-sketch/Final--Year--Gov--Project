import { palette } from '@/lib/theme';

/** Home / decree list accent surfaces (badges, chips). */
export const HomeColors = {
  /** Zip home feed: `bg-gray-50` */
  pageBg: '#F9FAFB',
  cardTopAccent: palette.primary,
  badgeEconomyBg: palette.primaryAlpha.a22,
  badgeEconomyDot: palette.primaryShade1,
  badgeVerifiedBg: palette.primaryWash,
  badgePdfBg: '#FFEBEE',
  badgePagesBg: palette.primaryAlpha.a16,
  downloadBg: '#F5F0E6',
  downloadIcon: '#6D4C41',
  bookmark: '#9CA3AF',
  /** Filled bookmark — soft highlight behind gold icon. */
  bookmarkActiveBg: palette.primaryAlpha.a14,
  /** Decree card title (deep blue, beside icon). */
  decreeTitle: palette.primaryShade2,
} as const;
