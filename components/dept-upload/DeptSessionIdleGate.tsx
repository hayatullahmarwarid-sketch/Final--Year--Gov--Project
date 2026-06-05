import { type Href, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/contexts/auth-session-context';
import { useDeptUploadSettingsOptional } from '@/contexts/dept-upload-settings-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { rotateStoredRefreshToken } from '@/lib/api/fetch-with-jwt-refresh';
import { bumpActivity, msSinceActivity } from '@/lib/session/activity-tracker';
import { getDeptSessionTimeoutMinutes } from '@/lib/session/dept-session-policy';
import { palette, radius, spacing } from '@/lib/theme';

const TICK_MS = 4000;

export function DeptSessionIdleGate({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuthSession();
  const settingsCtx = useDeptUploadSettingsOptional();
  const { t } = useAppTranslation();
  const timeoutMin = settingsCtx?.settings?.system.sessionTimeoutMinutes ?? getDeptSessionTimeoutMinutes() ?? 30;
  const warnLeadMin = timeoutMin >= 5 ? 2 : 1;

  const [warnOpen, setWarnOpen] = useState(false);
  const [remainSec, setRemainSec] = useState(0);
  const warnedRef = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => {
      const tm = getDeptSessionTimeoutMinutes() ?? timeoutMin;
      const limitMs = tm * 60 * 1000;
      const idleMs = msSinceActivity();
      const warnMs = Math.max(limitMs - warnLeadMin * 60 * 1000, 0);

      if (idleMs >= limitMs) {
        void (async () => {
          await signOut();
          router.replace('/login' as Href);
        })();
        return;
      }

      if (idleMs >= warnMs && !warnedRef.current) {
        warnedRef.current = true;
        setWarnOpen(true);
      }

      if (idleMs < warnMs - 500) {
        warnedRef.current = false;
        setWarnOpen(false);
      }

      setRemainSec(Math.max(0, Math.ceil((limitMs - idleMs) / 1000)));
    }, TICK_MS);

    return () => clearInterval(iv);
  }, [signOut, timeoutMin, warnLeadMin]);

  const onExtend = () => {
    void (async () => {
      await rotateStoredRefreshToken();
      bumpActivity();
      warnedRef.current = false;
      setWarnOpen(false);
    })();
  };

  return (
    <>
      {children}
      <Modal visible={warnOpen} transparent animationType="fade" onRequestClose={onExtend}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>{t('deptSessionIdleTitle')}</Text>
            <Text style={styles.body}>{t('deptSessionIdleBody', { minutes: timeoutMin })}</Text>
            <Text style={styles.timer}>
              {t('deptSessionIdleSeconds', { n: remainSec })}
            </Text>
            <Pressable style={styles.primaryBtn} onPress={onExtend}>
              <Text style={styles.primaryTxt}>{t('deptSessionIdleExtend')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '800', color: palette.black },
  body: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  timer: { fontSize: 13, fontWeight: '700', color: palette.primary },
  primaryBtn: {
    marginTop: spacing.sm,
    backgroundColor: palette.primary,
    paddingVertical: 12,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  primaryTxt: { color: palette.white, fontWeight: '800', fontSize: 15 },
});
