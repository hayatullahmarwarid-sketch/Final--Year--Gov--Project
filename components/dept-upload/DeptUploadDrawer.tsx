import { Ionicons } from '@expo/vector-icons';
import { type Href, usePathname } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { I18nManager, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppPressable } from '@/components/ui/AppPressable';
import { useDeptUploadSettingsOptional } from '@/contexts/dept-upload-settings-context';
import { useDeptUploadThemeColorsOptional, useDeptUploadUiOptional } from '@/contexts/dept-upload-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { palette, radius, touchTarget } from '@/lib/theme';

const LOGO_GREEN = palette.primary;
const STORAGE_USED_MB = 22.2;
const STORAGE_TOTAL_GB = 50;
const STORAGE_RATIO = STORAGE_USED_MB / (STORAGE_TOTAL_GB * 1024);

type NavDef = {
  key: string;
  label: string;
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
};

const NAV: NavDef[] = [
  { key: 'dash', label: 'dashLabelDashboard', href: '/dept-upload' as Href, icon: 'grid-outline' },
  { key: 'decrees', label: 'deptDrawerDecreeManagement', href: '/dept-upload/decrees' as Href, icon: 'document-text-outline' },
  { key: 'reports', label: 'dashLabelReports', href: '/dept-upload/reports' as Href, icon: 'bar-chart-outline' },
  { key: 'settings', label: 'dashLabelSettings', href: '/dept-upload/settings' as Href, icon: 'settings-outline' },
  { key: 'help', label: 'deptAccountMenuHelp', href: '/dept-upload/help' as Href, icon: 'help-circle-outline' },
];

function navActive(pathname: string, href: Href): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  const h = String(href).replace(/\/$/, '') || '/';
  if (h === '/dept-upload') return p === '/dept-upload';
  return p === h || p.startsWith(h + '/');
}

type Props = {
  drawerWidth: number;
  onClose: () => void;
  onNavigate: (href: Href) => void;
};

export function DeptUploadDrawer({ drawerWidth, onClose, onNavigate }: Props) {
  const pathname = usePathname();
  const deptUi = useDeptUploadUiOptional();
  const deptSettings = useDeptUploadSettingsOptional();
  const c = useDeptUploadThemeColorsOptional();
  const { t, number } = useAppTranslation();
  const dark = deptUi?.isDarkMode ?? false;
  const barPct = useMemo(() => Math.max(STORAGE_RATIO * 100, 0.35), []);
  const rtl = I18nManager.isRTL;
  const rowDir = rtl ? 'row-reverse' : 'row';

  const onItem = useCallback(
    (href: Href) => {
      onNavigate(href);
    },
    [onNavigate],
  );

  return (
    <SafeAreaView style={[styles.inner, { width: drawerWidth, backgroundColor: c.cardBg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { flexDirection: rowDir }]}>
        <View style={styles.logoSq}>
          <Ionicons name="document-text" size={22} color={palette.white} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: c.textPrimary }]} numberOfLines={1}>
            {deptSettings?.settings?.department?.deptName?.trim() || t('deptShellTitle')}
          </Text>
          <Text style={[styles.headerSub, { color: c.textMuted }]} numberOfLines={1}>
            {deptSettings?.settings?.department?.deptCode?.trim() || t('deptDrawerSubtitle')}
          </Text>
        </View>
        <AppPressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel={t('dashboardCloseMenuHint')}>
          <Ionicons name="close" size={22} color={c.textMuted} />
        </AppPressable>
      </View>

      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {NAV.map((item) => {
          const active = navActive(pathname, item.href);
          return (
            <AppPressable
              key={item.key}
              onPress={() => onItem(item.href)}
              style={[styles.navRow, { flexDirection: rowDir }, active && styles.navRowActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(item.label)}>
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? palette.white : c.textSecondary}
                style={styles.navIcon}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive, !active && { color: c.textSecondary }]} numberOfLines={1}>
                {t(item.label)}
              </Text>
            </AppPressable>
          );
        })}
      </ScrollView>

      <View style={[styles.themeBar, { backgroundColor: c.cardBgMuted, borderColor: c.cardBorder }]}>
        <AppPressable
          onPress={() => deptUi?.toggleDarkMode()}
          style={[styles.themeBtn, { flexDirection: rowDir }]}
          accessibilityRole="button"
          accessibilityLabel={dark ? t('deptThemeSwitchToLight') : t('deptThemeSwitchToDark')}>
          <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={22} color={LOGO_GREEN} />
          <Text style={[styles.themeBtnTxt, { color: c.textPrimary }]}>{dark ? t('systemAdminLight') : t('systemAdminDark')}</Text>
        </AppPressable>
      </View>

      <View style={[styles.storageWrap, { backgroundColor: c.cardBgMuted, borderColor: c.cardBorder }]}>
        <Text style={[styles.storageTitle, { color: c.textSecondary }]}>{t('deptStorageUsageTitle')}</Text>
        <View style={[styles.storageTrack, { backgroundColor: c.segmentTrack }]}>
          <View style={[styles.storageFill, { width: `${barPct}%` }]} />
        </View>
        <Text style={[styles.storageMeta, { color: c.textMuted }]}>
          {number(STORAGE_USED_MB)} MB / {number(STORAGE_TOTAL_GB)} GB
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
  },
  navScroll: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 12,
  },
  logoSq: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: LOGO_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '400',
  },
  closeBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
  },
  navRowActive: {
    backgroundColor: LOGO_GREEN,
  },
  navIcon: {
    width: 24,
    textAlign: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  navLabelActive: {
    color: palette.white,
    fontWeight: '600',
  },
  themeBar: {
    marginHorizontal: 14,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeBtnTxt: {
    fontSize: 15,
    fontWeight: '700',
  },
  storageWrap: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  storageTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  storageTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
  },
  storageMeta: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '400',
  },
});
