import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { I18nManager, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeptUploadNotificationsPanel } from '@/components/dept-upload/DeptUploadNotificationsPanel';
import { AppPressable } from '@/components/ui/AppPressable';
import { useDeptUploadSettingsOptional } from '@/contexts/dept-upload-settings-context';
import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { getNotificationsBadgeCount } from '@/lib/api/notifications';
import { Brand, palette, radius, spacing, touchTarget } from '@/lib/theme';

type Props = {
  onOpenDrawer: () => void;
  initials: string;
  onProfileSettings: () => void;
  onHelp: () => void;
  onSignOut: () => void;
};

const LOGOUT_RED = '#E53E3E';

export function DeptUploadShellHeader({
  onOpenDrawer,
  initials,
  onProfileSettings,
  onHelp,
  onSignOut,
}: Props) {
  const c = useDeptUploadThemeColorsOptional();
  const deptSettings = useDeptUploadSettingsOptional();
  const { t, number } = useAppTranslation();
  const headerTitle = deptSettings?.settings?.department?.deptName?.trim() || t('deptShellTitle');
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rtl = I18nManager.isRTL;
  const rowMain = rtl ? 'row-reverse' : 'row';
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [deptUnread, setDeptUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const r = await getNotificationsBadgeCount();
        if (!cancelled && r.ok) setDeptUnread(r.count);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const closeProfile = useCallback(() => setProfileOpen(false), []);

  const wrapSettings = useCallback(() => {
    setProfileOpen(false);
    onProfileSettings();
  }, [onProfileSettings]);

  const wrapHelp = useCallback(() => {
    setProfileOpen(false);
    onHelp();
  }, [onHelp]);

  const wrapSignOut = useCallback(() => {
    setProfileOpen(false);
    onSignOut();
  }, [onSignOut]);

  return (
    <>
      <SafeAreaView
        style={[styles.safe, { backgroundColor: c.headerBarBg, borderBottomColor: c.headerBorder }]}
        edges={['top']}>
        <View style={[styles.bar, { flexDirection: rowMain }]}>
          <AppPressable
            onPress={onOpenDrawer}
            style={styles.menuBtn}
            accessibilityRole="button"
            accessibilityLabel={t('a11yOpenNavMenu')}>
            <Ionicons name="menu" size={24} color={palette.white} />
          </AppPressable>

          <View style={[styles.brandRow, { flexDirection: rowMain }]}>
            <View style={styles.logoSq}>
              <Ionicons name="document-text" size={20} color={palette.white} />
            </View>
            <Text style={[styles.title, { color: palette.white }]} numberOfLines={1}>
              {headerTitle}
            </Text>
          </View>

          <View style={[styles.actions, { flexDirection: rowMain }]}>
            <AppPressable
              onPress={() => setNotifOpen(true)}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={t('a11yNotifications')}>
              <Ionicons name="notifications-outline" size={22} color={palette.white} />
              {deptUnread > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>{deptUnread > 9 ? '9+' : number(deptUnread)}</Text>
                </View>
              ) : null}
            </AppPressable>

            <Pressable
              onPress={() => setProfileOpen(true)}
              style={[styles.profileTrigger, { flexDirection: rowMain }]}
              accessibilityRole="button"
              accessibilityLabel={t('deptAccountMenuA11y')}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={18} color={Brand.green} />
              </View>
              <Ionicons name="chevron-down" size={16} color={palette.white} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={profileOpen}
        transparent
        animationType="fade"
        onRequestClose={closeProfile}
        accessibilityViewIsModal>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeProfile} accessibilityLabel={t('dashboardCloseMenuHint')} />
          <View
            style={[
              styles.dropdownWrap,
              {
                width: Math.min(280, width - 24),
                top: insets.top + 52,
              },
            ]}>
            <View style={[styles.dropdown, { backgroundColor: c.dropdownBg }]}>
            <View style={[styles.dropdownHeader, { backgroundColor: c.dropdownHeaderBg }]}>
              <Text style={[styles.dropdownTitle, { color: c.textPrimary }]}>{t('deptAccountMenuTitle')}</Text>
              <Text style={[styles.dropdownSub, { color: c.textMuted }]}>{t('deptAccountMenuSubtitle')}</Text>
            </View>
            <AppPressable onPress={wrapSettings} style={[styles.menuRow, { flexDirection: rowMain }]}>
              <Ionicons name="settings-outline" size={20} color={c.textSecondary} />
              <Text style={[styles.menuRowTxt, { color: c.textPrimary }]}>{t('deptAccountMenuProfileSettings')}</Text>
            </AppPressable>
            <AppPressable onPress={wrapHelp} style={[styles.menuRow, { flexDirection: rowMain }]}>
              <Ionicons name="help-circle-outline" size={22} color={c.textSecondary} />
              <Text style={[styles.menuRowTxt, { color: c.textPrimary }]}>{t('deptAccountMenuHelp')}</Text>
            </AppPressable>
            <View style={[styles.menuDivider, { backgroundColor: c.cardBorder }]} />
            <AppPressable onPress={wrapSignOut} style={[styles.menuRow, { flexDirection: rowMain }]}>
              <Ionicons name="log-out-outline" size={20} color={LOGOUT_RED} />
              <Text style={styles.logoutTxt}>{t('a11ySignOut')}</Text>
            </AppPressable>
          </View>
          </View>
        </View>
      </Modal>

      <DeptUploadNotificationsPanel
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        onUnreadCountChange={setDeptUnread}
        surfaceColors={c}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    minHeight: 52,
    gap: spacing.sm,
  },
  menuBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  logoSq: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    end: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: LOGOUT_RED,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: { color: palette.white, fontSize: 10, fontWeight: '800' },
  profileTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 20,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  dropdownWrap: {
    position: 'absolute',
    end: 12,
  },
  dropdown: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dropdownSub: {
    marginTop: 2,
    fontSize: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  menuRowTxt: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  logoutTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: LOGOUT_RED,
  },
});
