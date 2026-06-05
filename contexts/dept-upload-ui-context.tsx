import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { Brand } from '@/lib/theme';

export type DeptUploadThemeColors = {
  pageBg: string;
  cardBg: string;
  cardBgMuted: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  headerBarBg: string;
  headerBorder: string;
  inputBg: string;
  segmentTrack: string;
  rowDivider: string;
  dropdownBg: string;
  dropdownHeaderBg: string;
  chartSub: string;
};

export function buildDeptUploadThemeColors(dark: boolean): DeptUploadThemeColors {
  if (dark) {
    return {
      /** Align dark canvas with system-admin / Expo dark surfaces (was incorrectly light). */
      pageBg: '#0F172A',
      cardBg: '#1E293B',
      cardBgMuted: '#334155',
      cardBorder: '#334155',
      textPrimary: '#F1F5F9',
      textSecondary: '#CBD5E1',
      textMuted: '#94A3B8',
      headerBarBg: '#0F172A',
      headerBorder: '#334155',
      inputBg: '#0F172A',
      segmentTrack: '#334155',
      rowDivider: '#334155',
      dropdownBg: '#1E293B',
      dropdownHeaderBg: '#0F172A',
      chartSub: '#94A3B8',
    };
  }
  return {
    /** Soft neutral canvas so white cards read clearly (matches `DeptUploadDash.pageBg`). */
    pageBg: DeptUploadDash.pageBg,
    cardBg: '#FFFFFF',
    cardBgMuted: '#F3F4F6',
    cardBorder: '#E5E7EB',
    textPrimary: '#1E293B',
    textSecondary: '#4B5563',
    textMuted: '#6B7280',
    headerBarBg: Brand.green,
    headerBorder: 'rgba(255,255,255,0.18)',
    inputBg: '#F9FAFB',
    segmentTrack: '#E5E7EB',
    rowDivider: '#F3F4F6',
    dropdownBg: '#FFFFFF',
    dropdownHeaderBg: '#F7F8FA',
    chartSub: '#9CA3AF',
  };
}

const LIGHT_FALLBACK = buildDeptUploadThemeColors(false);

type Ctx = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colors: DeptUploadThemeColors;
};

const DeptUploadUiContext = createContext<Ctx | null>(null);

export function DeptUploadUiProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleDarkMode = useCallback(() => setIsDarkMode((v) => !v), []);
  const colors = useMemo(() => buildDeptUploadThemeColors(isDarkMode), [isDarkMode]);

  const value = useMemo(() => ({ isDarkMode, toggleDarkMode, colors }), [isDarkMode, toggleDarkMode, colors]);

  return <DeptUploadUiContext.Provider value={value}>{children}</DeptUploadUiContext.Provider>;
}

export function useDeptUploadUi(): Ctx {
  const v = useContext(DeptUploadUiContext);
  if (!v) throw new Error('useDeptUploadUi must be used within DeptUploadUiProvider');
  return v;
}

export function useDeptUploadUiOptional(): Ctx | null {
  return useContext(DeptUploadUiContext);
}

/** Use in dept-upload UI that may render outside the provider (falls back to light). */
export function useDeptUploadThemeColorsOptional(): DeptUploadThemeColors {
  const v = useContext(DeptUploadUiContext);
  return v?.colors ?? LIGHT_FALLBACK;
}
