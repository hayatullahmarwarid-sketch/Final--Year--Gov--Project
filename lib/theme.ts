/**
 * Sharia Decrees — canonical design tokens (colors, spacing, type, radius, shadows).
 * Import from `@/lib/theme` in UI code; legacy `constants/*` re-export for compatibility.
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export { ArabicScriptFont } from '@/lib/theme/arabic-script-fonts';

/** Base unit: 4. Scale per project design system. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
} as const;

/** Minimum touch target (Apple HIG / Material). */
export const touchTarget = {
  min: 44,
} as const;

/**
 * Primary button tokens — mirrors SaaS primary styling (`#0088FF` family).
 * Use these for consistent default / hover / active / disabled primary controls.
 */
export const primaryBtn = {
  color: '#ffffff',
  bg: '#0088ff',
  border: '#0088ff',
  hoverBg: '#0d88f7',
  hoverBorder: '#0d88f7',
  activeBg: '#007ae6',
  activeBorder: '#0075db',
  disabledBg: '#0088ff',
  disabledBorder: '#0088ff',
  disabledColor: '#ffffff',
  /** CSS-style `rgb()` triple for focus rings / RN shadowColor channels */
  focusShadowRgb: '0,136,255' as const,
} as const;

export const palette = {
  /**
   * Brand blue system (`#0088FF`) + shades/tints in the same hue family.
   * Legacy token names (e.g. accentGold) stay mapped here for call-site stability.
   */
  primary: '#0088FF',
  primaryHover: '#0d88f7',
  primaryActive: '#007ae6',
  primaryActiveBorder: '#0075db',
  primaryShade1: '#007ae6',
  primaryShade2: '#004a7a',
  primaryTint1: '#33a6ff',
  primaryTint2: '#80c7ff',
  /** Soft surfaces (chips, washed rows) */
  primaryWash: '#e8f4ff',
  primaryWashBorder: '#b3daff',
  accentGold: '#0088FF',
  accentGoldMuted: 'rgba(0, 136, 255, 0.55)',
  accentGoldSubtle: 'rgba(0, 136, 255, 0.85)',
  /** Alpha ramps — prefer these over ad-hoc legacy blues */
  primaryAlpha: {
    a08: 'rgba(0, 136, 255, 0.08)',
    a10: 'rgba(0, 136, 255, 0.10)',
    a12: 'rgba(0, 136, 255, 0.12)',
    a14: 'rgba(0, 136, 255, 0.14)',
    a16: 'rgba(0, 136, 255, 0.16)',
    a22: 'rgba(0, 136, 255, 0.22)',
    a30: 'rgba(0, 136, 255, 0.30)',
    a35: 'rgba(0, 136, 255, 0.35)',
    a40: 'rgba(0, 136, 255, 0.40)',
    a95: 'rgba(0, 136, 255, 0.95)',
  },
  neutral50: '#F9FAFB',
  neutral100: '#F3F4F6',
  neutral200: '#E5E7EB',
  neutral300: '#D1D5DB',
  neutral400: '#9CA3AF',
  neutral500: '#6B7280',
  neutral600: '#4B5563',
  neutral700: '#374151',
  neutral800: '#1F2937',
  neutral900: '#111827',
  slate900: '#0F172A',
  error: '#B91C1C',
  errorSoft: '#FEF2F2',
  success: '#059669',
  successBright: '#34d399',
  warning: '#d97706',
  warningSoft: 'rgba(0, 136, 255, 0.12)',
  infoTeal: '#0088FF',
  white: '#FFFFFF',
  black: '#000000',
  overlayScrim: 'rgba(15, 23, 42, 0.45)',
  mintWash: '#D8EDE3',
  rowActiveWash: '#F0FDF4',
} as const;

/** Public-facing brand shorthand (used across app). */
export const Brand = {
  green: palette.primary,
  gold: palette.accentGold,
  goldMuted: palette.accentGoldMuted,
  goldSubtle: palette.accentGoldSubtle,
} as const;

/** Auth / form surfaces — matches prior `FormColors` contract. */
export const FormColors = {
  background: palette.white,
  pageMuted: palette.neutral100,
  inputMutedFill: palette.neutral100,
  border: palette.neutral300,
  label: palette.neutral500,
  placeholder: palette.neutral400,
  title: palette.neutral900,
  subtitle: palette.neutral700,
  disabledButtonBg: palette.neutral200,
  disabledButtonText: palette.neutral400,
  primaryButtonBg: palette.primary,
  primaryButtonText: palette.white,
  /** Filled primary when disabled — same blue family as default (not neutral gray). */
  primaryButtonDisabledBg: primaryBtn.disabledBg,
  primaryButtonDisabledText: primaryBtn.disabledColor,
  link: palette.primary,
  iconMint: palette.mintWash,
  weak: '#DC2626',
  medium: palette.primaryTint1,
  strong: palette.primary,
  segmentEmpty: palette.neutral200,
  validBorder: palette.primary,
  successBright: palette.successBright,
  dividerMuted: palette.neutral200,
  timerTeal: palette.primaryTint1,
  demoHintBg: palette.warningSoft,
  demoHintBorder: palette.primaryTint2,
  fairPassword: palette.primaryShade1,
} as const;

export const semantic = {
  errorText: palette.error,
  errorBg: palette.errorSoft,
  successText: palette.success,
  warningText: palette.warning,
} as const;

/** Contrast helpers for consistent UI rules (blue vs white surfaces). */
export const contrast = {
  onBlueText: palette.white,
  onBlueIcon: palette.white,
  onBlueSubtleText: 'rgba(255,255,255,0.78)',
  onWhiteText: palette.primary,
  onWhiteIcon: palette.primary,
  onWhiteMutedText: palette.primaryShade2,
} as const;

/** Typography presets — sizes stay at or above 12 for body paths (tab labels use caption). */
export const typography = {
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  } satisfies TextStyle,
  captionBold: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  } satisfies TextStyle,
  bodySemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  } satisfies TextStyle,
  /** Secondary body / helper under headlines (14pt). */
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  } satisfies TextStyle,
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  } satisfies TextStyle,
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  } satisfies TextStyle,
  headline: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  } satisfies TextStyle,
  largeTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
  } satisfies TextStyle,
} as const;

export function shadowCard(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
    default: {},
  })!;
}

/** Primary brand elevation — `box-shadow: 0 2px 8px rgba(0,136,255,.25)` */
export function shadowPrimary(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: '#0088FF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    default: {},
  })!;
}

/** Soft diffused lift for dashboard metric tiles (~CSS 0 4px 20px rgba(0,0,0,0.05)). */
export function shadowMetricDashboard(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.055,
      shadowRadius: 22,
    },
    android: { elevation: 4 },
    default: {},
  })!;
}

export function shadowTabBar(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
    },
    android: { elevation: 8 },
    default: {},
  })!;
}

export function shadowHeader(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: {},
  })!;
}

export function shadowDrawer(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: palette.black,
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
    default: {},
  })!;
}

/** Layout constants for auth and narrow columns. */
export const layout = {
  authFormMaxWidth: 432,
  authEdgeCompact: 18,
  authEdgeDefault: 22,
} as const;

/** Fixed component dimensions (icons, avatars) — radii derived where circular. */
export const sizes = {
  avatarLg: 80,
  checkbox: 22,
} as const;

/** Subtle press overlay for Android ripple (primary-tinted). */
export const androidRipple = {
  primary: 'rgba(0, 136, 255, 0.14)',
  neutral: 'rgba(15, 23, 42, 0.08)',
} as const;
