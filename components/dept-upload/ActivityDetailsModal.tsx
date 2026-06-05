import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppPressable } from '@/components/ui/AppPressable';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';

export type ActivityDetailsPayload = {
  verb: string;
  decreeTitle: string;
  performedBy: string;
  timeLabel: string;
  details: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBoxBg: string;
  iconColor: string;
};

type Props = {
  visible: boolean;
  activity: ActivityDetailsPayload | null;
  onClose: () => void;
};

export function ActivityDetailsModal({ visible, activity, onClose }: Props) {
  const c = useDeptUploadThemeColorsOptional();
  const { t } = useAppTranslation();
  if (!activity) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('a11yClose')} />
        <View style={styles.center} pointerEvents="box-none">
          <View style={[styles.card, { backgroundColor: c.dropdownBg }]}>
            <View style={styles.head}>
              <Text style={[styles.title, { color: c.textPrimary }]}>{t('deptActivityDetailsTitle')}</Text>
              <AppPressable onPress={onClose} hitSlop={12} accessibilityLabel={t('a11yClose')}>
                <Ionicons name="close" size={24} color={c.textMuted} />
              </AppPressable>
            </View>

            <View style={styles.actionRow}>
              <View style={[styles.iconSq, { backgroundColor: activity.iconBoxBg }]}>
                <Ionicons name={activity.icon} size={24} color={activity.iconColor} />
              </View>
              <View style={styles.actionText}>
                <Text style={[styles.verb, { color: c.textPrimary }]}>{activity.verb}</Text>
                <Text style={[styles.decreLine, { color: c.textMuted }]} numberOfLines={2}>
                  {activity.decreeTitle}
                </Text>
              </View>
            </View>

            <View style={styles.grid2}>
              <View style={[styles.infoBox, { backgroundColor: c.cardBgMuted }]}>
                <Text style={[styles.lbl, { color: c.textMuted }]}>{t('deptActivityPerformedBy')}</Text>
                <Text style={[styles.val, { color: c.textPrimary }]}>{activity.performedBy}</Text>
              </View>
              <View style={[styles.infoBox, { backgroundColor: c.cardBgMuted }]}>
                <Text style={[styles.lbl, { color: c.textMuted }]}>{t('deptActivityTime')}</Text>
                <Text style={[styles.val, { color: c.textPrimary }]}>{activity.timeLabel}</Text>
              </View>
            </View>

            <View style={[styles.detailBox, { backgroundColor: c.cardBgMuted }]}>
              <Text style={[styles.lbl, { color: c.textMuted }]}>{t('deptActivityDetailsLabel')}</Text>
              <Text style={[styles.detailBody, { color: c.textPrimary }]}>{activity.details}</Text>
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
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    ...DeptUploadDash.shadow,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  iconSq: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1, minWidth: 0 },
  verb: {
    fontSize: 16,
    fontWeight: '700',
  },
  decreLine: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '400',
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  infoBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  lbl: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  val: {
    fontSize: 15,
    fontWeight: '700',
  },
  detailBox: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  detailBody: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
  },
});
