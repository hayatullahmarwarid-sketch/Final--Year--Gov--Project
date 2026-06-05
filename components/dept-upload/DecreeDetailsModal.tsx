import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { MostViewedBarRow } from '@/components/dept-upload/DeptUploadMostViewedCard';
import { AppPressable } from '@/components/ui/AppPressable';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { palette } from '@/lib/theme';

const SLATE = '#0F172A';
const MUTED = '#64748B';

type DecreeProps = {
  visible: boolean;
  row: MostViewedBarRow | null;
  onClose: () => void;
};

function truncateTitle(s: string, max = 36): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

export function DecreeDetailsModal({ visible, row, onClose }: DecreeProps) {
  const { t } = useAppTranslation();
  if (!row) return null;

  const viewsStr = row.value.toLocaleString('en-US');
  const sub = truncateTitle(row.fullTitle);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('a11yClose')} />
        <View style={styles.center} pointerEvents="box-none">
          <View style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.title}>{t('decreeDetailsTitle')}</Text>
              <AppPressable onPress={onClose} hitSlop={12} accessibilityLabel={t('a11yClose')}>
                <Ionicons name="close" size={26} color="#94A3B8" />
              </AppPressable>
            </View>

            <View style={styles.summaryBand}>
              <View style={styles.summaryIcon}>
                <Ionicons name="document-text" size={26} color="#166534" />
              </View>
              <View style={styles.summaryText}>
                <Text style={styles.decreNum}>{t('deptDecreeNumberTitle', { number: row.decreeNum })}</Text>
                <Text style={styles.decreSub} numberOfLines={2}>
                  {sub}
                </Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, styles.cardViews]}>
                <Text style={[styles.metricVal, styles.valViews]}>{viewsStr}</Text>
                <Text style={styles.metricLbl}>{t('deptPreviewViewsLabel')}</Text>
              </View>
              <View style={[styles.metricCard, styles.cardCat]}>
                <Text style={[styles.metricVal, styles.valCat]}>{row.category}</Text>
                <Text style={styles.metricLbl}>{t('certCardCategoryLabel')}</Text>
              </View>
              <View style={[styles.metricCard, styles.cardNo]}>
                <Text style={[styles.metricVal, styles.valNo]}>#{row.decreeNum}</Text>
                <Text style={styles.metricLbl}>{t('deptDecreeNoLabel')}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: palette.white,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
    ...DeptUploadDash.shadow,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: SLATE, flex: 1 },
  summaryBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1, minWidth: 0 },
  decreNum: { fontSize: 17, fontWeight: '800', color: SLATE },
  decreSub: { fontSize: 13, fontWeight: '500', color: MUTED, marginTop: 4 },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    minWidth: 0,
  },
  cardViews: { backgroundColor: palette.primaryWash },
  cardCat: { backgroundColor: '#ECFDF5' },
  cardNo: { backgroundColor: '#FFFBEB' },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  valViews: { color: palette.primary },
  valCat: { color: '#059669' },
  valNo: { color: '#D97706' },
  metricLbl: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
});
