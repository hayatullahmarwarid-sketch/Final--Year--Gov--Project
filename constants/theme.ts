/**
 * Expo / React Navigation color roles + platform font descriptors.
 * Brand tints align with `@/lib/theme` (primary green, readable neutrals).
 */
import { Platform } from 'react-native';

import { palette } from '@/lib/theme';

export const Colors = {
  light: {
    text: palette.neutral900,
    background: palette.white,
    textSecondary: palette.neutral600,
    tint: palette.primary,
    icon: palette.neutral500,
    tabIconDefault: palette.neutral400,
    tabIconSelected: palette.primary,
    border: palette.neutral200,
    error: palette.error,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    textSecondary: '#9BA1A6',
    tint: palette.primary,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: palette.primary,
    border: '#272B2E',
    error: '#F87171',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});
