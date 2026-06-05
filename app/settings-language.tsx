import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { I18nManager, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { APP_LANGUAGES, type AppLanguageId } from '@/constants/languages';
import { Colors } from '@/constants/theme';
import { FormColors } from '@/constants/form';
import { HomeColors } from '@/constants/home';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRedirectNonPublicFromPublicRoutes } from '@/hooks/use-redirect-non-public-from-public-routes';
import { palette } from '@/lib/theme';

/**
 * Profile settings: app language (Pashto, Dari, English). Layout aligns with `edit-profile` (light shell + green accents).
 */
export default function SettingsLanguageScreen() {
  useRedirectNonPublicFromPublicRoutes();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontal = width < 360 ? 14 : 18;
  const { language, hydrated, setLanguage } = useAppLanguage();
  const { t } = useAppTranslation();
  const [selectedId, setSelectedId] = useState<AppLanguageId>(language);

  useEffect(() => {
    if (hydrated) setSelectedId(language);
  }, [hydrated, language]);

  const goBack = () => router.back();

  const onSelect = (id: AppLanguageId) => {
    if (id === language) {
      setSelectedId(id);
      return;
    }
    setSelectedId(id);
    setLanguage(id);
    void Haptics.selectionAsync();
  };

  const pageBg = colorScheme === 'dark' ? theme.background : HomeColors.pageBg;
  const headerTint = colorScheme === 'dark' ? theme.text : HomeColors.decreeTitle;
  const cardBg = colorScheme === 'dark' ? '#1E293B' : palette.white;
  const cardBorder = colorScheme === 'dark' ? '#334155' : 'transparent';
  const introColor = colorScheme === 'dark' ? theme.textSecondary : FormColors.subtitle;
  const hintColor = colorScheme === 'dark' ? theme.text : FormColors.label;
  const sectionMuted = colorScheme === 'dark' ? palette.neutral400 : '#9CA3AF';
  const titleColor = colorScheme === 'dark' ? theme.text : FormColors.title;
  const subLabelColor = colorScheme === 'dark' ? theme.textSecondary : FormColors.label;
  const rowDivider = colorScheme === 'dark' ? '#334155' : FormColors.dividerMuted;
  const rowHoverLight = '#F9FAFB';
  const rowHoverDark = '#334155';
  const flagIdleBg = colorScheme === 'dark' ? '#0F172A' : FormColors.iconMint;
  const flagIdleBorder = colorScheme === 'dark' ? '#475569' : FormColors.border;

  return (
    <View style={[styles.root, { backgroundColor: pageBg }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, paddingHorizontal: horizontal, backgroundColor: pageBg },
        ]}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={styles.headerIconBtn}
          accessibilityRole="button"
          accessibilityLabel={t('a11yGoBack')}>
          <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={headerTint} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: headerTint }]} maxFontSizeMultiplier={1.15}>
          {t('settingsLanguageTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontal, paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: introColor }]} maxFontSizeMultiplier={1.15}>
          {t('settingsLanguageIntro')}
        </Text>
        <Text style={[styles.introPs, { color: hintColor }]} maxFontSizeMultiplier={1.2}>
          {t('settingsLanguageHintPs')}
        </Text>

        <Text style={[styles.sectionLabel, { color: sectionMuted }]}>{t('settingsLanguageSection')}</Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              borderWidth: colorScheme === 'dark' ? StyleSheet.hairlineWidth : 0,
              borderColor: cardBorder,
            },
          ]}>
          {APP_LANGUAGES.map((opt, index) => {
            const selected = selectedId === opt.id;
            const isLast = index === APP_LANGUAGES.length - 1;
            return (
              <Pressable
                key={opt.id}
                onPress={() => onSelect(opt.id)}
                style={({ pressed }) => [
                  styles.row,
                  !isLast && [styles.rowBorder, { borderBottomColor: rowDivider }],
                  selected && (colorScheme === 'dark' ? styles.rowSelectedDark : styles.rowSelectedLight),
                  pressed && {
                    backgroundColor: colorScheme === 'dark' ? rowHoverDark : rowHoverLight,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}>
                <View
                  style={[
                    styles.flagBadge,
                    { backgroundColor: flagIdleBg, borderColor: flagIdleBorder },
                    selected && styles.flagBadgeOn,
                  ]}>
                  <Text style={[styles.flagText, selected && styles.flagTextOn]} maxFontSizeMultiplier={1.2}>
                    {opt.regionCode}
                  </Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.nativeName, { color: titleColor }]} maxFontSizeMultiplier={1.25}>
                    {opt.nativeName}
                  </Text>
                </View>
                <View style={[styles.radioOuter, selected && styles.radioOuterOn]}>
                  {selected ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
  },
  introPs: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowSelectedLight: {
    backgroundColor: palette.rowActiveWash,
  },
  rowSelectedDark: {
    backgroundColor: 'rgba(0, 136, 255, 0.14)',
  },
  flagBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  flagBadgeOn: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  flagText: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.green,
  },
  flagTextOn: {
    color: '#fff',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  nativeName: {
    fontSize: 17,
    fontWeight: '700',
  },
  englishName: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: FormColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterOn: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
});
