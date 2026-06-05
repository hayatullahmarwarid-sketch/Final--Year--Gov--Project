import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppPressable } from '@/components/ui/AppPressable';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { palette } from '@/lib/theme';

export type MonthlyStatsDetail = {
  periodLabel: string;
  totalViews: number;
  views: number;
  uploads: number;
};

type Props = {
  visible: boolean;
  detail: MonthlyStatsDetail | null;
  onClose: () => void;
};

const NAVY = '#0F172A';
const GRAY_MED = '#64748B';
const GRAY_LIGHT = '#94A3B8';
const DIVIDER = '#E5E7EB';
const TOP_CARD_BG = '#F1F5F9';
const VIEWS_CARD_BG = '#FAFAF9';
const UPLOADS_CARD_BG = '#FFFBEB';
const VIEWS_VALUE = palette.primary;
const UPLOADS_VALUE = palette.primaryShade1;

export function MonthlyStatsModal({ visible, detail, onClose }: Props) {
  const { t } = useAppTranslation();
  if (!detail) return null;

  const tv = detail.totalViews.toLocaleString('en-US');
  const v = detail.views.toLocaleString('en-US');
  const u = detail.uploads.toLocaleString('en-US');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('a11yClose')} />
        <View style={styles.center} pointerEvents="box-none">
          <View style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.title}>{t('deptMonthlyStatsTitle')}</Text>
              <AppPressable onPress={onClose} hitSlop={12} accessibilityLabel={t('a11yClose')}>
                <Ionicons name="close" size={24} color={GRAY_LIGHT} />
              </AppPressable>
            </View>
            <View style={styles.divider} />

            <View style={styles.topCard}>
              <Text style={styles.period}>{detail.periodLabel}</Text>
              <Text style={styles.totalVal}>{tv}</Text>
              <Text style={styles.totalLbl}>{t('deptMonthlyStatsTotalViews')}</Text>
            </View>

            <View style={styles.row2}>
              <View style={[styles.smallCard, styles.smallViews]}>
                <Text style={styles.smallValViews}>{v}</Text>
                <Text style={styles.smallLbl}>{t('deptPreviewViewsLabel')}</Text>
              </View>
              <View style={[styles.smallCard, styles.smallUploads]}>
                <Text style={styles.smallValUploads}>{u}</Text>
                <Text style={styles.smallLbl}>{t('deptMonthlyStatsUploads')}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: palette.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    ...DeptUploadDash.shadow,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER,
    marginBottom: 18,
  },
  topCard: {
    backgroundColor: TOP_CARD_BG,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 14,
    alignItems: 'center',
  },
  period: {
    fontSize: 14,
    fontWeight: '400',
    color: GRAY_MED,
    marginBottom: 10,
    textAlign: 'center',
  },
  totalVal: {
    fontSize: 36,
    fontWeight: '800',
    color: NAVY,
    textAlign: 'center',
    marginBottom: 8,
  },
  totalLbl: {
    fontSize: 12,
    fontWeight: '400',
    color: GRAY_LIGHT,
    textAlign: 'center',
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
  },
  smallCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  smallViews: {
    backgroundColor: VIEWS_CARD_BG,
  },
  smallUploads: {
    backgroundColor: UPLOADS_CARD_BG,
  },
  smallValViews: {
    fontSize: 22,
    fontWeight: '800',
    color: VIEWS_VALUE,
    marginBottom: 8,
  },
  smallValUploads: {
    fontSize: 22,
    fontWeight: '800',
    color: UPLOADS_VALUE,
    marginBottom: 8,
  },
  smallLbl: {
    fontSize: 12,
    fontWeight: '400',
    color: GRAY_LIGHT,
  },
});
