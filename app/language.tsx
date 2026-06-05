import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmblemMark } from '@/components/brand/EmblemMark';
import { LanguageOptionCard } from '@/components/language/LanguageOptionCard';
import { Brand } from '@/constants/brand';
import { orderedLanguageOptionsFromPortal, type AppLanguageId, type AppLanguageOption } from '@/constants/languages';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { palette } from '@/lib/theme';

/** Same default locale codes as `portal.supportedLocales` in the API — no network on this screen. */
const LANGUAGE_OPTIONS: AppLanguageOption[] = orderedLanguageOptionsFromPortal(['ps', 'fa']);

/**
 * Layer: `LanguageScreen` — onboarding language selection (matches brand artboard).
 * Layers: Background → Header (Emblem, Title, Subtitle) → CardList → Footer (Continue, Helper).
 */
export default function LanguageScreen() {
  const { width, height } = useWindowDimensions();
  const { language, hydrated, setLanguage } = useAppLanguage();
  const { t } = useAppTranslation();
  const [selectedId, setSelectedId] = useState<AppLanguageId>(language);
  const userPickedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || userPickedRef.current) return;
    const fromDevice = language;
    const pick = LANGUAGE_OPTIONS.some((o) => o.id === fromDevice)
      ? fromDevice
      : LANGUAGE_OPTIONS[0].id;
    setSelectedId(pick);
  }, [hydrated, language]);

  const selectLanguage = (id: AppLanguageId) => {
    userPickedRef.current = true;
    setSelectedId(id);
  };

  const layout = useMemo(() => {
    const w = Math.max(320, width);
    const horizontal =
      w < 360 ? 16 : w >= 768 ? Math.max(32, (w - 560) / 2) : 24;
    const maxContent = Math.min(560, Math.max(0, w - horizontal * 2));
    const emblemSize = w < 360 ? 72 : w > 600 ? 96 : 88;
    const titleSize = w < 360 ? 22 : 24;
    const subtitleSize = w < 360 ? 15 : 16;
    return { horizontal, maxContent, emblemSize, titleSize, subtitleSize };
  }, [width]);

  const onContinue = () => {
    if (LANGUAGE_OPTIONS.length === 0) return;
    setLanguage(selectedId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/login');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { minHeight: height - 48 },
          ]}>
          <View
            style={[
              styles.column,
              {
                paddingHorizontal: layout.horizontal,
                maxWidth: layout.maxContent + layout.horizontal * 2,
                alignSelf: 'center',
                width: '100%',
              },
            ]}>
            <View style={styles.header}>
              <EmblemMark size={layout.emblemSize} />
              <Text
                style={[styles.title, { fontSize: layout.titleSize }]}
                maxFontSizeMultiplier={1.3}>
                {t('onboardingTitle')}
              </Text>
              <Text
                style={[styles.subtitle, { fontSize: layout.subtitleSize }]}
                maxFontSizeMultiplier={1.35}>
                {t('onboardingSubtitle')}
              </Text>
            </View>

            <View style={[styles.cardStack, { maxWidth: layout.maxContent, width: '100%' }]}>
              {LANGUAGE_OPTIONS.map((option) => (
                <LanguageOptionCard
                  key={option.id}
                  option={option}
                  selected={selectedId === option.id}
                  onSelect={() => selectLanguage(option.id)}
                />
              ))}
            </View>

            <View style={[styles.footer, { maxWidth: layout.maxContent, width: '100%' }]}>
              <Pressable
                accessibilityRole="button"
                disabled={LANGUAGE_OPTIONS.length === 0}
                onPress={onContinue}
                style={({ pressed }) => [
                  styles.continueBtn,
                  LANGUAGE_OPTIONS.length === 0 && styles.continueDisabled,
                  pressed && LANGUAGE_OPTIONS.length > 0 && styles.continuePressed,
                ]}>
                <Text style={styles.continueLabel} maxFontSizeMultiplier={1.25}>
                  {t('onboardingContinue')}
                </Text>
              </Pressable>
              <Text style={styles.helper} maxFontSizeMultiplier={1.2}>
                {t('onboardingHelper')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.green,
  },
  safe: {
    flex: 1,
    width: '100%',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  column: {
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    color: Brand.gold,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 0.2,
  },
  subtitle: {
    color: Brand.goldSubtle,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  cardStack: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
  footer: {
    marginTop: 28,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  continueBtn: {
    width: '100%',
    backgroundColor: palette.white,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  continueDisabled: {
    opacity: 0.45,
  },
  continuePressed: {
    opacity: 0.9,
  },
  continueLabel: {
    color: Brand.green,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  helper: {
    marginTop: 16,
    color: Brand.goldMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
