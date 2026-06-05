import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  I18nManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { HomeColors } from '@/constants/home';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useNotificationSettings } from '@/contexts/notification-settings-context';
import { useRedirectNonPublicFromPublicRoutes } from '@/hooks/use-redirect-non-public-from-public-routes';

type ToggleRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
};

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  isLast,
  icon,
  iconBg,
  iconColor,
}: ToggleRowProps) {
  const { t } = useAppTranslation();
  return (
    <View style={[styles.row, !isLast && styles.rowBorder, disabled && styles.rowDisabled]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} maxFontSizeMultiplier={1.1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} maxFontSizeMultiplier={1.05}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          void Haptics.selectionAsync();
          onValueChange(v);
        }}
        disabled={disabled}
        trackColor={{ false: FormColors.segmentEmpty, true: FormColors.iconMint }}
        thumbColor={value ? Brand.green : '#f4f3f4'}
        ios_backgroundColor={FormColors.segmentEmpty}
        accessibilityLabel={title || t('notificationsToggle')}
      />
    </View>
  );
}

/**
 * Notification preferences — same light card + section pattern as Profile tab body.
 */
export default function NotificationSettingsScreen() {
  useRedirectNonPublicFromPublicRoutes();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useAppTranslation();
  const horizontal = width < 360 ? 14 : 18;
  const { settings, setSettings } = useNotificationSettings();

  const categoriesDisabled = !settings.pushEnabled;

  const goBack = () => router.back();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingHorizontal: horizontal }]}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={styles.headerIconBtn}
          accessibilityRole="button"
          accessibilityLabel={t('a11yGoBack')}>
          <Ionicons
            name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color={HomeColors.decreeTitle}
          />
        </Pressable>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.15}>
          {t('profileNotifSettings')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontal, paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.intro} maxFontSizeMultiplier={1.15}>
          {t('notificationSettingsIntro')}
        </Text>

        <Text style={styles.sectionLabel}>{t('notificationSettingsGeneral')}</Text>
        <View style={styles.card}>
          <ToggleRow
            title={t('notificationSettingsPushTitle')}
            subtitle={t('notificationSettingsPushSubtitle')}
            value={settings.pushEnabled}
            onValueChange={(v) => setSettings({ pushEnabled: v })}
            icon="notifications"
            iconBg="rgba(11, 79, 46, 0.12)"
            iconColor={Brand.green}
            isLast
          />
        </View>

        <Text style={styles.sectionLabel}>{t('notificationSettingsCategories')}</Text>
        <View style={styles.card}>
          <ToggleRow
            title={t('notificationSettingsDecreesTitle')}
            subtitle={t('notificationSettingsDecreesSubtitle')}
            value={settings.decreeAlerts}
            onValueChange={(v) => setSettings({ decreeAlerts: v })}
            disabled={categoriesDisabled}
            icon="book-outline"
            iconBg="rgba(59, 130, 246, 0.18)"
            iconColor={Brand.green}
          />
          <ToggleRow
            title={t('notificationSettingsExamsTitle')}
            subtitle={t('notificationSettingsExamsSubtitle')}
            value={settings.examReminders}
            onValueChange={(v) => setSettings({ examReminders: v })}
            disabled={categoriesDisabled}
            icon="school-outline"
            iconBg="rgba(212, 175, 55, 0.22)"
            iconColor="#B8860B"
          />
          <ToggleRow
            title={t('notificationSettingsCertificatesTitle')}
            subtitle={t('notificationSettingsCertificatesSubtitle')}
            value={settings.certificateAlerts}
            onValueChange={(v) => setSettings({ certificateAlerts: v })}
            disabled={categoriesDisabled}
            icon="ribbon-outline"
            iconBg="rgba(124, 58, 237, 0.18)"
            iconColor="#7C3AED"
          />
          <ToggleRow
            title={t('notificationSettingsInspectionsTitle')}
            subtitle={t('notificationSettingsInspectionsSubtitle')}
            value={settings.inspectionUpdates}
            onValueChange={(v) => setSettings({ inspectionUpdates: v })}
            disabled={categoriesDisabled}
            icon="clipboard-outline"
            iconBg="rgba(11, 79, 46, 0.14)"
            iconColor={Brand.green}
            isLast
          />
        </View>

        {categoriesDisabled ? (
          <Text style={styles.hint} maxFontSizeMultiplier={1.05}>
            {t('notificationSettingsEnableHint')}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: HomeColors.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    backgroundColor: HomeColors.pageBg,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: HomeColors.decreeTitle,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  intro: {
    fontSize: 15,
    color: FormColors.subtitle,
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#9CA3AF',
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 64,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: FormColors.dividerMuted,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: FormColors.title,
  },
  rowSubtitle: {
    fontSize: 13,
    color: FormColors.label,
    marginTop: 2,
    fontWeight: '500',
    lineHeight: 18,
  },
  hint: {
    fontSize: 13,
    color: FormColors.label,
    marginTop: 4,
    lineHeight: 18,
  },
});
