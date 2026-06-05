import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppSwitch } from '@/components/ui/AppSwitch';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { showToast } from '@/lib/adapters/toast';
import { getDeptUploadSettings, patchDeptUploadSettings } from '@/lib/api/dept-upload-settings';
import { unregisterDevice } from '@/lib/api/devices';
import { registerDeptDashboardPush } from '@/lib/push/dept-push-registration';
import { FormColors, palette } from '@/lib/theme';

const GREEN = palette.primary;
const ORANGE = palette.primaryShade1;

type NotifState = {
  pushEnabled: boolean;
  pushNewUploads: boolean;
  pushStatusChanges: boolean;
  pushSystemAlerts: boolean;
  deviceTokenId: string | null;
};

const NOTIF_INITIAL: NotifState = {
  pushEnabled: false,
  pushNewUploads: true,
  pushStatusChanges: true,
  pushSystemAlerts: false,
  deviceTokenId: null,
};

const DEVICE_TOKEN_ID_KEY = '@sharia_dept_upload_push_device_token_id_v1';

export function DeptUploadSettingsNotificationsTab() {
  const { t } = useAppTranslation();
  const [form, setForm] = useState<NotifState>(NOTIF_INITIAL);
  const [saved, setSaved] = useState<NotifState>(NOTIF_INITIAL);
  const [loading, setLoading] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  const reset = useCallback(() => setForm(saved), [saved]);
  const save = useCallback(async () => {
    const payload = {
      push: {
        enabled: form.pushEnabled,
        newUploads: form.pushNewUploads,
        statusChanges: form.pushStatusChanges,
        systemAlerts: form.pushSystemAlerts,
      },
    } as const;
    const r = await patchDeptUploadSettings({ notifications: payload });
    if (!r.ok) {
      showToast(r.message, 'error');
      return;
    }
    setSaved(form);
    showToast(t('deptNotifSettingsSaved'), 'success');
  }, [form, t]);

  const set = <K extends keyof NotifState>(key: K, value: NotifState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [server, storedId] = await Promise.all([
          getDeptUploadSettings(),
          AsyncStorage.getItem(DEVICE_TOKEN_ID_KEY),
        ]);
        if (cancelled) return;

        const deviceTokenId = storedId && storedId.trim() ? storedId : null;

        if (server.ok) {
          const n = (server.data.notifications ?? {}) as Record<string, unknown>;
          const push = (n.push ?? {}) as Record<string, unknown>;

          const next: NotifState = {
            pushEnabled: Boolean(deviceTokenId || push.enabled !== false),
            pushNewUploads: Boolean(push.newUploads ?? form.pushNewUploads),
            pushStatusChanges: Boolean(push.statusChanges ?? form.pushStatusChanges),
            pushSystemAlerts: Boolean(push.systemAlerts ?? form.pushSystemAlerts),
            deviceTokenId,
          };
          setForm(next);
          setSaved(next);
        } else {
          setForm((f) => ({ ...f, deviceTokenId }));
          setSaved((s) => ({ ...s, deviceTokenId }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMasterPushEnabled = useCallback(
    async (nextEnabled: boolean) => {
      if (pushBusy) return;
      setPushBusy(true);
      try {
        if (!nextEnabled) {
          const id = form.deviceTokenId;
          if (id) {
            const r = await unregisterDevice(id);
            if (!r.ok) {
              showToast(r.message, 'error');
              return;
            }
          }
          try {
            await AsyncStorage.removeItem(DEVICE_TOKEN_ID_KEY);
          } catch {
            // ignore
          }
          set('deviceTokenId', null);
          set('pushEnabled', false);
          showToast(t('deptNotifPushDisabled'), 'success');
          return;
        }

        const reg = await registerDeptDashboardPush();
        if (!reg.ok) {
          showToast(reg.message, 'error');
          return;
        }
        try {
          await AsyncStorage.setItem(DEVICE_TOKEN_ID_KEY, reg.deviceTokenId);
        } catch {
          // ignore
        }
        set('deviceTokenId', reg.deviceTokenId);
        set('pushEnabled', true);
        showToast(t('deptNotifPushEnabled'), 'success');
      } catch (e) {
        showToast(e instanceof Error ? e.message : t('deptNotifPushSetupFailed'), 'error');
      } finally {
        setPushBusy(false);
      }
    },
    [form.deviceTokenId, pushBusy, t],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="notifications-outline" size={20} color={GREEN} />
          </View>
          <View style={styles.cardHeadTxt}>
            <Text style={styles.cardTitle}>{t('deptNotifPushTitle')}</Text>
            <Text style={styles.cardSub}>{t('deptNotifPushSub')}</Text>
          </View>
        </View>

        <NotifRow
          title={t('deptNotifPushEnableTitle')}
          sub={
            pushBusy
              ? t('deptNotifPushUpdating')
              : Platform.OS === 'web'
                ? t('deptNotifPushWebHint')
                : t('deptNotifPushEnableSub')
          }
          value={form.pushEnabled}
          onValueChange={(v) => void setMasterPushEnabled(v)}
        />
        <NotifRow
          title={t('deptNotifPushNewUploadsTitle')}
          sub={t('deptNotifPushNewUploadsSub')}
          value={form.pushNewUploads}
          onValueChange={(v) => set('pushNewUploads', v)}
        />
        <NotifRow
          title={t('deptNotifPushStatusChangesTitle')}
          sub={t('deptNotifPushStatusChangesSub')}
          value={form.pushStatusChanges}
          onValueChange={(v) => set('pushStatusChanges', v)}
        />
        <NotifRow
          title={t('deptNotifPushSystemAlertsTitle')}
          sub={t('deptNotifPushSystemAlertsSub')}
          value={form.pushSystemAlerts}
          onValueChange={(v) => set('pushSystemAlerts', v)}
        />

        <View style={styles.pushMeta}>
          <Ionicons name="phone-portrait-outline" size={18} color={FormColors.subtitle} />
          <Text style={styles.pushMetaTxt}>
            {form.deviceTokenId ? t('deptNotifDeviceRegistered') : t('deptNotifDeviceNotRegistered')}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        {dirty ? (
          <View style={styles.footerWarn}>
            <Ionicons name="warning" size={18} color={ORANGE} />
            <Text style={styles.footerWarnTxt}>{t('settingsUnsavedChanges')}</Text>
          </View>
        ) : (
          <Text style={styles.footerOk}>{t('settingsBarSaved')}</Text>
        )}
        <View style={styles.footerBtns}>
          <Pressable onPress={reset} style={styles.btnGhost} accessibilityRole="button">
            <Ionicons name="refresh-outline" size={18} color={FormColors.title} />
            <Text style={styles.btnGhostTxt}>{t('settingsBarReset')}</Text>
          </Pressable>
          <Pressable onPress={() => void save()} style={styles.btnPri} accessibilityRole="button" disabled={loading}>
            <Ionicons name="save-outline" size={18} color={palette.white} />
            <Text style={styles.btnPriTxt}>{loading ? t('homeLoadingDecrees') : t('settingsBarSave')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function NotifRow({
  title,
  sub,
  value,
  onValueChange,
}: {
  title: string;
  sub: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.notifRow}>
      <Text style={styles.notifTitle}>{title}</Text>
      <Text style={styles.notifSub}>{sub}</Text>
      <AppSwitch
        value={value}
        onValueChange={onValueChange}
        size="sm"
        onColor={GREEN}
        accessibilityLabel={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  card: {
    backgroundColor: palette.white,
    borderRadius: DeptUploadDash.radiusLg,
    padding: 18,
    borderWidth: 1,
    borderColor: DeptUploadDash.cardBorder,
    ...DeptUploadDash.shadow,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(11, 79, 46, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadTxt: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  cardSub: { fontSize: 12, fontWeight: '500', color: DeptUploadDash.mutedText, marginTop: 4, lineHeight: 16 },
  notifRow: {
    marginBottom: 20,
  },
  notifTitle: { fontSize: 14, fontWeight: '700', color: FormColors.title },
  notifSub: {
    fontSize: 12,
    fontWeight: '500',
    color: DeptUploadDash.mutedText,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
    borderRadius: DeptUploadDash.radiusLg,
    borderWidth: 1,
    borderColor: DeptUploadDash.cardBorder,
    backgroundColor: palette.white,
    ...DeptUploadDash.shadow,
  },
  footerOk: { fontSize: 13, fontWeight: '500', color: FormColors.subtitle, flex: 1, minWidth: 140 },
  footerWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 140,
  },
  footerWarnTxt: { fontSize: 13, fontWeight: '600', color: ORANGE },
  footerBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: palette.white,
  },
  btnGhostTxt: { fontSize: 14, fontWeight: '600', color: FormColors.title },
  btnPri: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: GREEN,
  },
  btnPriTxt: { fontSize: 14, fontWeight: '700', color: palette.white },
  pushMeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    marginTop: 2,
  },
  pushMetaTxt: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: DeptUploadDash.mutedText,
    lineHeight: 18,
  },
});
