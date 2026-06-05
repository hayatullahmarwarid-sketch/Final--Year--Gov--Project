import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { AppPressable } from '@/components/ui/AppPressable';
import { AppSwitch } from '@/components/ui/AppSwitch';
import { useSystemAdminUiOptional } from '@/contexts/system-admin-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useSystemAdminStore } from '@/data/system-admin-store';
import { getApiBaseUrl } from '@/constants/api';
import {
  getSettings,
  patchSettings,
  postSystemAdminAnnounce,
  triggerSystemAdminBackup,
  type PatchSettingsBody,
} from '@/lib/api/system-admin';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';
import {
  Brand,
  FormColors,
  palette,
  radius,
  shadowCard,
  spacing,
  touchTarget,
  typography,
} from '@/lib/theme';

type TabId = 'platform' | 'security' | 'alerts' | 'data';

const SESSION_OPTIONS = [15, 30, 45, 60, 120] as const;
const RETENTION_OPTIONS = [90, 180, 365, 730] as const;
const API_TICKS = [2000, 4000, 6000, 8000, 12000, 20000] as const;

function readPortalString(portal: Record<string, unknown>, key: string, fallback: string): string {
  const v = portal[key];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function readSecurityBool(sec: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = sec[key];
  return typeof v === 'boolean' ? v : fallback;
}

function readSecurityString(sec: Record<string, unknown>, key: string, fallback: string): string {
  const v = sec[key];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function readSecurityNumber(sec: Record<string, unknown>, key: string, fallback: number): number {
  const v = sec[key];
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim()) return Number(v) || fallback;
  return fallback;
}

export function AdminSettingsNative() {
  const { serverNode, appVersion } = useSystemAdminStore();
  const { t, number } = useAppTranslation();
  const saUi = useSystemAdminUiOptional();
  const isDark = saUi?.isDarkMode ?? false;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('platform');

  const [platformName, setPlatformName] = useState('Sharia Decrees — National Portal');
  const [supportEmail, setSupportEmail] = useState('platform-ops@decrees.gov.af');
  const [sessionMinutes, setSessionMinutes] = useState(30);
  const [language, setLanguage] = useState<'en' | 'fa' | 'ps'>('en');
  const [timezone, setTimezone] = useState<'Asia/Kabul' | 'Asia/Tehran' | 'UTC'>('Asia/Kabul');
  const [dateFormat, setDateFormat] = useState<'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'>('DD/MM/YYYY');
  const [reauthDestructive, setReauthDestructive] = useState(true);

  const [apiCeiling, setApiCeiling] = useState(8000);

  const [maintenanceEmail, setMaintenanceEmail] = useState('noc@decrees.gov.af');
  const [notifyDeptOnIncident, setNotifyDeptOnIncident] = useState(true);

  const [auditRetention, setAuditRetention] = useState(365);
  const [centralBackup, setCentralBackup] = useState<'daily' | 'weekly'>('daily');
  const [coldArchive, setColdArchive] = useState(true);
  const [replicaRegions, setReplicaRegions] =
    useState<'primary+dr' | 'primary' | 'active-active'>('primary+dr');

  const [backupBusy, setBackupBusy] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [announceAudience, setAnnounceAudience] = useState<'all' | 'public_only'>('all');
  const [announceBusy, setAnnounceBusy] = useState(false);

  const [original, setOriginal] = useState<string>('');

  const currentSerialized = useMemo(
    () =>
      JSON.stringify({
        platformName,
        supportEmail,
        sessionMinutes,
        language,
        timezone,
        dateFormat,
        reauthDestructive,
        apiCeiling,
        maintenanceEmail,
        notifyDeptOnIncident,
        auditRetention,
        centralBackup,
        coldArchive,
        replicaRegions,
      }),
    [
      platformName,
      supportEmail,
      sessionMinutes,
      language,
      timezone,
      dateFormat,
      reauthDestructive,
      apiCeiling,
      maintenanceEmail,
      notifyDeptOnIncident,
      auditRetention,
      centralBackup,
      coldArchive,
      replicaRegions,
    ],
  );

  const dirty = original !== '' && currentSerialized !== original;

  const loadSettings = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    const token = await getJwtAccessToken();
    if (!token) {
      setLoading(false);
      setOriginal(currentSerialized);
      return;
    }
    const r = await getSettings();
    if (r.ok && r.data != null) {
      const portal = (r.data.portal ?? {}) as Record<string, unknown>;
      const sec = (r.data.security ?? {}) as Record<string, unknown>;
      const feat = (r.data.features ?? {}) as Record<string, unknown>;
      setPlatformName(readPortalString(portal, 'displayName', 'Sharia Decrees — National Portal'));
      setSupportEmail(readPortalString(portal, 'supportEmail', 'platform-ops@decrees.gov.af'));
      setSessionMinutes(
        Math.max(5, Math.min(240, readSecurityNumber(portal, 'sessionTimeoutMinutes', 30))),
      );
      const lang = readPortalString(portal, 'defaultLocale', 'en');
      setLanguage(lang === 'fa' || lang === 'ps' ? lang : 'en');
      const tz = readPortalString(portal, 'timezone', 'Asia/Kabul');
      setTimezone(tz === 'Asia/Tehran' ? 'Asia/Tehran' : tz === 'UTC' ? 'UTC' : 'Asia/Kabul');
      const df = readPortalString(portal, 'dateFormat', 'DD/MM/YYYY');
      setDateFormat(
        df === 'MM/DD/YYYY' ? 'MM/DD/YYYY' : df === 'YYYY-MM-DD' ? 'YYYY-MM-DD' : 'DD/MM/YYYY',
      );
      setReauthDestructive(readSecurityBool(sec, 'reauthDestructive', true));
      setApiCeiling(readSecurityNumber(sec, 'apiCeilingPerMinute', 8000));

      setMaintenanceEmail(readPortalString(portal, 'maintenanceDistributionEmail', 'noc@decrees.gov.af'));
      setNotifyDeptOnIncident(readSecurityBool(sec, 'notifyDeptOnIncident', true));

      setAuditRetention(readSecurityNumber(feat, 'auditRetentionDays', 365));
      setCentralBackup(feat.centralBackupCadence === 'weekly' ? 'weekly' : 'daily');
      setColdArchive(readSecurityBool(feat, 'coldArchiveSnapshots', true));
      const rp = readSecurityString(feat, 'replicaPosture', 'primary+dr');
      setReplicaRegions(rp === 'primary' ? 'primary' : rp === 'active-active' ? 'active-active' : 'primary+dr');
    } else if (r.ok) {
      setLoadError('Empty settings response from server.');
    } else {
      setLoadError(r.message);
    }
    setLoading(false);
  }, [currentSerialized]);

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Once we're done loading, freeze the baseline for dirty tracking.
    if (!loading && original === '') {
      setOriginal(currentSerialized);
    }
  }, [loading, original, currentSerialized]);

  const onReset = useCallback(() => {
    if (!original) return;
    try {
      const o = JSON.parse(original) as Record<string, unknown>;
      setPlatformName(String(o.platformName ?? platformName));
      setSupportEmail(String(o.supportEmail ?? supportEmail));
      setSessionMinutes(Number(o.sessionMinutes ?? sessionMinutes));
      setLanguage((o.language as typeof language) ?? language);
      setTimezone((o.timezone as typeof timezone) ?? timezone);
      setDateFormat((o.dateFormat as typeof dateFormat) ?? dateFormat);
      setReauthDestructive(Boolean(o.reauthDestructive));
      setApiCeiling(Number(o.apiCeiling ?? apiCeiling));
      setMaintenanceEmail(String(o.maintenanceEmail ?? maintenanceEmail));
      setNotifyDeptOnIncident(Boolean(o.notifyDeptOnIncident));
      setAuditRetention(Number(o.auditRetention ?? auditRetention));
      setCentralBackup((o.centralBackup as typeof centralBackup) ?? centralBackup);
      setColdArchive(Boolean(o.coldArchive));
      setReplicaRegions((o.replicaRegions as typeof replicaRegions) ?? replicaRegions);
    } catch {
      /* ignore */
    }
  }, [
    original,
    platformName,
    supportEmail,
    sessionMinutes,
    language,
    timezone,
    dateFormat,
    apiCeiling,
    maintenanceEmail,
    auditRetention,
    centralBackup,
    replicaRegions,
  ]);

  const onSave = useCallback(async () => {
    const token = await getJwtAccessToken();
    if (!token) {
      Toast.show({ type: 'info', text1: t('toastSignInApiTitle'), text2: t('toastSignInApiBody') });
      return;
    }
    setSaving(true);
    try {
      const body: PatchSettingsBody = {
        portal: {
          displayName: platformName,
          supportEmail,
          sessionTimeoutMinutes: sessionMinutes,
          defaultLocale: language,
          timezone,
          dateFormat,
          maintenanceDistributionEmail: maintenanceEmail,
        },
        security: {
          reauthDestructive,
          apiCeilingPerMinute: apiCeiling,
          notifyDeptOnIncident,
        },
        features: {
          auditRetentionDays: auditRetention,
          centralBackupCadence: centralBackup,
          coldArchiveSnapshots: coldArchive,
          replicaPosture: replicaRegions,
        },
      };
      const r = await patchSettings(body);
      if (!r.ok) {
        Toast.show({ type: 'error', text1: t('toastSaveFailedTitle'), text2: r.message });
        return;
      }
      Toast.show({ type: 'success', text1: t('toastPlatformSavedTitle') });
      setOriginal(currentSerialized);
    } finally {
      setSaving(false);
    }
  }, [
    t,
    platformName,
    supportEmail,
    sessionMinutes,
    language,
    timezone,
    dateFormat,
    maintenanceEmail,
    reauthDestructive,
    apiCeiling,
    notifyDeptOnIncident,
    auditRetention,
    centralBackup,
    coldArchive,
    replicaRegions,
    currentSerialized,
  ]);

  const onRunBackupNow = useCallback(async () => {
    const token = await getJwtAccessToken();
    if (!token) {
      Toast.show({ type: 'info', text1: t('toastSignInApiTitle'), text2: t('toastSignInApiBody') });
      return;
    }
    setBackupBusy(true);
    try {
      const r = await triggerSystemAdminBackup();
      if (!r.ok) {
        Toast.show({ type: 'error', text1: 'Backup failed', text2: r.message });
        return;
      }
      const base = getApiBaseUrl().replace(/\/$/, '');
      const rel = typeof r.data?.url === 'string' ? r.data.url : '';
      const full = rel.startsWith('http') ? rel : `${base}${rel}`;
      Toast.show({ type: 'success', text1: 'Backup created', text2: full.length > 200 ? `${full.slice(0, 200)}…` : full });
    } finally {
      setBackupBusy(false);
    }
  }, [t]);

  const onSendAnnouncement = useCallback(async () => {
    const token = await getJwtAccessToken();
    if (!token) {
      Toast.show({ type: 'info', text1: t('toastSignInApiTitle'), text2: t('toastSignInApiBody') });
      return;
    }
    const title = announceTitle.trim();
    const body = announceBody.trim();
    if (!title || !body) {
      Toast.show({ type: 'error', text1: 'Missing fields', text2: 'Enter title and body.' });
      return;
    }
    setAnnounceBusy(true);
    try {
      const r = await postSystemAdminAnnounce({ title, body, audience: announceAudience });
      if (!r.ok) {
        Toast.show({ type: 'error', text1: 'Announce failed', text2: r.message });
        return;
      }
      const payload = r.data as Record<string, unknown>;
      const n = typeof payload.inserted === 'number' ? payload.inserted : 0;
      Toast.show({
        type: 'success',
        text1: 'Announcement sent',
        text2: `${n} notification(s) queued.`,
      });
      setAnnounceTitle('');
      setAnnounceBody('');
    } finally {
      setAnnounceBusy(false);
    }
  }, [announceTitle, announceBody, announceAudience, t]);

  if (loading) {
    return (
      <View style={styles.loadingBlock}>
        <ActivityIndicator size="large" color={Brand.green} />
        <Text style={styles.loadingText} maxFontSizeMultiplier={1.15}>
          {`Node ${serverNode} · v${appVersion}`}
        </Text>
      </View>
    );
  }

  const tabs: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'platform', label: t('superSettingsTabPlatform'), icon: 'globe-outline' },
    { id: 'security', label: t('superSettingsTabSecurity'), icon: 'shield-outline' },
    { id: 'alerts', label: t('superSettingsTabAlerts'), icon: 'notifications-outline' },
    { id: 'data', label: t('superSettingsTabData'), icon: 'server-outline' },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.root, isDark && { backgroundColor: '#030712' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.headerBlock}>
          <Text style={[styles.heading, isDark && { color: palette.neutral100 }]} maxFontSizeMultiplier={1.2}>
            {t('superSettingsHeading')}
          </Text>
          <Text style={[styles.subheading, isDark && { color: palette.neutral400 }]} maxFontSizeMultiplier={1.2}>
            {t('superSettingsSubtitle')}
          </Text>
        </View>

        {loadError ? (
          <View
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: isDark ? '#422006' : '#FFFBEB',
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: isDark ? '#854D0E' : '#FCD34D',
            }}>
            <Text
              style={{ fontSize: 12, color: isDark ? '#FDE68A' : '#B45309', fontWeight: '700' }}
              maxFontSizeMultiplier={1.15}>
              {t('saOfflineDataBanner')}
            </Text>
            <Text
              style={{ fontSize: 10, color: isDark ? '#FCD34D' : '#92400E', marginTop: 6 }}
              maxFontSizeMultiplier={1.15}>
              {loadError}
            </Text>
            <AppPressable
              onPress={() => void loadSettings()}
              style={{ marginTop: 10, alignSelf: 'flex-start' }}
              accessibilityRole="button"
              accessibilityLabel={t('certRetry')}>
              <Text style={{ color: Brand.green, fontWeight: '800', fontSize: 12 }}>{t('certRetry')}</Text>
            </AppPressable>
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}>
          {tabs.map((tab) => {
            const on = tab.id === activeTab;
            return (
              <AppPressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabBtn, on && styles.tabBtnOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}>
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={on ? palette.white : FormColors.subtitle}
                />
                <Text
                  style={[styles.tabText, on && styles.tabTextOn]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.15}>
                  {tab.label}
                </Text>
              </AppPressable>
            );
          })}
        </ScrollView>

        {activeTab === 'platform' ? (
          <>
            <Card
              icon="globe-outline"
              title={t('superSettingsIdentityTitle')}
              sub={t('superSettingsIdentitySub')}>
              <FieldBlock
                title={t('superSettingsDisplayName')}
                sub={t('superSettingsDisplayNameSub')}>
                <TextInput
                  value={platformName}
                  onChangeText={setPlatformName}
                  style={styles.input}
                  maxFontSizeMultiplier={1.15}
                />
              </FieldBlock>
              <FieldBlock
                title={t('superSettingsOpsContact')}
                sub={t('superSettingsOpsContactSub')}>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="at-outline" size={16} color={palette.neutral400} />
                  <TextInput
                    value={supportEmail}
                    onChangeText={setSupportEmail}
                    style={[styles.input, styles.inputFlex]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    maxFontSizeMultiplier={1.15}
                  />
                </View>
              </FieldBlock>
            </Card>

            <Card
              icon="options-outline"
              title={t('superSettingsLocaleTitle')}
              sub={t('superSettingsLocaleSub')}>
              <FieldBlock
                title={t('superSettingsSessionTimeout')}
                sub={t('superSettingsSessionTimeoutSub')}>
                <Select
                  current={t('superSettingsMinutes', { n: number(sessionMinutes) })}
                  options={SESSION_OPTIONS.map((n) => ({
                    key: String(n),
                    label: t('superSettingsMinutes', { n: number(n) }),
                  }))}
                  selected={String(sessionMinutes)}
                  onSelect={(k) => setSessionMinutes(Number(k))}
                />
              </FieldBlock>
              <FieldBlock
                title={t('superSettingsInterfaceLanguage')}
                sub={t('superSettingsInterfaceLanguageSub')}>
                <Select
                  current={
                    language === 'fa'
                      ? t('superSettingsLangDari')
                      : language === 'ps'
                        ? t('superSettingsLangPashto')
                        : t('superSettingsLangEnglish')
                  }
                  options={[
                    { key: 'en', label: t('superSettingsLangEnglish') },
                    { key: 'fa', label: t('superSettingsLangDari') },
                    { key: 'ps', label: t('superSettingsLangPashto') },
                  ]}
                  selected={language}
                  onSelect={(k) => setLanguage(k as typeof language)}
                />
              </FieldBlock>
              <FieldBlock title={t('superSettingsTimezone')} sub={t('superSettingsTimezoneSub')}>
                <Select
                  current={
                    timezone === 'Asia/Tehran'
                      ? t('superSettingsTimeTehran')
                      : timezone === 'UTC'
                        ? t('superSettingsTimeUtc')
                        : t('superSettingsTimeKabul')
                  }
                  options={[
                    { key: 'Asia/Kabul', label: t('superSettingsTimeKabul') },
                    { key: 'Asia/Tehran', label: t('superSettingsTimeTehran') },
                    { key: 'UTC', label: t('superSettingsTimeUtc') },
                  ]}
                  selected={timezone}
                  onSelect={(k) => setTimezone(k as typeof timezone)}
                />
              </FieldBlock>
              <FieldBlock title={t('superSettingsDateFormat')} sub={t('superSettingsDateFormatSub')}>
                <Select
                  current={dateFormat}
                  options={(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const).map((k) => ({
                    key: k,
                    label: k,
                  }))}
                  selected={dateFormat}
                  onSelect={(k) => setDateFormat(k as typeof dateFormat)}
                />
              </FieldBlock>
              <ToggleRow
                title={t('superSettingsReauth')}
                sub={t('superSettingsReauthSub')}
                value={reauthDestructive}
                onChange={setReauthDestructive}
              />
            </Card>
          </>
        ) : null}

        {activeTab === 'security' ? (
          <>
            <Card
              icon="lock-closed-outline"
              title={t('superSettingsApiTitle')}
              sub={t('superSettingsApiSub')}>
              <Text style={styles.rowTitle} maxFontSizeMultiplier={1.2}>
                {t('superSettingsApiCeiling', { n: number(apiCeiling) })}
              </Text>
              <Text style={styles.rowSub} maxFontSizeMultiplier={1.2}>
                {t('superSettingsApiCeilingSub')}
              </Text>
              <Slider ticks={API_TICKS} value={apiCeiling} onChange={setApiCeiling} />
            </Card>
          </>
        ) : null}

        {activeTab === 'alerts' ? (
          <>
            <Card
              icon="notifications-outline"
              title={t('superSettingsBroadcastTitle')}
              sub={t('superSettingsBroadcastSub')}>
              <FieldBlock
                title={t('superSettingsMaintEmail')}
                sub={t('superSettingsMaintEmailSub')}>
                <TextInput
                  value={maintenanceEmail}
                  onChangeText={setMaintenanceEmail}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxFontSizeMultiplier={1.15}
                />
              </FieldBlock>
            </Card>

            <Card
              icon="cloud-outline"
              title={t('superSettingsIncidentTitle')}
              sub={t('superSettingsIncidentSub')}>
              <ToggleRow
                title={t('superSettingsNotifyDept')}
                sub={t('superSettingsNotifyDeptSub')}
                value={notifyDeptOnIncident}
                onChange={setNotifyDeptOnIncident}
              />
            </Card>
          </>
        ) : null}

        {activeTab === 'data' ? (
          <>
            <Card
              icon="server-outline"
              title={t('superSettingsAuditTitle')}
              sub={t('superSettingsAuditSub')}>
              <FieldBlock
                title={t('superSettingsAuditRetention')}
                sub={t('superSettingsAuditRetentionSub')}>
                <Select
                  current={t('superSettingsAuditRetentionLabel', { n: number(auditRetention) })}
                  options={RETENTION_OPTIONS.map((n) => ({
                    key: String(n),
                    label: t('superSettingsAuditRetentionLabel', { n: number(n) }),
                  }))}
                  selected={String(auditRetention)}
                  onSelect={(k) => setAuditRetention(Number(k))}
                />
              </FieldBlock>
            </Card>

            <Card
              icon="layers-outline"
              title={t('superSettingsBackupTitle')}
              sub={t('superSettingsBackupSub')}>
              <FieldBlock
                title={t('superSettingsBackupCadence')}
                sub={t('superSettingsBackupCadenceSub')}>
                <Segmented
                  options={[
                    { key: 'daily', label: t('superSettingsCadenceDaily') },
                    { key: 'weekly', label: t('superSettingsCadenceWeekly') },
                  ]}
                  selected={centralBackup}
                  onSelect={(k) => setCentralBackup(k as typeof centralBackup)}
                />
              </FieldBlock>
              <ToggleRow
                title={t('superSettingsColdArchive')}
                sub={t('superSettingsColdArchiveSub')}
                value={coldArchive}
                onChange={setColdArchive}
              />
              <FieldBlock
                title={t('superSettingsReplicaPosture')}
                sub={t('superSettingsReplicaPostureSub')}>
                <Select
                  current={
                    replicaRegions === 'primary'
                      ? t('superSettingsReplicaPrimaryOnly')
                      : replicaRegions === 'active-active'
                        ? t('superSettingsReplicaActiveActive')
                        : t('superSettingsReplicaPrimaryDr')
                  }
                  options={[
                    { key: 'primary+dr', label: t('superSettingsReplicaPrimaryDr') },
                    { key: 'primary', label: t('superSettingsReplicaPrimaryOnly') },
                    { key: 'active-active', label: t('superSettingsReplicaActiveActive') },
                  ]}
                  selected={replicaRegions}
                  onSelect={(k) => setReplicaRegions(k as typeof replicaRegions)}
                />
              </FieldBlock>
            </Card>

            <Card
              icon="cloud-download-outline"
              title="Database backup"
              sub="Writes a capped JSON snapshot under server uploads (same as POST /system-admin/backup).">
              <AppPressable
                onPress={() => void onRunBackupNow()}
                disabled={backupBusy}
                style={[styles.saveBtn, backupBusy && styles.btnDisabled, { marginTop: spacing.sm }]}
                accessibilityRole="button"
                accessibilityLabel="Run backup now">
                {backupBusy ? (
                  <ActivityIndicator color={palette.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-download-outline" size={16} color={palette.white} />
                    <Text style={styles.saveTxt} maxFontSizeMultiplier={1.1}>
                      Run backup now
                    </Text>
                  </>
                )}
              </AppPressable>
            </Card>

            <Card
              icon="megaphone-outline"
              title="System announcement"
              sub="Creates inbox notifications on the server (POST /system-admin/announce).">
              <FieldBlock title="Title" sub="Shown as the notification headline.">
                <TextInput
                  value={announceTitle}
                  onChangeText={setAnnounceTitle}
                  style={styles.input}
                  placeholder="Title"
                  placeholderTextColor={palette.neutral400}
                  maxFontSizeMultiplier={1.15}
                />
              </FieldBlock>
              <FieldBlock title="Message" sub="Full message body.">
                <TextInput
                  value={announceBody}
                  onChangeText={setAnnounceBody}
                  style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                  placeholder="Message"
                  placeholderTextColor={palette.neutral400}
                  multiline
                  maxFontSizeMultiplier={1.12}
                />
              </FieldBlock>
              <FieldBlock title="Audience" sub="Who receives the notification.">
                <Segmented
                  options={[
                    { key: 'all', label: 'All users' },
                    { key: 'public_only', label: 'Public only' },
                  ]}
                  selected={announceAudience}
                  onSelect={(k) => setAnnounceAudience(k as typeof announceAudience)}
                />
              </FieldBlock>
              <AppPressable
                onPress={() => void onSendAnnouncement()}
                disabled={announceBusy}
                style={[styles.saveBtn, announceBusy && styles.btnDisabled, { marginTop: spacing.sm }]}
                accessibilityRole="button"
                accessibilityLabel="Send announcement">
                {announceBusy ? (
                  <ActivityIndicator color={palette.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={16} color={palette.white} />
                    <Text style={styles.saveTxt} maxFontSizeMultiplier={1.1}>
                      Send announcement
                    </Text>
                  </>
                )}
              </AppPressable>
            </Card>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.actionBar}>
        <Text style={styles.savedHint} numberOfLines={1} maxFontSizeMultiplier={1.15}>
          {t('settingsBarSaved')}
        </Text>
        <AppPressable
          onPress={onReset}
          disabled={!dirty}
          style={[styles.resetBtn, !dirty && styles.btnDisabled]}
          accessibilityRole="button"
          accessibilityLabel={t('settingsBarReset')}>
          <Ionicons name="refresh-outline" size={14} color={FormColors.title} />
          <Text style={styles.resetTxt} maxFontSizeMultiplier={1.15}>
            {t('settingsBarReset')}
          </Text>
        </AppPressable>
        <AppPressable
          onPress={() => void onSave()}
          disabled={!dirty || saving}
          style={[styles.saveBtn, (!dirty || saving) && styles.btnDisabled]}
          accessibilityRole="button"
          accessibilityLabel={t('settingsBarSave')}>
          <Ionicons name="save-outline" size={14} color={palette.white} />
          <Text style={styles.saveTxt} maxFontSizeMultiplier={1.15}>
            {t('settingsBarSave')}
          </Text>
        </AppPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/* -------- Primitives -------- */

function Card({
  icon,
  title,
  sub,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, shadowCard()]}>
      <View style={styles.cardHead}>
        <Ionicons name={icon} size={18} color={Brand.green} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>
            {title}
          </Text>
          <Text style={styles.cardSub} maxFontSizeMultiplier={1.2}>
            {sub}
          </Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function FieldBlock({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.rowTitle} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      {sub ? (
        <Text style={styles.rowSub} maxFontSizeMultiplier={1.2}>
          {sub}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function ToggleRow({
  title,
  sub,
  value,
  onChange,
}: {
  title: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        {sub ? (
          <Text style={styles.rowSub} maxFontSizeMultiplier={1.2}>
            {sub}
          </Text>
        ) : null}
      </View>
      <AppSwitch value={value} onValueChange={onChange} accessibilityLabel={title} />
    </View>
  );
}

function Segmented({
  options,
  selected,
  onSelect,
}: {
  options: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  return (
    <View style={styles.segWrap}>
      {options.map((o) => {
        const on = o.key === selected;
        return (
          <AppPressable
            key={o.key}
            onPress={() => onSelect(o.key)}
            style={[styles.segBtn, on && styles.segBtnOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}>
            <Text
              style={[styles.segTxt, on && styles.segTxtOn]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}>
              {o.label}
            </Text>
          </AppPressable>
        );
      })}
    </View>
  );
}

function Select({
  current,
  options,
  selected,
  onSelect,
}: {
  current: string;
  options: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const saUi = useSystemAdminUiOptional();
  const isDark = saUi?.isDarkMode ?? false;
  const [open, setOpen] = useState(false);

  const triggerBg = isDark ? '#1E293B' : palette.neutral100;
  const menuBg = isDark ? '#0F172A' : palette.white;
  const borderCol = isDark ? '#334155' : palette.neutral200;
  const labelCol = isDark ? palette.neutral100 : palette.neutral900;
  const mutedIcon = isDark ? palette.neutral400 : palette.neutral500;
  const selectedWash = isDark ? 'rgba(0, 136, 255, 0.22)' : palette.rowActiveWash;
  const hoverWash = isDark ? '#334155' : palette.neutral100;
  const pressedWash = isDark ? '#475569' : palette.neutral200;

  return (
    <View style={styles.selectWrap}>
      <AppPressable
        onPress={() => setOpen((v) => !v)}
        style={[
          styles.select,
          {
            backgroundColor: triggerBg,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: borderCol,
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}>
        <Text style={[styles.selectText, { color: labelCol }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
          {current}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={mutedIcon} />
      </AppPressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent>
        <Pressable
          style={styles.selectModalOuter}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss">
          <View
            onStartShouldSetResponder={() => true}
            style={[
              styles.selectModalSheet,
              shadowCard(),
              {
                backgroundColor: menuBg,
                borderColor: borderCol,
              },
            ]}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={options.length > 6}>
              {options.map((o, index) => {
                const isOn = o.key === selected;
                const showDivider = index < options.length - 1;
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => {
                      onSelect(o.key);
                      setOpen(false);
                    }}
                    style={(state) => {
                      const hovered =
                        Platform.OS === 'web' &&
                        'hovered' in state &&
                        (state as { hovered?: boolean }).hovered === true;
                      return [
                        styles.selectModalRow,
                        showDivider && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: borderCol,
                        },
                        isOn && { backgroundColor: selectedWash },
                        !isOn && hovered && { backgroundColor: hoverWash },
                        state.pressed && { backgroundColor: pressedWash },
                      ];
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isOn }}>
                    <Text
                      style={[
                        styles.selectModalRowLabel,
                        { color: isOn ? Brand.green : labelCol },
                        isOn && styles.selectModalRowLabelOn,
                      ]}
                      numberOfLines={2}>
                      {o.label}
                    </Text>
                    {isOn ? <Ionicons name="checkmark-circle" size={20} color={Brand.green} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Slider({
  ticks,
  value,
  onChange,
}: {
  ticks: readonly number[];
  value: number;
  onChange: (v: number) => void;
}) {
  const min = ticks[0];
  const max = ticks[ticks.length - 1];
  const pct = ((value - min) / Math.max(1, max - min)) * 100;

  return (
    <View style={styles.sliderWrap}>
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${Math.max(4, Math.min(100, pct))}%` }]} />
        <View style={[styles.sliderThumb, { left: `${Math.max(0, Math.min(96, pct))}%` }]} />
      </View>
      <View style={styles.sliderTicks}>
        {ticks.map((tk) => (
          <AppPressable
            key={tk}
            onPress={() => onChange(tk)}
            style={styles.sliderTick}
            accessibilityRole="button">
            <Text
              style={[styles.sliderTickTxt, tk === value && styles.sliderTickTxtOn]}
              maxFontSizeMultiplier={1.15}>
              {tk.toLocaleString()}
            </Text>
          </AppPressable>
        ))}
      </View>
    </View>
  );
}

/* -------- Styles -------- */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: FormColors.pageMuted,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing['4xl'] + spacing['2xl'],
    gap: spacing.md,
  },

  loadingBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: FormColors.pageMuted,
  },
  loadingText: {
    color: FormColors.subtitle,
    fontWeight: '600',
    fontSize: 12,
  },

  headerBlock: {
    gap: spacing.xxs,
  },
  heading: {
    ...typography.title,
    color: FormColors.title,
  },
  subheading: {
    fontSize: 13,
    color: FormColors.subtitle,
    fontWeight: '500',
  },

  /* tabs */
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.neutral200,
    minHeight: touchTarget.min,
  },
  tabBtnOn: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: FormColors.subtitle,
    letterSpacing: 0.2,
  },
  tabTextOn: {
    color: palette.white,
  },

  /* card */
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    gap: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutral200,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: FormColors.title,
  },
  cardSub: {
    marginTop: 2,
    fontSize: 12,
    color: FormColors.subtitle,
    fontWeight: '500',
  },

  /* field */
  fieldBlock: {
    gap: spacing.xxs,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: FormColors.title,
  },
  rowSub: {
    marginTop: 2,
    fontSize: 12,
    color: FormColors.subtitle,
    fontWeight: '500',
    marginBottom: spacing.xxs,
  },
  input: {
    backgroundColor: palette.neutral100,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: FormColors.title,
    minHeight: touchTarget.min,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.neutral100,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.min,
  },
  inputFlex: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.neutral200,
  },

  /* segmented */
  segWrap: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.lg,
    backgroundColor: palette.neutral100,
  },
  segBtn: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    minHeight: 38,
  },
  segBtnOn: {
    backgroundColor: palette.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  segTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: FormColors.subtitle,
  },
  segTxtOn: {
    color: FormColors.title,
  },

  /* select — trigger uses dynamic colors in `Select`; menu is a centered modal (layering + web scroll-safe). */
  selectWrap: {
    position: 'relative',
    zIndex: 1,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minHeight: touchTarget.min,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  selectModalOuter: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: palette.overlayScrim,
  },
  selectModalSheet: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    maxHeight: '72%',
  },
  selectModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    minHeight: touchTarget.min,
  },
  selectModalRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  selectModalRowLabelOn: {
    fontWeight: '800',
  },

  /* slider */
  sliderWrap: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.neutral200,
    overflow: 'visible',
  },
  sliderFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.green,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Brand.green,
    marginLeft: -10,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  sliderTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sliderTick: {
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.xxs,
  },
  sliderTickTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.neutral400,
  },
  sliderTickTxtOn: {
    color: Brand.green,
  },

  /* errors */
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: Brand.green,
  },
  retryBtnText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '800',
  },

  /* action bar */
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.neutral200,
    backgroundColor: palette.white,
  },
  savedHint: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: palette.neutral500,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.neutral200,
    backgroundColor: palette.white,
  },
  resetTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: FormColors.title,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: Brand.green,
  },
  saveTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.white,
    letterSpacing: 0.3,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
