import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';

export type AppColorScheme = 'light' | 'dark';

const STORAGE_KEY = '@app_user_color_scheme_v1';

type Ctx = {
  colorScheme: AppColorScheme;
  setColorScheme: (next: AppColorScheme) => void;
  toggleColorScheme: () => void;
  /** True after the first AsyncStorage read completes (success or failure). */
  ready: boolean;
};

const AppAppearanceContext = createContext<Ctx | null>(null);

function normalizeStored(raw: string | null): AppColorScheme | null {
  if (raw === 'light' || raw === 'dark') return raw;
  return null;
}

function osDefaultScheme(): AppColorScheme {
  const n = Appearance.getColorScheme() as ColorSchemeName;
  return n === 'dark' ? 'dark' : 'light';
}

export function AppAppearanceProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<AppColorScheme>(osDefaultScheme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        const parsed = normalizeStored(raw);
        if (parsed) setColorSchemeState(parsed);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setColorScheme = useCallback((next: AppColorScheme) => {
    setColorSchemeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleColorScheme = useCallback(() => {
    setColorSchemeState((prev) => {
      const next: AppColorScheme = prev === 'dark' ? 'light' : 'dark';
      void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ colorScheme, setColorScheme, toggleColorScheme, ready }),
    [colorScheme, setColorScheme, toggleColorScheme, ready],
  );

  return <AppAppearanceContext.Provider value={value}>{children}</AppAppearanceContext.Provider>;
}

export function useAppAppearance(): Ctx {
  const v = useContext(AppAppearanceContext);
  if (!v) {
    throw new Error('useAppAppearance must be used within AppAppearanceProvider');
  }
  return v;
}
