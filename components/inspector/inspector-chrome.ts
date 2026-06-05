import { Platform } from 'react-native';

/** Brand primary header — white icons/text on this bar */
export const INSPECTOR_BAR_BG = '#0088FF';
export const INSPECTOR_STATUS_ONLINE = '#33a6ff';
export const INSPECTOR_AVATAR_GOLD = '#80c7ff';
/** Inset control on the language chip (slightly deeper than bar) */
export const INSPECTOR_LANG_CHIP_BG = '#007ae6';
export const INSPECTOR_LANG_CHIP_BORDER = 'rgba(255,255,255,0.18)';

export const inspectorHeaderShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  default: { elevation: 6 },
});
