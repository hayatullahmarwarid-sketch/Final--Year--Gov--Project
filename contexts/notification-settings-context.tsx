import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuthSession } from '@/contexts/auth-session-context';
import { notificationSettingsStorageKey } from '@/lib/user-scoped-storage-keys';

const LEGACY_STORAGE_KEY = '@sharia_notification_settings_v1';

export type NotificationSettings = {
  pushEnabled: boolean;
  decreeAlerts: boolean;
  examReminders: boolean;
  certificateAlerts: boolean;
  inspectionUpdates: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  decreeAlerts: true,
  examReminders: true,
  certificateAlerts: true,
  inspectionUpdates: true,
};

type NotificationSettingsContextValue = {
  settings: NotificationSettings;
  hydrated: boolean;
  setSettings: (patch: Partial<NotificationSettings>) => void;
};

const NotificationSettingsContext = createContext<NotificationSettingsContextValue | null>(null);

function mergeSettings(raw: unknown): NotificationSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_NOTIFICATION_SETTINGS };
  const o = raw as Record<string, unknown>;
  return {
    pushEnabled: typeof o.pushEnabled === 'boolean' ? o.pushEnabled : DEFAULT_NOTIFICATION_SETTINGS.pushEnabled,
    decreeAlerts: typeof o.decreeAlerts === 'boolean' ? o.decreeAlerts : DEFAULT_NOTIFICATION_SETTINGS.decreeAlerts,
    examReminders:
      typeof o.examReminders === 'boolean' ? o.examReminders : DEFAULT_NOTIFICATION_SETTINGS.examReminders,
    certificateAlerts:
      typeof o.certificateAlerts === 'boolean'
        ? o.certificateAlerts
        : DEFAULT_NOTIFICATION_SETTINGS.certificateAlerts,
    inspectionUpdates:
      typeof o.inspectionUpdates === 'boolean'
        ? o.inspectionUpdates
        : DEFAULT_NOTIFICATION_SETTINGS.inspectionUpdates,
  };
}

export function NotificationSettingsProvider({ children }: { children: React.ReactNode }) {
  const { hydrated: authHydrated, accountKey } = useAuthSession();
  const [settings, setSettingsState] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!authHydrated) return;
    if (!accountKey) {
      setSettingsState(DEFAULT_NOTIFICATION_SETTINGS);
      setHydrated(true);
      return;
    }
    setHydrated(false);
    (async () => {
      try {
        const scopedKey = notificationSettingsStorageKey(accountKey);
        let raw = await AsyncStorage.getItem(scopedKey);
        if (!raw) {
          const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
          if (legacy) {
            raw = legacy;
            await AsyncStorage.setItem(scopedKey, legacy);
            await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
          }
        }
        if (cancelled) return;
        if (raw) {
          const parsed = mergeSettings(JSON.parse(raw));
          setSettingsState(parsed);
        } else {
          setSettingsState({ ...DEFAULT_NOTIFICATION_SETTINGS });
        }
      } catch {
        if (!cancelled) setSettingsState({ ...DEFAULT_NOTIFICATION_SETTINGS });
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHydrated, accountKey]);

  const persist = useCallback(
    async (next: NotificationSettings) => {
      if (!accountKey) return;
      try {
        await AsyncStorage.setItem(notificationSettingsStorageKey(accountKey), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [accountKey],
  );

  const setSettings = useCallback(
    (patch: Partial<NotificationSettings>) => {
      setSettingsState((prev) => {
        const next = { ...prev, ...patch };
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const value = useMemo(
    () => ({ settings, hydrated: hydrated && authHydrated, setSettings }),
    [settings, hydrated, authHydrated, setSettings],
  );

  return (
    <NotificationSettingsContext.Provider value={value}>{children}</NotificationSettingsContext.Provider>
  );
}

export function useNotificationSettings() {
  const ctx = useContext(NotificationSettingsContext);
  if (!ctx) {
    throw new Error('useNotificationSettings must be used within NotificationSettingsProvider');
  }
  return ctx;
}
