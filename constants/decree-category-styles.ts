import { palette } from '@/lib/theme';

/**
 * Category visuals — aligned with public decree cards (`HomeDecreeCard` / decrees browse).
 * Historical zip snapshot notes: `docs/repository-layout.md`.
 */
export type DecreeCategoryVisual = {
  accent: string;
  pillBg: string;
  pillText: string;
  dot: string;
  glowShadow: string;
};

export const DECREE_CATEGORY_VISUAL: Record<string, DecreeCategoryVisual> = {
  Economy: {
    accent: '#10b981',
    pillBg: '#D1FAE5',
    pillText: '#065F46',
    dot: '#10b981',
    glowShadow: 'rgba(16,185,129,0.15)',
  },
  Family: {
    accent: '#f43f5e',
    pillBg: '#FFE4E6',
    pillText: '#9F1239',
    dot: '#f43f5e',
    glowShadow: 'rgba(244,63,94,0.15)',
  },
  Finance: {
    accent: '#f59e0b',
    pillBg: '#FEF3C7',
    pillText: '#92400E',
    dot: '#f59e0b',
    glowShadow: 'rgba(245,158,11,0.15)',
  },
  Criminal: {
    accent: '#ef4444',
    pillBg: '#FEE2E2',
    pillText: '#991B1B',
    dot: '#ef4444',
    glowShadow: 'rgba(239,68,68,0.15)',
  },
  Worship: {
    accent: '#a855f7',
    pillBg: '#F3E8FF',
    pillText: '#6B21A8',
    dot: '#a855f7',
    glowShadow: 'rgba(168,85,247,0.15)',
  },
  Trade: {
    accent: palette.primary,
    pillBg: palette.primaryWash,
    pillText: palette.primaryShade2,
    dot: palette.primary,
    glowShadow: 'rgba(0,136,255,0.15)',
  },
  Property: {
    accent: '#f97316',
    pillBg: '#FFEDD5',
    pillText: '#9A3412',
    dot: '#f97316',
    glowShadow: 'rgba(249,115,22,0.15)',
  },
  Civil: {
    accent: '#0ea5e9',
    pillBg: '#E0F2FE',
    pillText: '#075985',
    dot: '#0ea5e9',
    glowShadow: 'rgba(14,165,233,0.15)',
  },
};

export const DEFAULT_DECREE_CATEGORY_VISUAL: DecreeCategoryVisual = {
  accent: '#6b7280',
  pillBg: '#F3F4F6',
  pillText: '#1F2937',
  dot: '#9CA3AF',
  glowShadow: 'rgba(107,114,128,0.15)',
};

export function getDecreeCategoryVisual(categoryName: string): DecreeCategoryVisual {
  return DECREE_CATEGORY_VISUAL[categoryName] ?? DEFAULT_DECREE_CATEGORY_VISUAL;
}

/** Zip `CAT_STYLES` for Decrees tab (keyed by category id). */
export const DECREE_TAB_CATEGORY_VISUAL: Record<
  string,
  { accent: string; light: string; border: string; dot: string; glowShadow: string }
> = {
  economy: {
    accent: '#10b981',
    light: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.25)',
    dot: '#10b981',
    glowShadow: 'rgba(16,185,129,0.15)',
  },
  family: {
    accent: '#f43f5e',
    light: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.25)',
    dot: '#f43f5e',
    glowShadow: 'rgba(244,63,94,0.15)',
  },
  finance: {
    accent: '#f59e0b',
    light: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    dot: '#f59e0b',
    glowShadow: 'rgba(245,158,11,0.15)',
  },
  criminal: {
    accent: '#ef4444',
    light: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    dot: '#ef4444',
    glowShadow: 'rgba(239,68,68,0.15)',
  },
  worship: {
    accent: '#a855f7',
    light: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.25)',
    dot: '#a855f7',
    glowShadow: 'rgba(168,85,247,0.15)',
  },
  trade: {
    accent: palette.primary,
    light: 'rgba(0,136,255,0.08)',
    border: 'rgba(0,136,255,0.25)',
    dot: palette.primary,
    glowShadow: 'rgba(0,136,255,0.15)',
  },
  property: {
    accent: '#f97316',
    light: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.25)',
    dot: '#f97316',
    glowShadow: 'rgba(249,115,22,0.15)',
  },
  civil: {
    accent: '#0ea5e9',
    light: 'rgba(14,165,233,0.08)',
    border: 'rgba(14,165,233,0.25)',
    dot: '#0ea5e9',
    glowShadow: 'rgba(14,165,233,0.15)',
  },
};

export const DEFAULT_TAB_CATEGORY_VISUAL = {
  accent: '#6b7280',
  light: 'rgba(107,114,128,0.08)',
  border: 'rgba(107,114,128,0.25)',
  dot: '#9CA3AF',
  glowShadow: 'rgba(107,114,128,0.15)',
};
