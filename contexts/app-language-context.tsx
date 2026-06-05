import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type AppLanguageId } from '@/constants/languages';
import { syncI18nLanguage } from '@/lib/i18n/init';

/** Canonical key for the last committed UI language (survives logout; not cleared on sign-out). */
export const USER_LANGUAGE_STORAGE_KEY = 'user-language';

const LEGACY_LANGUAGE_KEY = '@sharia_app_language_v1';

type AppLanguageContextValue = {
  language: AppLanguageId;
  hydrated: boolean;
  /** True once `user-language` exists (user completed onboarding language step or synced from server). */
  hasPersistedUserLanguage: boolean;
  setLanguage: (id: AppLanguageId) => void;
};

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

function readDeviceLanguage(): AppLanguageId {
  try {
    const code = Localization.getLocales()[0]?.languageCode?.toLowerCase() ?? 'ps';
    if (code === 'fa' || code === 'prs') return 'prs';
    return 'ps';
  } catch {
    return 'ps';
  }
}

function isAppLanguageId(v: string): v is AppLanguageId {
  return v === 'ps' || v === 'prs' || v === 'en';
}

/** Reads persisted UI language from disk (for auth/session sync without React timing races). */
export async function readPersistedAppLanguageFromStorage(): Promise<AppLanguageId | null> {
  try {
    const primary = await AsyncStorage.getItem(USER_LANGUAGE_STORAGE_KEY);
    if (primary && isAppLanguageId(primary)) return primary;
    const legacy = await AsyncStorage.getItem(LEGACY_LANGUAGE_KEY);
    if (legacy && isAppLanguageId(legacy)) return legacy;
  } catch {
    /* ignore */
  }
  return null;
}

export function AppLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguageId>(() => readDeviceLanguage());
  const [hydrated, setHydrated] = useState(false);
  const [hasPersistedUserLanguage, setHasPersistedUserLanguage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const primary = await AsyncStorage.getItem(USER_LANGUAGE_STORAGE_KEY);
        if (cancelled) return;
        if (primary && isAppLanguageId(primary)) {
          setLanguageState(primary);
          setHasPersistedUserLanguage(true);
          return;
        }
        const legacy = await AsyncStorage.getItem(LEGACY_LANGUAGE_KEY);
        if (cancelled) return;
        if (legacy && isAppLanguageId(legacy)) {
          setLanguageState(legacy);
          setHasPersistedUserLanguage(true);
          await AsyncStorage.setItem(USER_LANGUAGE_STORAGE_KEY, legacy);
          return;
        }
        setHasPersistedUserLanguage(false);
      } catch {
        /* keep device default */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    syncI18nLanguage(language);
  }, [hydrated, language]);

  const setLanguage = useCallback((id: AppLanguageId) => {
    setLanguageState(id);
    setHasPersistedUserLanguage(true);
    void AsyncStorage.multiSet([
      [USER_LANGUAGE_STORAGE_KEY, id],
      [LEGACY_LANGUAGE_KEY, id],
    ]);
  }, []);

  const value = useMemo(
    () => ({ language, hydrated, hasPersistedUserLanguage, setLanguage }),
    [language, hydrated, hasPersistedUserLanguage, setLanguage],
  );

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function useAppLanguage() {
  const ctx = useContext(AppLanguageContext);
  if (!ctx) {
    return {
      language: 'ps' as AppLanguageId,
      hydrated: true,
      hasPersistedUserLanguage: false,
      setLanguage: (_id: AppLanguageId) => {},
    };
  }
  return ctx;
}
