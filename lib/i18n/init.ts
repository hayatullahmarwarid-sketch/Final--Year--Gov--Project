import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { AppLanguageId } from '@/constants/languages';

import faDeptDashboard from './locales/overlays/fa-dept-dashboard.json';
import psDeptDashboard from './locales/overlays/ps-dept-dashboard.json';
import enCommon from './locales/en/common.json';
import faCommon from './locales/fa/common.json';
import psCommon from './locales/ps/common.json';
import { composeLocaleBundle } from './locale-bundle';
import { appLanguageToI18n } from './locale-map';

const psMerged = {
  ...composeLocaleBundle(enCommon as Record<string, string>, psCommon as Record<string, string>, '[PS] '),
  ...(psDeptDashboard as Record<string, string>),
};
const faMerged = {
  ...composeLocaleBundle(enCommon as Record<string, string>, faCommon as Record<string, string>, '[FA] '),
  ...(faDeptDashboard as Record<string, string>),
};

const resources = {
  en: { common: enCommon },
  ps: { common: psMerged },
  fa: { common: faMerged },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'ps',
  fallbackLng: ['en', 'ps'],
  defaultNS: 'common',
  ns: ['common'],
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
  react: { useSuspense: false },
});

export function syncI18nLanguage(lang: AppLanguageId): void {
  const code = appLanguageToI18n(lang);
  if (i18n.language !== code) {
    void i18n.changeLanguage(code);
  }
}

export { i18n };
export { appLanguageToI18n } from './locale-map';
export default i18n;
