import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAppTranslation } from '@/hooks/use-app-translation';

/** Renders a submission signature when present (`data:image/...` or remote URL); otherwise a compact empty state. */
export function InspectorSignaturePreview({ signature }: { signature?: string }) {
  const { t } = useAppTranslation();
  const raw = signature?.trim();
  const s =
    raw && raw.length > 80 && /^[A-Za-z0-9+/]+={0,2}$/.test(raw) && !/^data:image\//i.test(raw)
      ? `data:image/png;base64,${raw}`
      : raw;
  if (!s) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTxt} maxFontSizeMultiplier={1.1}>
          {t('noSignatureOnFile')}
        </Text>
      </View>
    );
  }
  // Guard: some signature pads can send JSON strokes; don't crash Image/Fresco.
  if (/^[\[{]/.test(s)) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTxt} maxFontSizeMultiplier={1.1}>
          {t('noSignatureOnFile')}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.box}>
      <Image source={{ uri: s }} style={styles.img} resizeMode="contain" accessibilityLabel={t('a11yInspectorSignature')} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  emptyTxt: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  box: {
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  img: { width: '100%', height: '100%' },
});
