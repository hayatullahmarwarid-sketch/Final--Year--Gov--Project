import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle, View } from 'react-native';

import type { AppLanguageId } from '@/constants/languages';

/** RLE + PDF: force RTL embedding so wrapped lines keep a RTL paragraph (fixes weak leading chars). */
const RLE = '\u202B';
const PDF = '\u202C';

type Props = {
  text: string;
  language: AppLanguageId;
  textStyle?: StyleProp<TextStyle>;
  maxFontSizeMultiplier?: number;
};

/**
 * Layout wrapper for decree titles on public surfaces: fixed width (fills parent),
 * auto height, multiline wrap, direction and alignment follow UI language (ps/prs → rtl).
 */
export function PublicDecreeTitleCanvas({
  text,
  language,
  textStyle,
  maxFontSizeMultiplier = 1.25,
}: Props) {
  const rtl = language !== 'en';
  const displayText = rtl ? `${RLE}${text}${PDF}` : text;

  return (
    <View style={styles.slotRow}>
      <View style={[styles.slotGrow, { direction: rtl ? 'rtl' : 'ltr' }]}>
        <Text
          style={[styles.titleText, textStyle, rtl ? styles.titleRtl : styles.titleLtr]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {displayText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Row + flex:1 slot gives Text a definite line width (avoids shrink-wrapped multiline RTL).
  slotRow: {
    flexDirection: 'row',
    width: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    flexShrink: 1,
    alignItems: 'stretch',
  },
  slotGrow: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    alignItems: 'stretch',
  },
  titleText: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    flexShrink: 1,
  },
  titleLtr: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  titleRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
