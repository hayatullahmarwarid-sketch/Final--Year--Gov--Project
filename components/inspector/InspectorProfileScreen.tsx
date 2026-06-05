import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { type Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { I18nManager, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { palette } from '@/lib/theme';
import { useAuthSession } from '@/contexts/auth-session-context';
import { inspectorsApi } from '@/lib/api/inspectors';
import { useInspectorLang } from '@/contexts/inspector-lang-context';
import { useAppTranslation } from '@/hooks/use-app-translation';

import { INSPECTOR_AVATAR_GOLD, INSPECTOR_BAR_BG, inspectorHeaderShadow } from './inspector-chrome';
import { InspectorBottomNav, inspectorBottomNavOffset } from './InspectorBottomNav';
import { INSPECTOR_TRANSLATIONS } from './inspector-translations';

export function InspectorProfileScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarOffset = inspectorBottomNavOffset(insets.bottom);
  const horizontalPad = width >= 900 ? Math.max(24, (width - 560) / 2) : width >= 768 ? 32 : 16;
  const { signOut } = useAuthSession();
  const { lang, cycleLang } = useInspectorLang();
  const ti = INSPECTOR_TRANSLATIONS[lang];
  const { t } = useAppTranslation();
  const [notifications, setNotifications] = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [roleKey, setRoleKey] = useState<string | null>(null);
  const [assignmentTotal, setAssignmentTotal] = useState<number | null>(null);

  const langLabel = lang === 'ps' ? 'پښتو' : 'دری';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await inspectorsApi.profile();
      if (cancelled || !r.ok || !r.data || typeof r.data !== 'object') return;
      const d = r.data as Record<string, unknown>;
      const user = d.user as Record<string, unknown> | undefined;
      if (user?.displayName) setProfileName(String(user.displayName));
      if (user?.roleKey) setRoleKey(String(user.roleKey));
      const summary = d.assignmentSummary as Record<string, unknown> | undefined;
      if (summary && typeof summary.total === 'number') setAssignmentTotal(summary.total);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onLogout = async () => {
    await signOut();
    router.replace('/login' as Href);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/inspector' as Href);
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.topGreen} edges={['top']}>
        <View style={styles.profileNavBar}>
          <Pressable onPress={goBack} style={styles.profileNavSide} accessibilityRole="button">
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.profileNavTitleWrap} pointerEvents="none">
            <Text style={styles.profileNavTitle} maxFontSizeMultiplier={1.15} numberOfLines={1}>
              {ti.myProfileHeader}
            </Text>
          </View>
          <View style={styles.profileNavSide} />
        </View>
      </SafeAreaView>

      <View style={styles.root}>
        <View style={[styles.cardOverlay, { marginHorizontal: horizontalPad }]}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatarInner}>
              <Ionicons name="person" size={32} color={INSPECTOR_AVATAR_GOLD} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name} maxFontSizeMultiplier={1.2}>
                {profileName ?? 'Inspector'}
              </Text>
              <Ionicons name="ribbon-outline" size={16} color={Brand.gold} />
            </View>
            <Text style={styles.role} maxFontSizeMultiplier={1.1}>
              {roleKey ?? '—'}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.verified}>
                <Ionicons name="checkmark-circle" size={10} color="#059669" />
                <Text style={styles.verifiedTxt} maxFontSizeMultiplier={1.05}>
                  Verified ID
                </Text>
              </View>
              <Text style={styles.district} maxFontSizeMultiplier={1.05}>
                {assignmentTotal != null ? `${assignmentTotal} assignments` : '—'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.profileScroll}
          contentContainerStyle={{
            paddingHorizontal: horizontalPad,
            paddingTop: 16,
            paddingBottom: tabBarOffset + 32,
          }}>
          <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.05}>
            Configuration
          </Text>
          <View style={styles.card}>
            <Pressable style={styles.row} onPress={cycleLang} accessibilityRole="button" accessibilityLabel={t('a11yCycleInspectorLang')}>
              <View style={[styles.rowIcon, { backgroundColor: palette.primaryWash }]}>
                <Ionicons name="globe-outline" size={18} color={Brand.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} maxFontSizeMultiplier={1.1}>
                  Language
                </Text>
                <Text style={styles.rowSub} maxFontSizeMultiplier={1.05}>
                  {langLabel} — tap to switch
                </Text>
              </View>
              <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="#D1D5DB" />
            </Pressable>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Pressable
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                onPress={() => router.push('/notification-settings' as Href)}
                accessibilityRole="button"
                accessibilityLabel={t('a11yOpenNotifSettingsInspector')}>
                <View style={[styles.rowIcon, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="notifications-outline" size={18} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} maxFontSizeMultiplier={1.1}>
                    Notifications
                  </Text>
                  <Text style={styles.rowSub} maxFontSizeMultiplier={1.05}>
                    Task & Sync Alerts
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setNotifications((n) => !n)}
                style={[styles.toggle, notifications && styles.toggleOn]}
                accessibilityRole="switch"
                accessibilityState={{ checked: notifications }}>
                <View style={[styles.knob, notifications && styles.knobOn]} />
              </Pressable>
            </View>
            <View style={styles.divider} />
            <Pressable style={styles.row} onPress={() => router.push('/inspector/sync' as Href)} accessibilityRole="button">
              <View style={[styles.rowIcon, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} maxFontSizeMultiplier={1.1}>
                  Digital Signature
                </Text>
                <Text style={[styles.rowSub, { color: '#059669', fontWeight: '800' }]} maxFontSizeMultiplier={1.05}>
                  Authenticated — sync status
                </Text>
              </View>
              <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="#D1D5DB" />
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]} maxFontSizeMultiplier={1.05}>
            Support & System
          </Text>
          <View style={styles.card}>
            <Pressable
              style={styles.row}
              onPress={() => void WebBrowser.openBrowserAsync('https://en.wikipedia.org/wiki/Sharia')}
              accessibilityRole="link">
              <View style={[styles.rowIcon, { backgroundColor: '#F9FAFB' }]}>
                <Ionicons name="help-circle-outline" size={18} color="#4B5563" />
              </View>
              <Text style={[styles.rowTitle, { flex: 1 }]} maxFontSizeMultiplier={1.1}>
                Help & Documentation
              </Text>
              <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="#D1D5DB" />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.row}
              onPress={() => void WebBrowser.openBrowserAsync('https://www.unodc.org/unodc/en/justice-and-prison-reform/cpcj.html')}
              accessibilityRole="link">
              <View style={[styles.rowIcon, { backgroundColor: '#F9FAFB' }]}>
                <Ionicons name="document-text-outline" size={18} color="#4B5563" />
              </View>
              <Text style={[styles.rowTitle, { flex: 1 }]} maxFontSizeMultiplier={1.1}>
                Operational Guidelines
              </Text>
              <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="#D1D5DB" />
            </Pressable>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#F9FAFB' }]}>
                <Ionicons name="phone-portrait-outline" size={18} color="#4B5563" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} maxFontSizeMultiplier={1.1}>
                  App Version
                </Text>
                <Text style={styles.rowSub} maxFontSizeMultiplier={1.05}>
                  v4.2.2 (Build 882)
                </Text>
              </View>
              <View style={styles.upToDate}>
                <Text style={styles.upToDateTxt} maxFontSizeMultiplier={1.05}>
                  Up to date
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.warnCard}>
            <Ionicons name="information-circle-outline" size={24} color="#B45309" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warnTitle} maxFontSizeMultiplier={1.1}>
                Data Integrity Warning
              </Text>
              <Text style={styles.warnBody} maxFontSizeMultiplier={1.15}>
                Your device contains sensitive operational data. Ensure your biometric lock is active and never share your credentials.
              </Text>
            </View>
          </View>

          <Pressable style={styles.logout} onPress={onLogout} accessibilityRole="button">
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            <Text style={styles.logoutTxt} maxFontSizeMultiplier={1.1}>
              Secure Logout
            </Text>
          </Pressable>
        </ScrollView>

        <InspectorBottomNav />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  topGreen: {
    backgroundColor: INSPECTOR_BAR_BG,
    ...inspectorHeaderShadow,
  },
  profileNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 48,
  },
  profileNavSide: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileNavTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  profileNavTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  root: { flex: 1 },
  profileScroll: { flex: 1 },
  cardOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 20,
    marginTop: -12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    zIndex: 3,
  },
  avatarOuter: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  avatarInner: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: INSPECTOR_BAR_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 18, fontWeight: '900', color: '#111827' },
  role: { fontSize: 12, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedTxt: { fontSize: 9, fontWeight: '800', color: '#047857', letterSpacing: 0.2, textTransform: 'uppercase' },
  district: { fontSize: 10, fontWeight: '800', color: Brand.green, letterSpacing: 0.3, textTransform: 'uppercase' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 12, fontWeight: '800', color: '#1F2937' },
  rowSub: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#F9FAFB' },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: Brand.green },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  knobOn: { alignSelf: 'flex-end' },
  upToDate: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: palette.primaryWash,
  },
  upToDateTxt: { fontSize: 9, fontWeight: '800', color: Brand.green, textTransform: 'uppercase' },
  warnCard: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 20,
    marginTop: 24,
  },
  warnTitle: { fontSize: 12, fontWeight: '800', color: '#92400E', letterSpacing: 0.3, textTransform: 'uppercase' },
  warnBody: { fontSize: 10, color: '#92400E', marginTop: 6, lineHeight: 16 },
  logout: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 16,
    paddingVertical: 16,
  },
  logoutTxt: { fontSize: 12, fontWeight: '800', color: '#DC2626', letterSpacing: 0.6, textTransform: 'uppercase' },
});
