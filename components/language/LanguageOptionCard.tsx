import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { palette } from '@/lib/theme';

export type LanguageOption = {
  id: string;
  regionCode: string;
  nativeName: string;
  englishName: string;
};

type LanguageOptionCardProps = {
  option: LanguageOption;
  selected: boolean;
  onSelect: () => void;
};

/** Layer: `LanguageCard` — selectable row with region code, bilingual label, radio. */
export function LanguageOptionCard({ option, selected, onSelect }: LanguageOptionCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        void Haptics.selectionAsync();
        onSelect();
      }}
      style={({ pressed }) => [
        styles.card,
        selected ? styles.cardSelected : styles.cardUnselected,
        pressed && styles.cardPressed,
      ]}>
      <Text style={[styles.regionCode, styles.textPrimary]} maxFontSizeMultiplier={1.35}>
        {option.regionCode}
      </Text>
      <View style={styles.labels}>
        <Text style={[styles.nativeName, styles.textPrimary]} maxFontSizeMultiplier={1.35}>
          {option.nativeName}
        </Text>
      </View>
      <View
        style={[
          styles.radioOuter,
          selected ? styles.radioOuterSelected : styles.radioOuterOutline,
        ]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 72,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    marginBottom: 14,
  },
  cardSelected: {
    backgroundColor: palette.white,
    borderWidth: 2,
    borderColor: Brand.green,
    ...Platform.select({
      ios: {
        shadowColor: Brand.green,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  cardUnselected: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.primaryWashBorder,
  },
  cardPressed: {
    opacity: 0.92,
  },
  regionCode: {
    width: 40,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  labels: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  nativeName: {
    fontSize: 18,
    fontWeight: '700',
  },
  englishName: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  textPrimary: { color: Brand.green },
  textPrimaryMuted: { color: palette.primaryShade2 },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderWidth: 2,
    borderColor: Brand.green,
  },
  radioOuterOutline: {
    borderWidth: 2,
    borderColor: palette.neutral300,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Brand.green,
  },
});
