import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '@/components/ui/AppPressable';
import type { DeptUploadThemeColors } from '@/contexts/dept-upload-ui-context';
import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { listNotificationsPage, postNotificationMarkRead, postNotificationsMarkAllRead } from '@/lib/api/notifications';
import { palette } from '@/lib/theme';

const GREEN = palette.primary;

export type DeptNotifRow = {
  id: string;
  title: string;
  time: string;
  read: boolean;
  dotColor: string;
  decreeId?: string | null;
};

function timeAgoLabel(iso: string | undefined | null, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const deltaSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (deltaSec < 60) return t('relativeJustNow');
  const mins = Math.floor(deltaSec / 60);
  if (mins < 60) return t('relativeMinutesAgo', { minutes: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('relativeHoursAgo', { hours: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 30) return t('relativeDaysAgo', { days });
  return new Date(iso).toLocaleDateString();
}

function normalizeRow(raw: Record<string, unknown>, t: (key: string, options?: Record<string, unknown>) => string): DeptNotifRow | null {
  const idRaw = raw.id;
  const id = idRaw != null && String(idRaw).trim() ? String(idRaw) : null;
  const title = typeof raw.title === 'string' ? raw.title : null;
  if (!id || !title) return null;
  const readStatus = typeof raw.readStatus === 'string' ? raw.readStatus : null;
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : null;
  const meta = raw.metadata && typeof raw.metadata === 'object' ? (raw.metadata as Record<string, unknown>) : null;
  const decreeId = meta && typeof meta.decreeId === 'string' && meta.decreeId.trim() ? meta.decreeId.trim() : null;
  return {
    id,
    title,
    time: timeAgoLabel(createdAt, t),
    read: readStatus === 'read',
    dotColor: '#38BDF8',
    decreeId,
  };
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onUnreadCountChange?: (n: number) => void;
  /** When omitted, uses theme from DeptUploadUiProvider (or light fallback). */
  surfaceColors?: DeptUploadThemeColors;
};

export function DeptUploadNotificationsPanel({ visible, onClose, onUnreadCountChange, surfaceColors }: Props) {
  const { t } = useAppTranslation();
  const router = useRouter();
  const ctxColors = useDeptUploadThemeColorsOptional();
  const c = surfaceColors ?? ctxColors;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<DeptNotifRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const unread = useMemo(() => rows.filter((r) => !r.read).length, [rows]);

  const reload = useCallback(async () => {
    const r = await listNotificationsPage({ view: 'inbox', limit: 50 });
    if (r.ok) {
      setRows(
        r.items
          .map((raw) => normalizeRow(raw, t))
          .filter((row): row is DeptNotifRow => row !== null),
      );
    } else {
      setRows([]);
    }
    setLoaded(true);
  }, [t]);

  useEffect(() => {
    if (visible) void reload();
  }, [visible, reload]);

  useEffect(() => {
    // Also do one initial load so the header badge reflects real unread count before opening.
    void reload();
  }, [reload]);

  useEffect(() => {
    onUnreadCountChange?.(unread);
  }, [unread, onUnreadCountChange]);

  const openRow = useCallback(
    async (r: DeptNotifRow) => {
      const readRes = await postNotificationMarkRead(r.id);
      if (readRes.ok) {
        setRows((prev) => {
          const next = prev.map((x) => (x.id === r.id ? { ...x, read: true } : x));
          onUnreadCountChange?.(next.filter((x) => !x.read).length);
          return next;
        });
      }
      onClose();
      if (r.decreeId) {
        router.push('/dept-upload/decrees');
      }
    },
    [onClose, onUnreadCountChange, router],
  );

  const markAllRead = useCallback(async () => {
    setRows((prev) => prev.map((r) => ({ ...r, read: true })));
    const r = await postNotificationsMarkAllRead();
    if (r.ok) {
      onUnreadCountChange?.(0);
    } else {
      // Roll back optimistic update on failure.
      void reload();
    }
  }, [reload, onUnreadCountChange]);

  const panelW = Math.min(380, width - 24);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('a11yClose')} />
        <View
          style={[
            styles.panel,
            {
              width: panelW,
              top: insets.top + 56,
              right: 12,
              backgroundColor: c.dropdownBg,
              borderColor: c.cardBorder,
            },
          ]}>
        <View style={[styles.panelHead, { borderBottomColor: c.rowDivider }]}>
          <Text style={[styles.panelTitle, { color: c.textPrimary }]}>{t('notificationsTitle')}</Text>
          <AppPressable onPress={markAllRead} style={styles.markAll} accessibilityRole="button">
            <Ionicons name="checkmark-done" size={18} color={GREEN} />
            <Text style={styles.markAllTxt}>{t('notificationsMarkAllRead')}</Text>
          </AppPressable>
        </View>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator>
          {rows.length === 0 ? (
            <Text style={[styles.emptyState, { color: c.textMuted }]}>
              {loaded ? t('systemAdminNoPlatformNotifications') : t('homeLoadingDecrees')}
            </Text>
          ) : (
            rows.map((r) => (
              <AppPressable
                key={r.id}
                onPress={() => void openRow(r)}
                accessibilityRole="button"
                style={[styles.row, { borderBottomColor: c.rowDivider }]}>
                <View style={[styles.leftDot, { backgroundColor: r.dotColor }]} />
                <View style={styles.rowBody}>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: c.textPrimary },
                      r.read && { color: c.textMuted, fontWeight: '500' },
                    ]}>
                    {r.title}
                  </Text>
                  <Text style={[styles.rowTime, { color: c.chartSub }]}>{r.time}</Text>
                </View>
                {!r.read ? <View style={styles.unreadDot} /> : <View style={styles.unreadSpacer} />}
              </AppPressable>
            ))
          )}
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  panel: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: '72%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelTitle: { fontSize: 17, fontWeight: '800' },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  markAllTxt: { fontSize: 13, fontWeight: '700', color: GREEN },
  list: { maxHeight: 420 },
  listContent: { paddingBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowTime: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0088FF', marginTop: 6 },
  unreadSpacer: { width: 8, height: 8, marginTop: 6 },
  emptyState: { fontSize: 13, textAlign: 'center', paddingVertical: 28 },
});

