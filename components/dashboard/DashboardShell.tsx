import { Ionicons } from '@expo/vector-icons';
import { type Href, router, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StatusBar as RNStatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeptUploadDrawer } from '@/components/dept-upload/DeptUploadDrawer';
import { DeptUploadShellHeader } from '@/components/dept-upload/DeptUploadShellHeader';
import { SystemAdminNotificationsModal } from '@/components/system-admin/SystemAdminNotificationsModal';
import { AppPressable } from '@/components/ui/AppPressable';
import type { AuthSessionRole } from '@/contexts/auth-session-context';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useDeptUploadSettingsOptional } from '@/contexts/dept-upload-settings-context';
import { useDeptUploadUiOptional } from '@/contexts/dept-upload-ui-context';
import { useSystemAdminUiOptional } from '@/contexts/system-admin-ui-context';
import {
  defaultTitleForRole,
  drawerBrandingForRole,
  navSectionsForRole,
  organizationLabelForRole,
  systemAdminHeaderTitleForPath,
  type RoleNavItem,
  type RoleNavSection,
} from '@/constants/role-dashboard-nav';
import { useSystemAdminStore } from '@/data/system-admin-store';
import {
  Brand,
  FormColors,
  palette,
  radius,
  semantic,
  shadowCard,
  shadowDrawer,
  shadowHeader,
  spacing,
  touchTarget,
  typography,
} from '@/lib/theme';
import { useAppTranslation } from '@/hooks/use-app-translation';

type Props = {
  role: AuthSessionRole;
  titleOverride?: string;
  /**
   * When true, omits the green top bar (menu + title) and the slide-out drawer.
   * Use for public bottom-tab shell where tabs + Profile sign-out replace this chrome.
   */
  hideTopBar?: boolean;
  children: React.ReactNode;
};

function pathMatchesItem(pathname: string, item: RoleNavItem): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  const h = String(item.href).replace(/\/$/, '') || '/';
  if (p === h) return true;
  // Only allow prefix-match for non-root hrefs. The dashboard index (`/inspector-admin`)
  // must NOT match every child route — we want it "Dashboard" only when pathname equals it.
  const segments = h.split('/').filter(Boolean);
  if (segments.length >= 2 && p.startsWith(h + '/')) return true;
  return false;
}

function roleDisplayNameFromAccountKey(role: AuthSessionRole, accountKey: string | null, email: string | null): string {
  if (accountKey) {
    const prefixMap: Record<AuthSessionRole, RegExp | null> = {
      public: /^pub_/i,
      dept_upload: /^dept_(email_)?/i,
      inspector: /^insp_/i,
      system_admin: /^sys_/i,
      inspector_admin: /^inspadm_/i,
    };
    const re = prefixMap[role];
    if (re) {
      const raw = accountKey.replace(re, '').replace(/_/g, ' ').trim();
      if (raw.length > 0) {
        return raw.charAt(0).toUpperCase() + raw.slice(1);
      }
    }
  }
  if (email) {
    const localPart = email.split('@')[0] ?? email;
    if (localPart.length > 0) return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }
  switch (role) {
    case 'inspector_admin':
      return 'Inspector Admin';
    case 'system_admin':
      return 'System Admin';
    case 'dept_upload':
      return 'Decree Upload';
    case 'inspector':
      return 'Inspector';
    case 'public':
    default:
      return 'Account';
  }
}

function initialsFrom(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'IA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type ChromeProps = {
  role: AuthSessionRole;
  titleOverride?: string;
  children: React.ReactNode;
};

function DashboardShellWithDrawer({ role, titleOverride, children }: ChromeProps) {
  const { t } = useAppTranslation();
  const { width, height } = useWindowDimensions();
  const pathname = usePathname();
  const { signOut, accountKey, sessionEmail } = useAuthSession();
  const deptUi = useDeptUploadUiOptional();
  const [open, setOpen] = useState(false);
  const [saNotifOpen, setSaNotifOpen] = useState(false);
  const saUi = useSystemAdminUiOptional();
  const saStore = useSystemAdminStore();
  const { appVersion, notifications: saNotifications } = saStore;

  const sections: RoleNavSection[] = useMemo(() => navSectionsForRole(role, t), [role, t]);
  const brand = useMemo(() => drawerBrandingForRole(role, t), [role, t]);
  const deptUploadIdentity = useDeptUploadSettingsOptional();
  const orgLabel = useMemo(() => {
    if (role === 'dept_upload' && deptUploadIdentity?.settings?.department?.deptName) {
      const { deptName, deptCode } = deptUploadIdentity.settings.department;
      return deptCode?.trim() ? `${deptName} (${deptCode})` : deptName;
    }
    return organizationLabelForRole(role, t);
  }, [role, t, deptUploadIdentity?.settings?.department?.deptCode, deptUploadIdentity?.settings?.department?.deptName]);
  const defaultTitle = defaultTitleForRole(role);
  const title =
    titleOverride ??
    (role === 'system_admin'
      ? systemAdminHeaderTitleForPath(pathname, t)
      : role === 'dept_upload'
        ? t('deptShellTitle')
        : defaultTitle);
  const isSuperAdminShell = role === 'system_admin';
  const isDeptUploadShell = role === 'dept_upload';
  const saUnread = useMemo(() => saNotifications.filter((n) => !n.read).length, [saNotifications]);

  const isTablet = Math.min(width, height) >= 600;
  const drawerWidth = isDeptUploadShell
    ? Math.min(width - 16, Math.round(width * 0.75))
    : isTablet
      ? Math.min(380, Math.round(width * 0.55))
      : Math.min(330, Math.round(width * 0.86));

  const displayName = useMemo(
    () => roleDisplayNameFromAccountKey(role, accountKey, sessionEmail),
    [role, accountKey, sessionEmail],
  );
  const initials = useMemo(() => initialsFrom(displayName), [displayName]);

  useEffect(() => {
    RNStatusBar.setBarStyle('light-content', true);
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(Brand.green);
    }
    return () => {
      RNStatusBar.setBarStyle('dark-content', true);
      if (Platform.OS === 'android') {
        RNStatusBar.setBackgroundColor('#FFFFFF');
      }
    };
  }, []);

  const onNavigate = useCallback((href: Href) => {
    setOpen(false);
    router.push(href);
  }, []);

  const onSignOut = useCallback(async () => {
    setOpen(false);
    await signOut();
    router.replace('/login');
  }, [signOut]);

  const drawerContent = isDeptUploadShell ? (
    <DeptUploadDrawer drawerWidth={drawerWidth} onClose={() => setOpen(false)} onNavigate={onNavigate} />
  ) : (
    <SafeAreaView style={[styles.drawerInner, { width: drawerWidth }]} edges={['top', 'bottom']}>
      {/* Brand header — circular chip + title / subtitle + close button */}
      <View style={styles.brandHeader}>
        <View style={[styles.brandChip, isSuperAdminShell && styles.brandChipSuperAdmin]}>
          <Ionicons name={brand.icon} size={22} color={Brand.gold} />
        </View>
        <View style={styles.brandText}>
          <Text style={styles.brandTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {brand.title}
          </Text>
          <Text
            style={[styles.brandSubtitle, isSuperAdminShell && styles.brandSubtitleSuperAdmin]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}>
            {brand.subtitle}
          </Text>
        </View>
        <AppPressable
          onPress={() => setOpen(false)}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel={t('a11yCloseMenu')}
          accessibilityHint={t('dashboardCloseMenuHint')}>
          <Ionicons name="close" size={22} color={FormColors.subtitle} />
        </AppPressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.drawerScroll}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {sections.map((section, idx) => (
          <View key={section.key} style={idx === 0 ? styles.sectionFirst : styles.section}>
            {section.title ? (
              <Text style={styles.sectionLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {section.title}
              </Text>
            ) : null}
            {section.items.map((item) => {
              const active = pathMatchesItem(pathname, item);
              return (
                <AppPressable
                  key={item.key}
                  onPress={() => onNavigate(item.href)}
                  style={[
                    styles.drawerRow,
                    active && styles.drawerRowActive,
                    isSuperAdminShell && active && styles.drawerRowActiveSuperAdmin,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={item.label}
                  accessibilityHint={t('dashboardOpenSectionA11y', { label: item.label })}>
                  {isSuperAdminShell && active ? <View style={styles.superAdminActiveBar} /> : null}
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={active ? Brand.gold : FormColors.subtitle}
                    style={styles.drawerIcon}
                  />
                  <Text
                    style={[
                      styles.drawerLabel,
                      active && styles.drawerLabelActive,
                      isSuperAdminShell && !active && styles.drawerLabelSuperAdminInactive,
                    ]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}>
                    {item.label}
                  </Text>
                </AppPressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Profile card + sign out */}
      <View style={styles.footer}>
        <View style={[styles.profileCard, shadowCard()]}>
          <View style={[styles.avatar, isSuperAdminShell && styles.avatarSuperAdmin]}>
            <Text
              style={[styles.avatarText, isSuperAdminShell && styles.avatarTextSuperAdmin]}
              maxFontSizeMultiplier={1.1}>
              {initials}
            </Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {isSuperAdminShell ? t('saProfileLabel') : displayName}
            </Text>
            <Text
              style={[isSuperAdminShell ? styles.profileVersion : styles.profileOrg]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}>
              {isSuperAdminShell ? t('saProfileVersion', { version: appVersion }) : orgLabel}
            </Text>
          </View>
        </View>
        <AppPressable
          onPress={onSignOut}
          style={styles.signOutRow}
          accessibilityRole="button"
          accessibilityLabel={t('a11ySignOut')}
          accessibilityHint={t('dashboardSignOutHint')}>
          <Ionicons name="log-out-outline" size={20} color={semantic.errorText} />
          <Text style={styles.signOutLabel} maxFontSizeMultiplier={1.15}>
            {t('profileSignOut').toUpperCase()}
          </Text>
        </AppPressable>
      </View>
    </SafeAreaView>
  );

  const deptPageBg = isDeptUploadShell ? deptUi?.colors.pageBg : null;

  return (
    <View style={[styles.root, isDeptUploadShell && deptPageBg != null && { backgroundColor: deptPageBg }]}>
      {isDeptUploadShell ? (
        <DeptUploadShellHeader
          onOpenDrawer={() => setOpen(true)}
          initials={initials}
          onProfileSettings={() => router.push('/dept-upload/settings' as Href)}
          onHelp={() => router.push('/dept-upload/help' as Href)}
          onSignOut={onSignOut}
        />
      ) : (
        <SafeAreaView style={styles.headerSafe} edges={['top']}>
          <View style={styles.headerRow}>
            <AppPressable
              onPress={() => setOpen(true)}
              style={styles.menuBtn}
              accessibilityRole="button"
              accessibilityLabel={t('a11yOpenNavMenu')}
              accessibilityHint={t('dashboardOpenNavMenuHint')}>
              <Ionicons name="menu" size={26} color={palette.white} />
            </AppPressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            {isSuperAdminShell && saUi ? (
              <View style={styles.saHeaderActions}>
                <AppPressable
                  onPress={saUi.toggleDarkMode}
                  style={styles.saHeaderIconBtn}
                  accessibilityLabel={saUi.isDarkMode ? t('systemAdminLightMode') : t('systemAdminDarkMode')}
                  accessibilityRole="button">
                  <Ionicons name={saUi.isDarkMode ? 'sunny' : 'moon'} size={22} color={palette.white} />
                </AppPressable>
                <AppPressable
                  onPress={() => setSaNotifOpen(true)}
                  style={styles.saHeaderIconBtn}
                  accessibilityLabel={t('notificationsTitle')}
                  accessibilityRole="button">
                  <Ionicons name="notifications-outline" size={22} color={palette.white} />
                  {saUnread > 0 ? (
                    <View style={styles.saBadge}>
                      <Text style={styles.saBadgeText}>{saUnread > 9 ? '9+' : saUnread}</Text>
                    </View>
                  ) : null}
                </AppPressable>
                <View style={styles.saHeaderAvatar}>
                  <Text style={styles.saHeaderAvatarText}>{initials}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.headerSpacer} />
            )}
          </View>
        </SafeAreaView>
      )}

      <View style={[styles.body, isDeptUploadShell && deptPageBg != null && { backgroundColor: deptPageBg }]}>
        {children}
      </View>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        accessibilityViewIsModal
        onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <AppPressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
            accessibilityLabel={t('a11yCloseMenu')}
            accessibilityHint={t('dashboardCloseMenuHint')}
          />
          <View style={[styles.drawerSheet, shadowDrawer()]}>{drawerContent}</View>
        </View>
      </Modal>

      {isSuperAdminShell && saUi ? (
        <SystemAdminNotificationsModal
          visible={saNotifOpen}
          onClose={() => setSaNotifOpen(false)}
          isDarkMode={saUi.isDarkMode}
        />
      ) : null}
    </View>
  );
}

export function DashboardShell({ role, titleOverride, hideTopBar, children }: Props) {
  if (hideTopBar) {
    return <View style={styles.root}>{children}</View>;
  }
  return (
    <DashboardShellWithDrawer role={role} titleOverride={titleOverride}>
      {children}
    </DashboardShellWithDrawer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: FormColors.background,
  },
  headerSafe: {
    backgroundColor: Brand.green,
    ...shadowHeader(),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  menuBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: spacing.xs,
    color: palette.white,
    ...typography.subtitle,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerSpacer: {
    width: touchTarget.min,
    height: touchTarget.min,
  },
  saHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: '52%',
    flexShrink: 1,
    justifyContent: 'flex-end',
  },
  saHeaderIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saBadge: {
    position: 'absolute',
    top: 2,
    end: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: semantic.errorText,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  saBadgeText: { color: palette.white, fontSize: 9, fontWeight: '800' },
  saHeaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  saHeaderAvatarText: {
    color: palette.white,
    fontSize: 11,
    fontWeight: '800',
  },
  body: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.overlayScrim,
  },
  drawerSheet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    backgroundColor: palette.white,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    maxWidth: '92%',
  },
  drawerInner: {
    flex: 1,
  },

  /* --- Brand header --- */
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutral200,
  },
  brandChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandChipSuperAdmin: {
    backgroundColor: palette.mintWash,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: FormColors.title,
    letterSpacing: 0.6,
  },
  brandSubtitle: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: Brand.green,
    letterSpacing: 1.2,
  },
  brandSubtitleSuperAdmin: {
    color: palette.infoTeal,
    letterSpacing: 1.4,
  },
  closeBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* --- Nav sections --- */
  drawerScroll: {
    paddingVertical: spacing.xs,
    paddingBottom: spacing.lg,
  },
  sectionFirst: {
    paddingTop: spacing.xs,
  },
  section: {
    paddingTop: spacing.md,
  },
  sectionLabel: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxs,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: palette.neutral400,
    textTransform: 'uppercase',
  },
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    paddingVertical: spacing.sm + spacing.xxs / 2,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  drawerRowActive: {
    backgroundColor: Brand.green,
  },
  drawerRowActiveSuperAdmin: {
    gap: spacing.xs,
  },
  superAdminActiveBar: {
    width: 3,
    height: 26,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: palette.white,
  },
  drawerIcon: {
    width: spacing.lg,
    textAlign: 'center',
  },
  drawerLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: FormColors.title,
  },
  drawerLabelActive: {
    color: palette.white,
    fontWeight: '700',
  },
  drawerLabelSuperAdminInactive: {
    color: palette.slate900,
  },

  /* --- Footer: profile card + sign out --- */
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.neutral200,
    backgroundColor: palette.neutral50,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSuperAdmin: {
    backgroundColor: '#F0E4D4',
  },
  avatarText: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  avatarTextSuperAdmin: {
    color: palette.white,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
    color: FormColors.title,
  },
  profileOrg: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: Brand.green,
    textTransform: 'uppercase',
  },
  profileVersion: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: palette.neutral500,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xxs,
  },
  signOutLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: semantic.errorText,
    textTransform: 'uppercase',
  },
});
