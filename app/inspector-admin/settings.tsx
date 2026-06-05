import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppPressable } from '@/components/ui/AppPressable';
import { AppSwitch } from '@/components/ui/AppSwitch';
import type { FieldInspector } from '@/data/inspector-admin-store';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useInspectorAdminWorkspace } from '@/hooks/use-inspector-admin-workspace';
import { showToast } from '@/lib/adapters/toast';
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

const SETTINGS_STORAGE_KEY = '@sharia_inspector_admin_settings_v1';
const ADMIN_CREDENTIALS_KEY = '@sharia_inspector_admin_credentials_v1';
const DEFAULT_USERNAME = 'inspectoradmin';
const DEFAULT_PASSWORD = 'admin123';

type TabKey = 'admin' | 'team' | 'notifications' | 'capture';

type NotificationSettings = {
  newTask: boolean;
  overdue: boolean;
  certificate: boolean;
};

type CaptureSettings = {
  imageQuality: 'high' | 'balanced' | 'low';
  largeUploadsWifi: boolean;
};

type StoredSettings = {
  notifications: NotificationSettings;
  capture: CaptureSettings;
};

const DEFAULT_SETTINGS: StoredSettings = {
  notifications: {
    newTask: true,
    overdue: true,
    certificate: true,
  },
  capture: {
    imageQuality: 'balanced',
    largeUploadsWifi: false,
  },
};

export default function InspectorAdminSettingsScreen() {
  const { t } = useAppTranslation();
  const { inspectors, usesLiveApi, actions } = useInspectorAdminWorkspace();
  const { accountKey } = useAuthSession();

  const [tab, setTab] = useState<TabKey>('admin');

  // Local credentials (demo-only).
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [storedPassword, setStoredPassword] = useState(DEFAULT_PASSWORD);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [credsSubmitting, setCredsSubmitting] = useState(false);
  const [credsError, setCredsError] = useState<string | null>(null);

  const [settings, setSettings] = useState<StoredSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<StoredSettings>(DEFAULT_SETTINGS);

  // Load stored settings + creds.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rawSettings, rawCreds] = await Promise.all([
          AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
          AsyncStorage.getItem(ADMIN_CREDENTIALS_KEY),
        ]);
        if (cancelled) return;
        if (rawSettings) {
          const parsed = JSON.parse(rawSettings) as Partial<StoredSettings>;
          const merged: StoredSettings = {
            notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications ?? {}) },
            capture: { ...DEFAULT_SETTINGS.capture, ...(parsed.capture ?? {}) },
          };
          setSettings(merged);
          setOriginalSettings(merged);
        }
        if (rawCreds) {
          const c = JSON.parse(rawCreds) as { username?: string; password?: string };
          if (c.username) setUsername(c.username);
          if (c.password) setStoredPassword(c.password);
        }
      } catch {
        /* ignore — fall back to defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(originalSettings),
    [settings, originalSettings],
  );

  const onReset = useCallback(() => setSettings(originalSettings), [originalSettings]);

  const onSave = useCallback(async () => {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      setOriginalSettings(settings);
      showToast(t('settingsToastSaved'), 'success');
    } catch {
      showToast('Could not save settings.', 'error');
    }
  }, [settings, t]);

  const onSaveCredentials = useCallback(async () => {
    setCredsError(null);
    if (currentPwd.trim() !== storedPassword) {
      setCredsError(t('settingsCurrentPasswordRequired'));
      return;
    }
    setCredsSubmitting(true);
    const nextUsername = username.trim() || DEFAULT_USERNAME;
    const nextPassword = newPwd.trim() ? newPwd : storedPassword;
    try {
      await AsyncStorage.setItem(
        ADMIN_CREDENTIALS_KEY,
        JSON.stringify({ username: nextUsername, password: nextPassword }),
      );
      setStoredPassword(nextPassword);
      setCurrentPwd('');
      setNewPwd('');
      showToast(t('settingsPasswordUpdated'), 'success');
    } catch {
      showToast('Could not save credentials.', 'error');
    } finally {
      setCredsSubmitting(false);
    }
  }, [currentPwd, newPwd, storedPassword, t, username]);

  const displayedSignedInAs = accountKey?.replace(/^inspadm_/, '') || username;

  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'admin', label: t('settingsTabAdminAccount'), icon: 'people-outline' },
    { key: 'team', label: t('settingsTabTeam'), icon: 'phone-portrait-outline' },
    { key: 'notifications', label: t('settingsTabNotifications'), icon: 'notifications-outline' },
    { key: 'capture', label: t('settingsTabFieldEvidence'), icon: 'tablet-portrait-outline' },
  ];

  const showActionBar = tab !== 'admin' && tab !== 'team';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.headerBlock}>
          <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
            {t('settingsHeading')}
          </Text>
          <Text style={styles.subheading} maxFontSizeMultiplier={1.2}>
            {t('settingsSubtitle')}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}>
          {tabs.map((tt) => {
            const on = tt.key === tab;
            return (
              <AppPressable
                key={tt.key}
                onPress={() => setTab(tt.key)}
                style={[styles.tabBtn, on && styles.tabBtnOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={tt.label}>
                <Ionicons
                  name={tt.icon}
                  size={14}
                  color={on ? palette.white : FormColors.subtitle}
                />
                <Text
                  style={[styles.tabText, on && styles.tabTextOn]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.15}>
                  {tt.label}
                </Text>
              </AppPressable>
            );
          })}
        </ScrollView>

        {tab === 'admin' ? (
          <AdminTab
            username={username}
            setUsername={setUsername}
            currentPwd={currentPwd}
            setCurrentPwd={setCurrentPwd}
            newPwd={newPwd}
            setNewPwd={setNewPwd}
            submitting={credsSubmitting}
            errorMsg={credsError}
            displayedSignedInAs={displayedSignedInAs}
            onSave={() => void onSaveCredentials()}
          />
        ) : null}

        {tab === 'team' ? (
          <TeamTab
            inspectors={inspectors}
            usesLiveApi={usesLiveApi}
            onToggleActive={async (id, next) => {
              if (usesLiveApi) {
                const r = await actions.setInspectorActive(id, next);
                if (!r.ok) {
                  showToast(r.message, 'error');
                }
                return;
              }
              const { inspectorAdminActions } = await import('@/data/inspector-admin-store');
              inspectorAdminActions.setFieldInspectorActive(id, next);
            }}
          />
        ) : null}

        {tab === 'notifications' ? (
          <NotificationsTab
            value={settings.notifications}
            onChange={(n) => setSettings((s) => ({ ...s, notifications: n }))}
          />
        ) : null}

        {tab === 'capture' ? (
          <CaptureTab
            value={settings.capture}
            onChange={(c) => setSettings((s) => ({ ...s, capture: c }))}
          />
        ) : null}
      </ScrollView>

      {showActionBar ? (
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
            disabled={!dirty}
            style={[styles.saveBtn, !dirty && styles.btnDisabled]}
            accessibilityRole="button"
            accessibilityLabel={t('settingsBarSave')}>
            <Ionicons name="save-outline" size={14} color={palette.white} />
            <Text style={styles.saveTxt} maxFontSizeMultiplier={1.15}>
              {t('settingsBarSave')}
            </Text>
          </AppPressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/* -------- Admin account tab -------- */
function AdminTab(props: {
  username: string;
  setUsername: (v: string) => void;
  currentPwd: string;
  setCurrentPwd: (v: string) => void;
  newPwd: string;
  setNewPwd: (v: string) => void;
  submitting: boolean;
  errorMsg: string | null;
  displayedSignedInAs: string;
  onSave: () => void;
}) {
  const { t } = useAppTranslation();
  const initials = props.username.slice(0, 2).toUpperCase() || 'IN';

  return (
    <>
      <View style={[styles.card, shadowCard()]}>
        <View style={styles.cardHead}>
          <Ionicons name="people-outline" size={18} color={Brand.green} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>
              {t('settingsAdminCardTitle')}
            </Text>
            <Text style={styles.cardSub} maxFontSizeMultiplier={1.2}>
              {t('settingsAdminCardSub')}
            </Text>
          </View>
        </View>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText} maxFontSizeMultiplier={1.1}>
              {initials}
            </Text>
          </View>
        </View>
        <Text style={styles.adminName} maxFontSizeMultiplier={1.2}>
          {t('settingsAdminPersonaName')}
        </Text>
        <Text style={styles.signedInTxt} maxFontSizeMultiplier={1.15}>
          {t('settingsAdminSignedIn')}{' '}
          <Text style={styles.signedInBold}>{props.displayedSignedInAs}</Text>
        </Text>
        <Text style={styles.adminDescription} maxFontSizeMultiplier={1.2}>
          {t('settingsAdminDescription')}
        </Text>
      </View>

      <View style={[styles.card, shadowCard()]}>
        <View style={styles.cardHead}>
          <Ionicons name="lock-closed-outline" size={18} color={FormColors.subtitle} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>
              {t('settingsSignInCardTitle')}
            </Text>
            <Text style={styles.cardSub} maxFontSizeMultiplier={1.2}>
              {t('settingsSignInCardSub')}
            </Text>
          </View>
        </View>

        <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.15}>
          {t('settingsUsernameLabel')}
        </Text>
        <TextInput
          value={props.username}
          onChangeText={props.setUsername}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          maxFontSizeMultiplier={1.15}
        />

        <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]} maxFontSizeMultiplier={1.15}>
          {t('settingsCurrentPasswordLabel')}
        </Text>
        <TextInput
          value={props.currentPwd}
          onChangeText={props.setCurrentPwd}
          style={[styles.input, styles.currentPwdInput]}
          secureTextEntry
          maxFontSizeMultiplier={1.15}
        />

        <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]} maxFontSizeMultiplier={1.15}>
          <Text>{t('settingsNewPasswordLabel')}</Text>
        </Text>
        <TextInput
          value={props.newPwd}
          onChangeText={props.setNewPwd}
          style={styles.input}
          secureTextEntry
          maxFontSizeMultiplier={1.15}
        />
        <Text style={styles.helperTxt} maxFontSizeMultiplier={1.15}>
          {t('settingsNewPasswordHelper')}
        </Text>

        {props.errorMsg ? (
          <Text style={styles.errorText} maxFontSizeMultiplier={1.15}>
            {props.errorMsg}
          </Text>
        ) : null}

        <AppPressable
          onPress={props.onSave}
          disabled={props.submitting}
          style={[styles.primaryBtn, props.submitting && styles.btnDisabled]}
          accessibilityRole="button"
          accessibilityLabel={t('settingsSaveChanges')}>
          <Text style={styles.primaryBtnTxt} maxFontSizeMultiplier={1.15}>
            {t('settingsSaveChanges')}
          </Text>
        </AppPressable>
      </View>

      <View style={styles.noticeCard}>
        <Ionicons name="information-circle-outline" size={18} color={FormColors.subtitle} />
        <Text style={styles.noticeTxt} maxFontSizeMultiplier={1.15}>
          {t('settingsCredentialsNotice')}
        </Text>
      </View>
    </>
  );
}

/* -------- Team tab -------- */
function TeamTab({
  inspectors,
  usesLiveApi,
  onToggleActive,
}: {
  inspectors: FieldInspector[];
  usesLiveApi: boolean;
  onToggleActive: (id: string, next: boolean) => Promise<void>;
}) {
  const { t } = useAppTranslation();
  void usesLiveApi;

  return (
    <>
      <View style={styles.infoCallout}>
        <Text style={styles.infoCalloutTxt} maxFontSizeMultiplier={1.15}>
          {t('settingsTeamInfo')}
        </Text>
      </View>

      <View style={[styles.card, shadowCard()]}>
        <View style={styles.cardHead}>
          <Ionicons name="phone-portrait-outline" size={18} color={Brand.green} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>
              {t('settingsTeamCardTitle')}
            </Text>
            <Text style={styles.cardSub} maxFontSizeMultiplier={1.2}>
              {t('settingsTeamCardSub')}
            </Text>
          </View>
        </View>

        <View style={styles.teamHeaderRow}>
          <Text style={[styles.teamHeaderCell, { flex: 2 }]} maxFontSizeMultiplier={1.2}>
            {t('settingsColMember').toUpperCase()}
          </Text>
          <Text style={[styles.teamHeaderCell, { flex: 1, textAlign: 'center' }]} maxFontSizeMultiplier={1.2}>
            {t('settingsColRole').toUpperCase()}
          </Text>
          <Text
            style={[styles.teamHeaderCell, { width: 72, textAlign: 'right' }]}
            maxFontSizeMultiplier={1.2}>
            {t('settingsColActive').toUpperCase()}
          </Text>
        </View>

        {inspectors.map((i) => (
          <View key={i.id} style={styles.teamRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.teamName} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {i.name}
              </Text>
              <Text style={styles.teamRegion} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {i.regionLabel}
              </Text>
              <Text style={styles.teamDevice} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {(i.device === 'tablet'
                  ? t('settingsDeviceIpadTablet')
                  : t('settingsDevicePhone')
                ).toUpperCase()}
              </Text>
            </View>
            <View style={[styles.roleChip, { alignSelf: 'center' }]}>
              <Text style={styles.roleChipTxt} maxFontSizeMultiplier={1.15}>
                {t('settingsRoleInspector')}
              </Text>
            </View>
            <View style={{ width: 72, alignItems: 'flex-end' }}>
              <AppSwitch
                value={i.active}
                onValueChange={(v) => void onToggleActive(i.id, v)}
                accessibilityLabel={`${i.name} active`}
              />
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

/* -------- Notifications tab -------- */
function NotificationsTab({
  value,
  onChange,
}: {
  value: NotificationSettings;
  onChange: (next: NotificationSettings) => void;
}) {
  const { t } = useAppTranslation();

  return (
    <View style={[styles.card, shadowCard()]}>
      <View style={styles.cardHead}>
        <Ionicons name="mail-outline" size={18} color={Brand.green} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>
            {t('settingsNotificationsCardTitle')}
          </Text>
          <Text style={styles.cardSub} maxFontSizeMultiplier={1.2}>
            {t('settingsNotificationsCardSub')}
          </Text>
        </View>
      </View>

      <ToggleRow
        title={t('settingsNotifNewTask')}
        sub={t('settingsNotifNewTaskSub')}
        value={value.newTask}
        onChange={(v) => onChange({ ...value, newTask: v })}
      />
      <ToggleRow
        title={t('settingsNotifOverdue')}
        sub={t('settingsNotifOverdueSub')}
        value={value.overdue}
        onChange={(v) => onChange({ ...value, overdue: v })}
      />
      <ToggleRow
        title={t('settingsNotifCertificate')}
        sub={t('settingsNotifCertificateSub')}
        value={value.certificate}
        onChange={(v) => onChange({ ...value, certificate: v })}
      />
    </View>
  );
}

/* -------- Capture tab -------- */
function CaptureTab({
  value,
  onChange,
}: {
  value: CaptureSettings;
  onChange: (next: CaptureSettings) => void;
}) {
  const { t } = useAppTranslation();

  return (
    <>
      <View style={[styles.card, shadowCard()]}>
        <View style={styles.cardHead}>
          <Ionicons name="phone-portrait-outline" size={18} color={Brand.green} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>
              {t('settingsCaptureCardTitle')}
            </Text>
            <Text style={styles.cardSub} maxFontSizeMultiplier={1.2}>
              {t('settingsCaptureCardSub')}
            </Text>
          </View>
        </View>

        <Text style={[styles.rowTitle, { marginTop: spacing.md }]} maxFontSizeMultiplier={1.2}>
          {t('settingsImageQuality')}
        </Text>
        <Text style={styles.rowSub} maxFontSizeMultiplier={1.2}>
          {t('settingsImageQualitySub')}
        </Text>
        <Segmented
          options={[
            { key: 'high', label: t('settingsQualityHigh') },
            { key: 'balanced', label: t('settingsQualityBalanced') },
            { key: 'low', label: t('settingsQualityLow') },
          ]}
          selected={value.imageQuality}
          onSelect={(k) => onChange({ ...value, imageQuality: k as CaptureSettings['imageQuality'] })}
        />
      </View>

      <View style={[styles.card, shadowCard()]}>
        <View style={styles.cardHead}>
          <Ionicons name="cloud-upload-outline" size={18} color={Brand.green} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>
              {t('settingsSyncCardTitle')}
            </Text>
            <Text style={styles.cardSub} maxFontSizeMultiplier={1.2}>
              {t('settingsSyncCardSub')}
            </Text>
          </View>
        </View>

        <ToggleRow
          title={t('settingsLargeUploadsWifi')}
          sub={t('settingsLargeUploadsWifiSub')}
          value={value.largeUploadsWifi}
          onChange={(v) => onChange({ ...value, largeUploadsWifi: v })}
        />
      </View>
    </>
  );
}

/* -------- Reusable primitives -------- */

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
      <AppSwitch value={value} onValueChange={onChange} />
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

function Select<T extends string>({
  open,
  setOpen,
  current,
  options,
  selected,
  onSelect,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  current: string;
  options: { key: T; label: string }[];
  selected: T;
  onSelect: (key: T) => void;
}) {
  return (
    <View>
      <AppPressable
        onPress={() => setOpen(!open)}
        style={styles.select}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}>
        <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
          {current}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={FormColors.subtitle}
        />
      </AppPressable>
      {open ? (
        <View style={[styles.selectMenu, shadowCard()]}>
          {options.map((o) => {
            const on = o.key === selected;
            return (
              <AppPressable
                key={o.key}
                onPress={() => {
                  onSelect(o.key);
                  setOpen(false);
                }}
                style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}>
                <Text
                  style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                  numberOfLines={1}>
                  {o.label}
                </Text>
                {on ? <Ionicons name="checkmark" size={16} color={Brand.green} /> : null}
              </AppPressable>
            );
          })}
        </View>
      ) : null}
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
            accessibilityRole="button"
            accessibilityLabel={String(tk)}>
            <Text
              style={[styles.sliderTickTxt, tk === value && styles.sliderTickTxtOn]}
              maxFontSizeMultiplier={1.15}>
              {tk}
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
  content: {
    padding: spacing.md,
    paddingBottom: spacing['4xl'] + spacing['2xl'],
    gap: spacing.md,
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

  /* row primitives */
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
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: FormColors.title,
    marginBottom: spacing.xxs,
  },
  helperTxt: {
    marginTop: spacing.xxs,
    fontSize: 11,
    color: palette.neutral500,
    fontWeight: '500',
  },
  errorText: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
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
  currentPwdInput: {
    backgroundColor: palette.primaryWash,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.neutral200,
  },

  /* admin */
  avatarRow: {
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.white,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adminName: {
    fontSize: 17,
    fontWeight: '800',
    color: FormColors.title,
    textAlign: 'left',
  },
  signedInTxt: {
    fontSize: 13,
    color: FormColors.subtitle,
    fontWeight: '500',
  },
  signedInBold: {
    color: FormColors.title,
    fontWeight: '800',
  },
  adminDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: palette.neutral500,
    fontWeight: '500',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.neutral100,
  },
  noticeTxt: {
    flex: 1,
    fontSize: 12,
    color: FormColors.subtitle,
    fontWeight: '500',
    lineHeight: 17,
  },
  primaryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: Brand.green,
    marginTop: spacing.xs,
  },
  primaryBtnTxt: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnDisabled: {
    opacity: 0.5,
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

  /* select */
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.neutral100,
    borderRadius: radius.md,
    minHeight: touchTarget.min,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: FormColors.title,
  },
  selectMenu: {
    marginTop: spacing.xxs,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    overflow: 'hidden',
  },
  selectMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  selectMenuRowActive: {
    backgroundColor: palette.rowActiveWash,
  },
  selectMenuText: {
    fontSize: 15,
    fontWeight: '500',
    color: FormColors.title,
  },
  selectMenuTextActive: {
    color: Brand.green,
    fontWeight: '700',
  },

  /* info callout */
  infoCallout: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FFFBEB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  infoCalloutTxt: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: '#78350F',
  },

  /* team */
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutral200,
  },
  teamHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.neutral500,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutral100,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '800',
    color: FormColors.title,
  },
  teamRegion: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: '500',
    color: FormColors.subtitle,
  },
  teamDevice: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: palette.neutral400,
  },
  roleChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: palette.neutral100,
  },
  roleChipTxt: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: FormColors.subtitle,
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

  /* action bar (sticky footer) */
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
});
