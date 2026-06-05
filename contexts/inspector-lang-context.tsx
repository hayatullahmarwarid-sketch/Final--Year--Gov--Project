import React, { createContext, useContext, useMemo, useState } from 'react';

import type { InspectorLang } from '@/components/inspector/inspector-translations';

type InspectorLangContextValue = {
  lang: InspectorLang;
  setLang: (l: InspectorLang) => void;
  cycleLang: () => void;
};

const InspectorLangContext = createContext<InspectorLangContextValue | null>(null);

export function InspectorLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<InspectorLang>('ps');

  const cycleLang = () => {
    setLang((prev) => (prev === 'ps' ? 'dr' : 'ps'));
  };

  const value = useMemo(
    () => ({ lang, setLang, cycleLang }),
    [lang],
  );

  return <InspectorLangContext.Provider value={value}>{children}</InspectorLangContext.Provider>;
}

export function useInspectorLang() {
  const ctx = useContext(InspectorLangContext);
  if (!ctx) {
    throw new Error('useInspectorLang must be used within InspectorLangProvider');
  }
  return ctx;
}
