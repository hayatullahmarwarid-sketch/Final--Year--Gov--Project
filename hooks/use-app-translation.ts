import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { AppLanguageId } from '@/constants/languages';
import { useAppLanguage } from '@/contexts/app-language-context';
import { formatDate, formatDateMedium, formatNumber } from '@/lib/i18n/format';

/**
 * `react-i18next` bound to the app language context plus locale-aware number/date helpers.
 */
export function useAppTranslation() {
  const { language } = useAppLanguage();
  const { t, i18n } = useTranslation('common');

  const fmt = useMemo(
    () => ({
      number: (n: number, options?: Intl.NumberFormatOptions) => formatNumber(n, language, options),
      date: (d: Date | number, options?: Intl.DateTimeFormatOptions) => formatDate(d, language, options),
      dateMedium: (d: Date | number) => formatDateMedium(d, language),
    }),
    [language],
  );

  const tf = useCallback(
    (key: string, options?: Record<string, unknown>) => {
      const lng = language === 'prs' ? 'fa' : language;
      return i18n.getFixedT(lng, 'common')(key, options);
    },
    [i18n, language],
  );

  return { t, tf, language, i18n, ...fmt } as const;
}

export type { AppLanguageId };
