import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/lib/theme';

const MAP: Record<string, { bg: string; border: string; text: string }> = {
  Economy: { bg: palette.primaryWash, border: palette.primaryWashBorder, text: palette.primaryShade2 },
  Family: { bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239' },
  Finance: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  Worship: { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' },
  Trade: { bg: palette.primaryWash, border: palette.primaryWashBorder, text: palette.primaryShade2 },
  Property: { bg: '#FFF7ED', border: '#FDBA74', text: '#9A3412' },
  Criminal: { bg: '#F1F5F9', border: '#CBD5E1', text: '#334155' },
  Civil: { bg: '#F0FDFA', border: '#99F6E4', text: '#115E59' },
  Social: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' },
};

export function CategoryTag({ category }: { category: string }) {
  const key = category.trim();
  const c = MAP[key] ?? { bg: '#F3F4F6', border: '#E5E7EB', text: '#374151' };
  return (
    <View style={[styles.wrap, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.txt, { color: c.text }]} maxFontSizeMultiplier={1.05}>
        {key.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  txt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
});
