import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { type Href, router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo } from 'react';
import {
  I18nManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { HomeColors } from '@/constants/home';
import { palette } from '@/lib/theme';
import { APP_LANGUAGES } from '@/constants/languages';
import { useAppAppearance } from '@/contexts/app-appearance-context';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useNotificationInbox } from '@/contexts/notification-inbox-context';
import { usePublicUserData } from '@/contexts/public-user-data-context';
import { useUserProfile } from '@/contexts/user-profile-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { usePublicScreenTheme } from '@/lib/public-screen-theme';

import { AppSwitch } from '@/components/ui/AppSwitch';

type StatItem = {
  key: string;
  label: string;
  value: string;
  icon: 'ribbon' | 'clipboard-outline' | 'trending-up' | 'bookmark';
  lib: 'mci' | 'ion';
  iconBg: string;
  iconColor: string;
};

function profileInitials(fullName: string): string {
  const n = fullName.trim();
  if (!n) return '';
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = (parts.length >= 2 ? parts[1]?.[0] : parts[0]?.[1]) ?? '';
  return (first + second).toUpperCase();
}

/** Large subtle diamonds + corner brackets — premium texture on brand header. */
function PremiumHeaderPattern({ width, headerHeight }: { width: number; headerHeight: number }) {
  const diamonds = useMemo(() => {
    const step = 52;
    const cols = Math.ceil(width / step) + 1;
    const rows = Math.ceil(headerHeight / step) + 1;
    const out: { key: string; cx: number; cy: number; size: number; opacity: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const phase = (r + c) % 3;
        out.push({
          key: `d-${r}-${c}`,
          cx: c * step + (phase === 1 ? step * 0.35 : phase === 2 ? step * 0.65 : step * 0.5),
          cy: r * step + 20 + (phase * 6),
          size: 22 + (phase * 4),
          opacity: 0.055 + (r * 0.004 + c * 0.003) % 0.04,
        });
      }
    }
    return out;
  }, [width, headerHeight]);

  return (
    <View style={[StyleSheet.absoluteFill, { height: headerHeight }]} pointerEvents="none">
      {diamonds.map((d) => (
        <View
          key={d.key}
          style={{
            position: 'absolute',
            left: d.cx - d.size / 2,
            top: d.cy - d.size / 2,
            width: d.size,
            height: d.size,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: `rgba(255,255,255,${0.14 + d.opacity})`,
            backgroundColor: `rgba(255,255,255,${d.opacity})`,
            transform: [{ rotate: '45deg' }],
          }}
        />
      ))}
      {/* Larger corner frame accents */}
      <View
        style={{
          position: 'absolute',
          top: 48,
          left: 12,
          width: 44,
          height: 44,
          borderLeftWidth: 2,
          borderTopWidth: 2,
          borderColor: 'rgba(255,255,255,0.22)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 48,
          right: 12,
          width: 44,
          height: 44,
          borderRightWidth: 2,
          borderTopWidth: 2,
          borderColor: 'rgba(255,255,255,0.22)',
        }}
      />
    </View>
  );
}

function StatCard({ item }: { item: StatItem }) {
  const th = usePublicScreenTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: th.cardBg }]}>
      <View style={[styles.statIconWrap, { backgroundColor: item.iconBg }]}>
        {item.lib === 'mci' ? (
          <MaterialCommunityIcons name={item.icon} size={20} color={item.iconColor} />
        ) : (
          <Ionicons name={item.icon} size={20} color={item.iconColor} />
        )}
      </View>
      <Text style={[styles.statValue, { color: th.textPrimary }]} maxFontSizeMultiplier={1.2}>
        {item.value}
      </Text>
      <Text style={[styles.statLabel, { color: th.textSecondary }]} maxFontSizeMultiplier={1.05}>
        {item.label}
      </Text>
    </View>
  );
}

export default function ProfileTabScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontal = width < 360 ? 14 : 18;
  const headerHeight = 280 + insets.top;
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const th = usePublicScreenTheme();
  const { colorScheme, setColorScheme } = useAppAppearance();
  const { profile } = useUserProfile();
  const { language } = useAppLanguage();
  const { t, number, date } = useAppTranslation();
  const { signOut, sessionEmail } = useAuthSession();
  const { data: publicData } = usePublicUserData();
  const { unreadCount, refreshInbox } = useNotificationInbox();

  useFocusEffect(
    useCallback(() => {
      void refreshInbox();
    }, [refreshInbox]),
  );

  const stats: StatItem[] = useMemo(() => {
    const attempts = Object.values(publicData.examAttempts);
    const passed = attempts.filter((a) => a.passed).length;
    const passRatePct = attempts.length > 0 ? Math.round((passed / attempts.length) * 100) : 0;
    return [
      {
        key: 'cert',
        label: t('statCertificates'),
        value: number(publicData.earnedCertificateIds.length),
        icon: 'ribbon',
        lib: 'mci',
        iconBg: 'rgba(212, 175, 55, 0.22)',
        iconColor: '#B8860B',
      },
      {
        key: 'exams',
        label: t('statExamsTaken'),
        value: number(attempts.length),
        icon: 'clipboard-outline',
        lib: 'ion',
        iconBg: palette.primaryAlpha.a16,
        iconColor: Brand.green,
      },
      {
        key: 'pass',
        label: t('statPassRate'),
        value: `${number(attempts.length > 0 ? passRatePct : 0)}%`,
        icon: 'trending-up',
        lib: 'ion',
        iconBg: 'rgba(11, 79, 46, 0.14)',
        iconColor: Brand.green,
      },
      {
        key: 'marks',
        label: t('statBookmarks'),
        value: number(publicData.bookmarkedDecreeIds.length),
        icon: 'bookmark',
        lib: 'ion',
        iconBg: 'rgba(124, 58, 237, 0.18)',
        iconColor: '#7C3AED',
      },
    ];
  }, [number, publicData.bookmarkedDecreeIds.length, publicData.earnedCertificateIds.length, publicData.examAttempts, t]);

  const bump = () => {
    void Haptics.selectionAsync();
  };

  const languageNativeName = APP_LANGUAGES.find((l) => l.id === language)?.nativeName ?? '';
  const memberSinceLabel = useMemo(() => {
    const createdAt = profile.createdAt?.trim();
    const dt = createdAt ? new Date(createdAt) : null;
    if (dt && !Number.isNaN(dt.getTime())) {
      return t('profileMemberSince', {
        date: date(dt, { month: 'short', day: '2-digit', year: 'numeric' }),
      });
    }
    return t('profileMemberSince', { date: '—' });
  }, [date, profile.createdAt, t]);

  const openEditProfile = () => {
    bump();
    router.push('/edit-profile');
  };

  const openChangePassword = () => {
    bump();
    router.push('/change-password');
  };

  const openLanguageSettings = () => {
    bump();
    router.push('/settings-language');
  };

  const openNotificationSettings = () => {
    bump();
    router.push('/notification-settings');
  };

  const openNotificationsInbox = () => {
    bump();
    router.push('/notifications' as Href);
  };

  const openMyCertificates = () => {
    bump();
    router.push({ pathname: '/(tabs)/certificates', params: { earnedOnly: '1' } });
  };

  const openExamHistory = () => {
    bump();
    router.push({ pathname: '/(tabs)/exams', params: { history: '1' } });
  };

  const openBookmarkedDecrees = () => {
    bump();
    router.push('/bookmarked-decrees');
  };

  const openVerifyCertificate = () => {
    bump();
    router.push('/verify-certificate' as Href);
  };

  return (
    <View style={[styles.shell, { backgroundColor: th.pageBg }]}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator>
        <View style={[styles.header, { paddingTop: insets.top, minHeight: headerHeight }]}>
          <PremiumHeaderPattern width={width} headerHeight={headerHeight} />
          <View style={[styles.headerInner, { paddingHorizontal: horizontal }]}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerSpacer} />
              <Pressable
                style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
                onPress={openEditProfile}
                accessibilityRole="button"
                accessibilityLabel={t('a11yEditProfile')}>
                <Ionicons name="pencil" size={18} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.avatarBlock}>
              <View style={styles.avatarRing}>
                {profile.avatarUri?.trim() ? (
                  <Image
                    source={{ uri: profile.avatarUri }}
                    style={styles.avatarImg}
                    contentFit="cover"
                    transition={200}
                    accessibilityLabel={t('a11yProfilePhoto')}
                  />
                ) : (
                  <View style={[styles.avatarImg, styles.avatarInitials]} accessibilityLabel={t('a11yProfilePhoto')}>
                    <Text style={styles.avatarInitialsText} maxFontSizeMultiplier={1.1}>
                      {profileInitials(profile.fullName) || '—'}
                    </Text>
                  </View>
                )}
                <View style={styles.onlineDot} />
              </View>
              <Text style={styles.userName} maxFontSizeMultiplier={1.15}>
                {profile.fullName?.trim() ? profile.fullName : '—'}
              </Text>
              <View style={styles.roleBadge}>
                <View style={styles.roleDot} />
                <Text style={styles.roleText} maxFontSizeMultiplier={1.1}>
                  {t('profilePublicUser')}
                </Text>
              </View>
              {sessionEmail ? (
                <View style={styles.metaRow}>
                  <Ionicons name="mail-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.metaPrimary} maxFontSizeMultiplier={1.05} numberOfLines={1}>
                    {sessionEmail}
                  </Text>
                </View>
              ) : null}
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={15} color="#FFFFFF" />
                <Text style={styles.metaSecondary} maxFontSizeMultiplier={1.1}>
                  {profile.province?.trim() ? profile.province : '—'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
                <Text style={styles.metaSecondary} maxFontSizeMultiplier={1.1}>
                  {memberSinceLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.body, { paddingHorizontal: horizontal }]}>
          <View style={styles.statRow}>
            {stats.map((s) => (
              <StatCard key={s.key} item={s} />
            ))}
          </View>

          <Text style={[styles.sectionHeading, { color: th.textMuted }]}>{t('profileSectionAccount')}</Text>
          <View style={[styles.card, { backgroundColor: th.cardBg }]}>
            <ProfileRow
              iconLib="ion"
              icon="person"
              iconBg="rgba(11, 79, 46, 0.12)"
              iconColor={Brand.green}
              title={t('profilePersonalInfo')}
              onPress={openEditProfile}
            />
            <ProfileRow
              iconLib="ion"
              icon="notifications"
              iconBg={palette.primaryAlpha.a16}
              iconColor={Brand.green}
              title={t('notificationsTitle')}
              trailingBadge={unreadCount > 0 ? (unreadCount > 99 ? '99+' : number(unreadCount)) : undefined}
              onPress={openNotificationsInbox}
            />
            <ProfileRow
              iconLib="ion"
              icon="lock-closed"
              iconBg="rgba(212, 175, 55, 0.25)"
              iconColor="#B45309"
              title={t('profileChangePassword')}
              onPress={openChangePassword}
            />
            <ProfileRow
              iconLib="ion"
              icon="globe-outline"
              iconBg="rgba(124, 58, 237, 0.18)"
              iconColor="#7C3AED"
              title={t('profileLanguage')}
              subtitle={languageNativeName}
              onPress={openLanguageSettings}
            />
            <ProfileRow
              iconLib="ion"
              icon="contrast-outline"
              iconBg={palette.primaryAlpha.a16}
              iconColor={Brand.green}
              title={t('profileThemeMode')}
              subtitle={colorScheme === 'dark' ? t('systemAdminDarkMode') : t('systemAdminLightMode')}
              trailingControl={
                <AppSwitch
                  value={colorScheme === 'dark'}
                  onValueChange={(v) => setColorScheme(v ? 'dark' : 'light')}
                  size="sm"
                  offColor={th.isDark ? '#475569' : palette.neutral200}
                />
              }
              onPress={() => {}}
            />
            <ProfileRow
              iconLib="ion"
              icon="notifications-outline"
              iconBg={palette.primaryAlpha.a16}
              iconColor={Brand.green}
              title={t('profileNotifSettings')}
              onPress={openNotificationSettings}
              isLast
            />
          </View>

          <Text style={[styles.sectionHeading, { color: th.textMuted }]}>{t('profileSectionActivity')}</Text>
          <View style={[styles.card, { backgroundColor: th.cardBg }]}>
            <ProfileRow
              iconLib="mci"
              icon="ribbon"
              iconBg="rgba(212, 175, 55, 0.22)"
              iconColor="#B8860B"
              title={t('profileMyCertificates')}
              trailingBadge={
                publicData.earnedCertificateIds.length > 0
                  ? number(publicData.earnedCertificateIds.length)
                  : undefined
              }
              onPress={openMyCertificates}
            />
            <ProfileRow
              iconLib="ion"
              icon="time-outline"
              iconBg={FormColors.iconMint}
              iconColor={Brand.green}
              title={t('profileExamHistory')}
              onPress={openExamHistory}
            />
            <ProfileRow
              iconLib="ion"
              icon="bookmark-outline"
              iconBg="rgba(236, 72, 153, 0.16)"
              iconColor="#DB2777"
              title={t('profileBookmarked')}
              onPress={openBookmarkedDecrees}
            />
            <ProfileRow
              iconLib="ion"
              icon="shield-checkmark-outline"
              iconBg="rgba(16, 185, 129, 0.16)"
              iconColor="#059669"
              title={t('profileVerifyCertificate')}
              onPress={openVerifyCertificate}
              isLast
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.signOutBtn,
              { backgroundColor: th.signOutBg },
              pressed && styles.signOutBtnPressed,
            ]}
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              void signOut();
              router.replace('/login');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('a11ySignOut')}>
            <Ionicons name="log-out-outline" size={22} color="#DC2626" />
            <Text style={styles.signOutText} maxFontSizeMultiplier={1.1}>
              {t('profileSignOut')}
            </Text>
          </Pressable>

          <Text style={[styles.version, { color: th.textMuted }]} maxFontSizeMultiplier={1.2}>
            {t('profileAppVersion', { version: appVersion })}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

type ProfileRowProps = {
  iconLib: 'ion' | 'mci';
  icon: keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  trailingBadge?: string;
  onPress: () => void;
  isLast?: boolean;
  /** When set, the row is non-navigating and shows this control instead of the chevron. */
  trailingControl?: React.ReactNode;
};

function ProfileRow({
  iconLib,
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  trailingBadge,
  onPress,
  isLast,
  trailingControl,
}: ProfileRowProps) {
  const th = usePublicScreenTheme();
  const a11y = subtitle ? `${title}, ${subtitle}` : title;
  const borderBottom = !isLast ? [{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: th.divider }] : [];

  const inner = (
    <>
      <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
        {iconLib === 'mci' ? (
          <MaterialCommunityIcons
            name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={22}
            color={iconColor}
          />
        ) : (
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={iconColor} />
        )}
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowTitle, { color: th.textPrimary }]} maxFontSizeMultiplier={1.1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: th.textSecondary }]} maxFontSizeMultiplier={1.05}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowTrailing}>
        {trailingBadge ? (
          <View style={styles.rowCountBadge}>
            <Text style={styles.rowCountBadgeText} maxFontSizeMultiplier={1.05}>
              {trailingBadge}
            </Text>
          </View>
        ) : null}
        {trailingControl ? (
          trailingControl
        ) : (
          <Ionicons
            name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
            size={20}
            color={th.chevronRow}
          />
        )}
      </View>
    </>
  );

  if (trailingControl) {
    return (
      <View style={[styles.row, ...borderBottom]} accessibilityLabel={a11y} accessibilityRole="summary">
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        ...borderBottom,
        pressed && { backgroundColor: th.rowPressBg },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: Brand.green,
    position: 'relative',
    overflow: 'hidden',
  },
  headerInner: {
    position: 'relative',
    zIndex: 1,
    paddingBottom: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  headerSpacer: {
    flex: 1,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnPressed: {
    opacity: 0.88,
  },
  avatarBlock: {
    alignItems: 'center',
    marginTop: 4,
  },
  avatarRing: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Brand.gold,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  avatarInitials: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  avatarInitialsText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: FormColors.successBright,
    borderWidth: 2,
    borderColor: Brand.green,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.35,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaPrimary: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  metaSecondary: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
    flex: 1,
  },
  body: {
    marginTop: -12,
    paddingTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
          }
        : { elevation: 2 }),
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
          }
        : { elevation: 2 }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  rowCountBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
  },
  signOutBtnPressed: {
    opacity: 0.9,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
});
