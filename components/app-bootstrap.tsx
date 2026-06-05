import {
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_600SemiBold,
  Vazirmatn_700Bold,
} from '@expo-google-fonts/vazirmatn';
import { useFonts } from 'expo-font';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, I18nManager, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppLanguage } from '@/contexts/app-language-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { Brand, FormColors } from '@/lib/theme';
import { ArabicScriptFont } from '@/lib/theme/arabic-script-fonts';

/**
 * Loads Vazirmatn (Pashto/Dari / Arabic script), syncs RTL with the active language, and applies
 * default `Text` / `TextInput` fonts. See `lib/theme/arabic-script-fonts.ts` for rationale.
 * Must render inside `AppLanguageProvider`.
 */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const { language, hydrated } = useAppLanguage();
  const { t } = useAppTranslation();
  const [fontsLoaded] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_600SemiBold,
    Vazirmatn_700Bold,
  });

  const rtl = true;
  const arabicFont = useMemo(() => {
    if (!fontsLoaded) return undefined;
    return ArabicScriptFont.regular;
  }, [fontsLoaded]);

  useEffect(() => {
    if (!hydrated) return;
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
    }
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', language === 'prs' ? 'fa' : 'ps');
    }
  }, [hydrated, rtl, language]);

  useEffect(() => {
    if (!hydrated || !fontsLoaded) return;
    const textStyle = arabicFont ? { fontFamily: arabicFont } : {};
    const RNText = Text as typeof Text & { defaultProps?: { style?: unknown } };
    const RNInput = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };
    RNText.defaultProps = { ...(RNText.defaultProps ?? {}), style: [textStyle, RNText.defaultProps?.style] };
    RNInput.defaultProps = {
      ...(RNInput.defaultProps ?? {}),
      style: [textStyle, RNInput.defaultProps?.style],
    };
  }, [arabicFont, hydrated, fontsLoaded]);

  const ready = hydrated && fontsLoaded;

  const dirStyle = { flex: 1, width: '100%' as const, direction: 'rtl' as const };

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator
          size="large"
          color={Brand.green}
          accessibilityRole="progressbar"
          accessibilityLabel={t('a11yLoadingSession')}
        />
      </View>
    );
  }

  return <View style={dirStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FormColors.background,
  },
});
