import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, palette } from '@/lib/theme';

import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useAppTranslation } from '@/hooks/use-app-translation';

type Props = {
  onUploadPress: () => void;
};

export function DeptUploadUploadHero({ onUploadPress }: Props) {
  const { t } = useAppTranslation();
  return (
    <View style={styles.wrap}>
      <View style={styles.decorCircle} />
      <Ionicons name="cloud-upload-outline" size={40} color={palette.white} style={styles.icon} />
      <Text style={styles.title}>{t('uploadNewDecreeTitle')}</Text>
      <Text style={styles.sub}>
        {t('deptUploadHeroSub')}
      </Text>
      <Pressable onPress={onUploadPress} style={styles.cta} accessibilityRole="button">
        <Ionicons name="add" size={20} color={Brand.green} />
        <Text style={styles.ctaTxt}>{t('a11yUploadDecree')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: DeptUploadDash.radiusLg,
    backgroundColor: Brand.green,
    padding: 22,
    overflow: 'hidden',
    ...DeptUploadDash.shadow,
  },
  decorCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0,0,0,0.12)',
    end: -48,
    top: -20,
  },
  icon: {
    marginTop: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.white,
    marginTop: 10,
  },
  sub: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.78)',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: '92%',
  },
  cta: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: palette.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
  },
  ctaTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.green,
  },
});
