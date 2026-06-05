import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Value = {
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
  toggleDarkMode: () => void;
};

const SystemAdminUiContext = createContext<Value | null>(null);

export function SystemAdminUiProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleDarkMode = useCallback(() => setIsDarkMode((d) => !d), []);

  const value = useMemo(
    () => ({ isDarkMode, setIsDarkMode, toggleDarkMode }),
    [isDarkMode],
  );

  return <SystemAdminUiContext.Provider value={value}>{children}</SystemAdminUiContext.Provider>;
}

export function useSystemAdminUi(): Value {
  const ctx = useContext(SystemAdminUiContext);
  if (!ctx) {
    throw new Error('useSystemAdminUi must be used within SystemAdminUiProvider');
  }
  return ctx;
}

/** Safe for optional use outside provider (returns light defaults). */
export function useSystemAdminUiOptional(): Value | null {
  return useContext(SystemAdminUiContext);
}
