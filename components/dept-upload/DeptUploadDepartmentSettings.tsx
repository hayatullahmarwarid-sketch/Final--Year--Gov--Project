import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DeptUploadSettingsAccessTab } from '@/components/dept-upload/DeptUploadSettingsAccessTab';
import { DeptUploadSettingsNotificationsTab } from '@/components/dept-upload/DeptUploadSettingsNotificationsTab';
import { DeptUploadSettingsStorageTab } from '@/components/dept-upload/DeptUploadSettingsStorageTab';
import { AppSwitch } from '@/components/ui/AppSwitch';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { type AppLanguageId } from '@/constants/languages';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useDeptUploadSettingsOptional } from '@/contexts/dept-upload-settings-context';
import {
  useDeptUploadThemeColorsOptional,
  useDeptUploadUiOptional,
} from '@/contexts/dept-upload-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { showToast } from '@/lib/adapters/toast';
import {
  getDeptUploadSettings,
  patchDeptUploadSettings,
  type DeptUploadSettingsDto,
} from '@/lib/api/dept-upload-settings';
import { FormColors, palette } from '@/lib/theme';

const STORAGE_KEY = '@sharia_dept_upload_settings_v1';

const GREEN = palette.primary;

type TabKey = 'general' | 'access' | 'notifications' | 'storage';

type FormState = {
  deptName: string;
  deptCode: string;
  refPrefix: string;
  contactEmail: string;
  sessionTimeoutMinutes: number;
  sequenceYearlyReset: boolean;
  interfaceLanguage: 'fa' | 'ps';
  timezone: 'Asia/Kabul';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
};

const INITIAL: FormState = {
  deptName: 'Decree Upload Department',
  deptCode: 'DUD',
  refPrefix: 'SHD',
  contactEmail: 'admin@decrees.gov.af',
  sessionTimeoutMinutes: 30,
  sequenceYearlyReset: true,
  interfaceLanguage: 'ps',
  timezone: 'Asia/Kabul',
  dateFormat: 'DD/MM/YYYY',
};

const SESSION_OPTS = [15, 30, 45, 60, 120] as const;
const LANG_OPTS = [
  { key: 'fa' as const, label: 'Dari' },
  { key: 'ps' as const, label: 'Pashto' },
] as const;
const DATE_OPTS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const;

type PickerKey =
  | 'sessionTimeoutMinutes'
  | 'interfaceLanguage'
  | 'dateFormat'
  | null;

function mergeLoadedSettings(raw: unknown): FormState {
  if (!raw || typeof raw !== 'object') return INITIAL;
  const r = raw as Partial<FormState>;
  return {
    deptName: typeof r.deptName === 'string' ? r.deptName : INITIAL.deptName,
    deptCode: typeof r.deptCode === 'string' ? r.deptCode : INITIAL.deptCode,
    refPrefix: typeof r.refPrefix === 'string' ? r.refPrefix : INITIAL.refPrefix,
    contactEmail: typeof r.contactEmail === 'string' ? r.contactEmail : INITIAL.contactEmail,
    sessionTimeoutMinutes:
      typeof r.sessionTimeoutMinutes === 'number'
        ? Math.min(120, Math.max(15, r.sessionTimeoutMinutes))
        : INITIAL.sessionTimeoutMinutes,
    sequenceYearlyReset:
      typeof r.sequenceYearlyReset === 'boolean' ? r.sequenceYearlyReset : INITIAL.sequenceYearlyReset,
    interfaceLanguage:
      r.interfaceLanguage === 'fa' || r.interfaceLanguage === 'ps'
        ? r.interfaceLanguage
        : INITIAL.interfaceLanguage,
    timezone: 'Asia/Kabul',
    dateFormat:
      r.dateFormat === 'MM/DD/YYYY' || r.dateFormat === 'YYYY-MM-DD' || r.dateFormat === 'DD/MM/YYYY'
        ? r.dateFormat
        : INITIAL.dateFormat,
  };
}

function interfaceLanguageToAppLanguageId(code: FormState['interfaceLanguage']): AppLanguageId {
  if (code === 'fa') return 'prs';
  return code;
}

export function DeptUploadDepartmentSettings() {
  const c = useDeptUploadThemeColorsOptional();
  const deptUi = useDeptUploadUiOptional();
  const isDeptDark = deptUi?.isDarkMode ?? false;
  const { setLanguage, language: appLanguage } = useAppLanguage();
  const settingsBus = useDeptUploadSettingsOptional();
  const { t } = useAppTranslation();
  const [tab, setTab] = useState<TabKey>('general');
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saved, setSaved] = useState<FormState>(INITIAL);
  const [picker, setPicker] = useState<PickerKey>(null);

  const applyServerSettings = useCallback((dto: DeptUploadSettingsDto) => {
    const merged: FormState = {
      deptName: dto.department?.deptName ?? INITIAL.deptName,
      deptCode: dto.department?.deptCode ?? INITIAL.deptCode,
      refPrefix: dto.department?.refPrefix ?? INITIAL.refPrefix,
      contactEmail: dto.department?.contactEmail ?? INITIAL.contactEmail,
      sessionTimeoutMinutes: Math.max(
        15,
        Math.min(120, dto.system?.sessionTimeoutMinutes ?? INITIAL.sessionTimeoutMinutes),
      ),
      sequenceYearlyReset: dto.system?.sequenceYearlyReset !== false,
      interfaceLanguage: dto.system?.interfaceLanguage ?? INITIAL.interfaceLanguage,
      timezone: 'Asia/Kabul',
      dateFormat: dto.system?.dateFormat ?? INITIAL.dateFormat,
    };
    setForm(merged);
    setSaved(merged);

    // Keep global i18n language synchronized with backend settings.
    const nextGlobal = interfaceLanguageToAppLanguageId(merged.interfaceLanguage);
    if (nextGlobal !== appLanguage) setLanguage(nextGlobal);
  }, [appLanguage, setLanguage]);

  // Hydrate from API (real source), with AsyncStorage fallback for offline continuity.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await getDeptUploadSettings();
        if (!cancelled && r.ok) {
          const dto = r.data;
          const merged: FormState = {
            deptName: dto.department?.deptName ?? INITIAL.deptName,
            deptCode: dto.department?.deptCode ?? INITIAL.deptCode,
            refPrefix: dto.department?.refPrefix ?? INITIAL.refPrefix,
            contactEmail: dto.department?.contactEmail ?? INITIAL.contactEmail,
            sessionTimeoutMinutes: Math.max(
              15,
              Math.min(120, dto.system?.sessionTimeoutMinutes ?? INITIAL.sessionTimeoutMinutes),
            ),
            sequenceYearlyReset: dto.system?.sequenceYearlyReset !== false,
            interfaceLanguage: dto.system?.interfaceLanguage ?? INITIAL.interfaceLanguage,
            timezone: 'Asia/Kabul',
            dateFormat: dto.system?.dateFormat ?? INITIAL.dateFormat,
          };
          setForm(merged);
          setSaved(merged);
          try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {
            // ignore
          }
          return;
        }
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || cancelled) return;
        const parsed = mergeLoadedSettings(JSON.parse(raw));
        setForm(parsed);
        setSaved(parsed);
      } catch {
        // Malformed storage payload — keep INITIAL defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyServerSettings]);

  const reset = useCallback(() => {
    setForm(saved);
  }, [saved]);

  const save = useCallback(async () => {
    try {
      const r = await patchDeptUploadSettings({
        department: {
          deptName: form.deptName,
          deptCode: form.deptCode,
          refPrefix: form.refPrefix,
          contactEmail: form.contactEmail,
        },
        system: {
          sessionTimeoutMinutes: form.sessionTimeoutMinutes,
          sequenceYearlyReset: form.sequenceYearlyReset,
          interfaceLanguage: form.interfaceLanguage,
          timezone: 'Asia/Kabul',
          dateFormat: form.dateFormat,
        },
      });
      if (!r.ok) {
        showToast(r.message, 'error');
        return;
      }
      applyServerSettings(r.data);
      await settingsBus?.refresh();
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      } catch {
        // ignore
      }
      setLanguage(interfaceLanguageToAppLanguageId(form.interfaceLanguage));
      showToast(t('deptSettingsSaved'), 'success');
    } catch {
      showToast(t('toastSaveFailedTitle'), 'info');
    }
  }, [applyServerSettings, form, setLanguage, settingsBus, t]);

  const pickerOptions = useMemo(() => {
    switch (picker) {
      case 'sessionTimeoutMinutes':
        return SESSION_OPTS.map(String);
      case 'interfaceLanguage':
        return LANG_OPTS.map((l) => l.key);
      case 'dateFormat':
        return [...DATE_OPTS];
      default:
        return [];
    }
  }, [picker]);

  const applyPicker = (value: string) => {
    if (!picker) return;
    setForm((f) => {
      switch (picker) {
        case 'sessionTimeoutMinutes':
          return {
            ...f,
            sessionTimeoutMinutes: Math.max(15, Math.min(120, Number(value) || INITIAL.sessionTimeoutMinutes)),
          };
        case 'interfaceLanguage':
          return { ...f, interfaceLanguage: value === 'fa' ? 'fa' : 'ps' };
        case 'dateFormat':
          return {
            ...f,
            dateFormat:
              value === 'MM/DD/YYYY' ? 'MM/DD/YYYY' : value === 'YYYY-MM-DD' ? 'YYYY-MM-DD' : 'DD/MM/YYYY',
          };
        default:
          return f;
      }
    });
    setPicker(null);
  };

  const cardShell = [styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }];
  const inputShell = [styles.input, { backgroundColor: c.inputBg, borderColor: c.cardBorder, color: c.textPrimary }];
  const selectShell = [styles.select, { backgroundColor: c.inputBg, borderColor: c.cardBorder }];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: c.textPrimary }]}>{t('deptSettingsTitle')}</Text>
        <Text style={[styles.pageSub, { color: c.textMuted }]}>
          {t('deptSettingsSubtitle')}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {(
            [
              { key: 'general' as const, label: t('deptSettingsTabGeneral'), icon: 'settings-outline' as const },
              { key: 'access' as const, label: t('deptSettingsTabAccess'), icon: 'people-outline' as const },
              { key: 'notifications' as const, label: t('deptSettingsTabNotifications'), icon: 'notifications-outline' as const },
              { key: 'storage' as const, label: t('deptSettingsTabStorage'), icon: 'server-outline' as const },
            ] as const
          ).map((t) => {
            const selected = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[
                  styles.tab,
                  selected ? styles.tabOn : { backgroundColor: c.cardBg, borderColor: c.cardBorder },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}>
                <Ionicons name={t.icon} size={16} color={selected ? palette.white : c.textMuted} />
                <Text style={[styles.tabTxt, selected && styles.tabTxtOn, !selected && { color: c.textSecondary }]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {tab === 'access' ? (
          <DeptUploadSettingsAccessTab />
        ) : tab === 'notifications' ? (
          <DeptUploadSettingsNotificationsTab />
        ) : tab === 'storage' ? (
          <DeptUploadSettingsStorageTab />
        ) : tab === 'general' ? (
          <>
            <View style={cardShell}>
              <View style={styles.cardHead}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name="business-outline" size={20} color={GREEN} />
                </View>
                <View style={styles.cardHeadTxt}>
                  <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('deptSettingsCardDeptInfoTitle')}</Text>
                  <Text style={[styles.cardSub, { color: c.textMuted }]}>{t('deptSettingsCardDeptInfoSub')}</Text>
                </View>
              </View>

              <Field label={t('deptSettingsDeptNameLabel')} hint={t('deptSettingsDeptNameHint')}>
                <TextInput
                  value={form.deptName}
                  onChangeText={(v) => setForm((f) => ({ ...f, deptName: v }))}
                  style={inputShell}
                  placeholderTextColor={c.textMuted}
                />
              </Field>
              <Field label={t('deptSettingsDeptCodeLabel')} hint={t('deptSettingsDeptCodeHint')}>
                <TextInput
                  value={form.deptCode}
                  onChangeText={(v) => setForm((f) => ({ ...f, deptCode: v }))}
                  style={inputShell}
                  placeholderTextColor={c.textMuted}
                />
              </Field>
              <Field label={t('deptSettingsRefPrefixLabel')} hint={t('deptSettingsRefPrefixHint')}>
                <TextInput
                  value={form.refPrefix}
                  onChangeText={(v) => setForm((f) => ({ ...f, refPrefix: v }))}
                  style={inputShell}
                  placeholderTextColor={c.textMuted}
                />
              </Field>
              <Field label={t('deptSettingsContactEmailLabel')} hint={t('deptSettingsContactEmailHint')}>
                <View style={[styles.emailRow, { borderColor: c.cardBorder, backgroundColor: c.inputBg }]}>
                  <Ionicons name="at" size={18} color={c.textMuted} style={styles.emailAt} />
                  <TextInput
                    value={form.contactEmail}
                    onChangeText={(v) => setForm((f) => ({ ...f, contactEmail: v }))}
                    style={[styles.emailInput, { color: c.textPrimary }]}
                    placeholderTextColor={c.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </Field>
            </View>

            <View style={cardShell}>
              <View style={styles.cardHead}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name="options-outline" size={20} color={GREEN} />
                </View>
                <View style={styles.cardHeadTxt}>
                  <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('deptSettingsCardSystemTitle')}</Text>
                  <Text style={[styles.cardSub, { color: c.textMuted }]}>{t('deptSettingsCardSystemSub')}</Text>
                </View>
              </View>

              <Field label={t('deptSettingsSessionTimeoutLabel')} hint={t('deptSettingsSessionTimeoutHint')}>
                <Pressable style={selectShell} onPress={() => setPicker('sessionTimeoutMinutes')}>
                  <Text style={[styles.selectTxt, { color: c.textPrimary }]}>
                    {t('superSettingsMinutes', { n: form.sessionTimeoutMinutes })}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={c.textMuted} />
                </Pressable>
              </Field>
              <Field label={t('deptSettingsSequenceYearlyLabel')} hint={t('deptSettingsSequenceYearlyHint')}>
                <View style={[styles.switchRow, { borderColor: c.cardBorder, backgroundColor: c.inputBg }]}>
                  <AppSwitch
                    value={form.sequenceYearlyReset}
                    onValueChange={(v) => setForm((f) => ({ ...f, sequenceYearlyReset: v }))}
                    accessibilityLabel={t('deptSettingsSequenceYearlyLabel')}
                  />
                </View>
              </Field>
              <Field label={t('superSettingsInterfaceLanguage')} hint={t('deptSettingsInterfaceLanguageHint')}>
                <Pressable style={selectShell} onPress={() => setPicker('interfaceLanguage')}>
                  <Text style={[styles.selectTxt, { color: c.textPrimary }]}>
                    {form.interfaceLanguage === 'fa'
                      ? t('superSettingsLangDari')
                      : t('superSettingsLangPashto')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={c.textMuted} />
                </Pressable>
              </Field>
              <Field label={t('superSettingsTimezone')} hint={t('superSettingsTimezoneSub')}>
                <View style={[styles.select, { backgroundColor: c.inputBg, borderColor: c.cardBorder, opacity: 0.9 }]}>
                  <Text style={[styles.selectTxt, { color: c.textPrimary }]}>{t('deptTimezoneAsiaKabul')}</Text>
                  <Ionicons name="lock-closed-outline" size={16} color={c.textMuted} />
                </View>
              </Field>
              <Field label={t('superSettingsDateFormat')} hint={t('superSettingsDateFormatSub')}>
                <Pressable style={selectShell} onPress={() => setPicker('dateFormat')}>
                  <Text style={[styles.selectTxt, { color: c.textPrimary }]}>{form.dateFormat}</Text>
                  <Ionicons name="chevron-down" size={18} color={c.textMuted} />
                </Pressable>
              </Field>
            </View>

            <View style={[styles.footer, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
              <Text style={[styles.footerStatus, { color: c.textMuted }]}>{t('settingsBarSaved')}</Text>
              <View style={styles.footerBtns}>
                <Pressable
                  onPress={reset}
                  style={[styles.btnGhost, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}
                  accessibilityRole="button">
                  <Ionicons name="refresh-outline" size={18} color={c.textPrimary} />
                  <Text style={[styles.btnGhostTxt, { color: c.textPrimary }]}>{t('settingsBarReset')}</Text>
                </Pressable>
                <Pressable onPress={save} style={styles.btnPri} accessibilityRole="button">
                  <Ionicons name="save-outline" size={18} color={palette.white} />
                  <Text style={styles.btnPriTxt}>{t('settingsBarSave')}</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={picker != null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.modalOuter} onPress={() => setPicker(null)}>
          <View
            onStartShouldSetResponder={() => true}
            style={[styles.modalCard, { backgroundColor: c.dropdownBg, borderColor: c.cardBorder }]}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={pickerOptions.length > 8}>
              {pickerOptions.map((opt, index) => {
                const isCurrent =
                  picker === 'interfaceLanguage'
                    ? form.interfaceLanguage === opt
                    : picker === 'sessionTimeoutMinutes'
                      ? String(form.sessionTimeoutMinutes) === opt
                      : picker === 'dateFormat'
                        ? form.dateFormat === opt
                        : false;
                const showDivider = index < pickerOptions.length - 1;
                const washCurrent = isDeptDark ? 'rgba(0, 136, 255, 0.22)' : 'rgba(0, 136, 255, 0.10)';
                return (
                  <Pressable
                    key={opt}
                    style={({ pressed }) => [
                      styles.modalRow,
                      showDivider && [styles.modalRowDivider, { borderBottomColor: c.rowDivider }],
                      isCurrent && { backgroundColor: washCurrent },
                      pressed && { backgroundColor: c.cardBgMuted },
                    ]}
                    onPress={() => applyPicker(opt)}>
                    <Text style={[styles.modalRowTxt, { color: c.textPrimary }, isCurrent && styles.modalRowTxtCurrent]}>
                      {picker === 'interfaceLanguage'
                        ? opt === 'fa'
                          ? t('superSettingsLangDari')
                          : t('superSettingsLangPashto')
                        : picker === 'sessionTimeoutMinutes'
                          ? t('superSettingsMinutes', { n: Number(opt) })
                          : opt}
                    </Text>
                    {isCurrent ? <Ionicons name="checkmark-circle" size={22} color={GREEN} /> : null}
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  const c = useDeptUploadThemeColorsOptional();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.textPrimary }]}>{label}</Text>
      <Text style={[styles.fieldHint, { color: c.textMuted }]}>{hint}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 14,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  pageSub: {
    fontSize: 13,
    fontWeight: '500',
    color: DeptUploadDash.mutedText,
    marginTop: 4,
    lineHeight: 18,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    paddingRight: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DeptUploadDash.cardBorder,
    backgroundColor: palette.white,
  },
  tabOn: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  tabTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: FormColors.subtitle,
  },
  tabTxtOn: {
    color: palette.white,
  },
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
  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: FormColors.title },
  fieldHint: { fontSize: 12, fontWeight: '500', color: DeptUploadDash.mutedText, marginTop: 4, marginBottom: 8, lineHeight: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: FormColors.title,
    backgroundColor: '#F9FAFB',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  emailAt: { marginRight: 4 },
  emailInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: FormColors.title,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
  },
  selectTxt: { fontSize: 14, fontWeight: '600', color: FormColors.title, flex: 1 },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderEdge: { fontSize: 12, fontWeight: '600', color: FormColors.subtitle },
  sliderTouch: {
    position: 'relative',
    height: 36,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: GREEN,
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GREEN,
    borderWidth: 2,
    borderColor: palette.white,
    marginLeft: -10,
    top: '50%',
    marginTop: -10,
    ...DeptUploadDash.shadow,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(11, 79, 46, 0.35)',
    backgroundColor: 'rgba(11, 79, 46, 0.08)',
  },
  chipTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN,
    textTransform: 'uppercase',
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
  footerStatus: { fontSize: 13, fontWeight: '500', color: FormColors.subtitle, flex: 1, minWidth: 140 },
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
  modalOuter: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  modalCard: {
    backgroundColor: palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: '56%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  modalRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalRowTxt: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: FormColors.title,
  },
  modalRowTxtCurrent: {
    fontWeight: '800',
  },
});
