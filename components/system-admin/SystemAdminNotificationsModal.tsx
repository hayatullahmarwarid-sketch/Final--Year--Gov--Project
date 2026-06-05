import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { useSystemAdminRemote } from '@/contexts/system-admin-remote-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import {
  formatRelativeTime,
  systemAdminActions,
  useSystemAdminStore,
} from '@/data/system-admin-store';
import { markAllSystemAdminNotificationsRead, markSystemAdminNotificationRead } from '@/lib/api/system-admin';
import { showToast } from '@/lib/adapters/toast';

type Props = {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
};

export function SystemAdminNotificationsModal({ visible, onClose, isDarkMode }: Props) {
  const { t } = useAppTranslation();
  const data = useSystemAdminStore();
  const { refreshRemote } = useSystemAdminRemote();

  const textTitle = isDarkMode ? '#F3F4F6' : '#111827';
  const textMuted = isDarkMode ? '#9CA3AF' : '#6B7280';
  const cardBg = isDarkMode ? '#111827' : '#fff';
  const border = isDarkMode ? '#374151' : '#F3F4F6';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={[styles.header, { borderBottomColor: border }]}>
          <Text style={[styles.title, { color: textTitle }]}>{t('notificationsTitle')}</Text>
          <Pressable
            onPress={() => {
              void (async () => {
                if (data.notificationsFromRemote) {
                  const r = await markAllSystemAdminNotificationsRead();
                  if (r.ok) {
                    await refreshRemote();
                    showToast(t('notificationsAllMarkedReadToast'), 'success');
                  } else {
                    showToast(r.message, 'error');
                  }
                } else {
                  systemAdminActions.markAllNotificationsRead();
                  showToast(t('notificationsAllMarkedReadToast'), 'success');
                }
              })();
            }}>
            <Text style={styles.markAll}>{t('systemAdminMarkAll')}</Text>
          </Pressable>
        </View>
        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          {data.notificationsFromRemote && data.notifications.length === 0 ? (
            <Text style={[styles.empty, { color: textMuted }]}>{t('systemAdminNoPlatformNotifications')}</Text>
          ) : null}
          {data.notifications.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => {
                void (async () => {
                  if (data.notificationsFromRemote) {
                    const r = await markSystemAdminNotificationRead(n.id);
                    if (r.ok) await refreshRemote();
                  } else {
                    systemAdminActions.markNotificationRead(n.id);
                  }
                  showToast(n.title, 'info');
                })();
              }}
              style={[styles.row, n.read && { opacity: 0.7 }]}>
              <Text style={[styles.rowTitle, { color: textTitle }]}>{n.title}</Text>
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>{n.body}</Text>
              <Text style={{ fontSize: 9, color: textMuted, marginTop: 4 }}>{formatRelativeTime(n.createdAt)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable style={styles.closeFooter} onPress={onClose}>
          <Ionicons name="close" size={18} color={textMuted} />
          <Text style={{ color: textMuted, fontSize: 12, fontWeight: '700' }}>{t('deptCategoryClose')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 15, fontWeight: '800' },
  markAll: { fontSize: 10, fontWeight: '800', color: Brand.green, textTransform: 'uppercase' },
  empty: { padding: 20, textAlign: 'center', fontSize: 13 },
  row: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F9FAFB' },
  rowTitle: { fontSize: 13, fontWeight: '700' },
  closeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
});
