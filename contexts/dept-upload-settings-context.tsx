import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getDeptUploadSettings, type DeptUploadSettingsDto } from '@/lib/api/dept-upload-settings';
import { bumpActivity } from '@/lib/session/activity-tracker';
import { setDeptSessionTimeoutMinutes } from '@/lib/session/dept-session-policy';

type DeptUploadSettingsContextValue = {
  settings: DeptUploadSettingsDto | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const DeptUploadSettingsContext = createContext<DeptUploadSettingsContextValue | null>(null);

export function DeptUploadSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DeptUploadSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await getDeptUploadSettings();
    if (r.ok) {
      setSettings(r.data);
      setDeptSessionTimeoutMinutes(r.data.system.sessionTimeoutMinutes);
      bumpActivity();
    } else {
      setError(r.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      error,
      refresh,
    }),
    [settings, loading, error, refresh],
  );

  return <DeptUploadSettingsContext.Provider value={value}>{children}</DeptUploadSettingsContext.Provider>;
}

export function useDeptUploadSettings(): DeptUploadSettingsContextValue {
  const ctx = useContext(DeptUploadSettingsContext);
  if (!ctx) {
    throw new Error('useDeptUploadSettings must be used within DeptUploadSettingsProvider');
  }
  return ctx;
}

export function useDeptUploadSettingsOptional(): DeptUploadSettingsContextValue | null {
  return useContext(DeptUploadSettingsContext);
}
