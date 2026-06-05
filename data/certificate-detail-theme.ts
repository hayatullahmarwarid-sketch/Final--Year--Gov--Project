import type { CertificateLevel } from '@/data/certificates';
import { palette } from '@/lib/theme';

/** Accent system for certificate detail carousel + PDF (matches list screen levels). */
export const CERT_DETAIL_THEME: Record<
  CertificateLevel,
  {
    accent: string;
    accentMuted: string;
    scoreColor: string;
    pillText: string;
    patternDot: string;
  }
> = {
  advanced: {
    accent: '#F1B434',
    accentMuted: 'rgba(241, 180, 52, 0.2)',
    scoreColor: '#D97706',
    pillText: '#B45309',
    patternDot: 'rgba(241, 180, 52, 0.12)',
  },
  intermediate: {
    accent: '#1B7340',
    accentMuted: 'rgba(27, 115, 64, 0.16)',
    scoreColor: '#1B7340',
    pillText: '#1B7340',
    patternDot: 'rgba(27, 115, 64, 0.1)',
  },
  basic: {
    accent: palette.primary,
    accentMuted: 'rgba(0, 136, 255, 0.22)',
    scoreColor: palette.primary,
    pillText: palette.primary,
    patternDot: palette.primaryAlpha.a14,
  },
};
