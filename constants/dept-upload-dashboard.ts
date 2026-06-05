/** Decree Upload Department — web-style management dashboard tokens. */
import { Brand } from '@/constants/brand';

export const DeptUploadDash = {
  pageBg: '#F0F2F5',
  sidebarBg: '#FFFFFF',
  sidebarActiveBg: Brand.green,
  cardBg: '#FFFFFF',
  cardBorder: '#E5E7EB',
  mutedText: '#6B7280',
  titleText: '#111827',
  headerBarBg: '#FFFFFF',
  fabHelp: '#111827',
  radiusLg: 16,
  radiusMd: 12,
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  chart: {
    green: Brand.green,
    gold: Brand.gold,
    blue: Brand.green,
    red: '#DC2626',
    purple: '#7C3AED',
    track: '#E5E7EB',
  },
} as const;
