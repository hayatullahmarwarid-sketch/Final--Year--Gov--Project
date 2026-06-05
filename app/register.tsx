import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { OptionPickerModal } from '@/components/auth/OptionPickerModal';
import {
  PasswordStrengthBar,
  scorePasswordStrength,
  type PasswordStrength,
} from '@/components/auth/PasswordStrengthBar';
import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useUserProfile } from '@/contexts/user-profile-context';
import { useAuthFormKeyboardPadding } from '@/hooks/use-auth-form-keyboard-padding';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useClearSensitiveOnWebRestore } from '@/hooks/use-clear-sensitive-on-web-restore';
import { showToast } from '@/lib/adapters/toast';
import { postBackendRegister, postEmailVerificationSend } from '@/lib/api/auth-public-flow';
import { getHealth } from '@/lib/api/health';
import { mapBackendRoleKeyToAuthSessionRole } from '@/lib/auth-backend-role-map';
import { getApiBaseUrl } from '@/constants/api';
import { appLanguageIdToBackendPreferred } from '@/lib/language-backend-map';
import { isFullPersonNameValid } from '@/lib/validation/full-name';
import { isLoginEmailValid } from '@/lib/validation/login-email';
import { isPasswordPolicyValid } from '@/lib/validation/password-policy';
import { districtsForProvince, PROVINCES } from '@/data/afghanistan-regions';

/**
 * Layer: `RegisterScreen` — Create account (single language from app preference).
 */
export default function RegisterScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardPad = useAuthFormKeyboardPadding();
  const { t } = useAppTranslation();
  const horizontal = width < 360 ? 16 : width >= 768 ? Math.max(32, (width - 560) / 2) : 20;
  const maxW = Math.min(560, width - horizontal * 2);
  const { saveRegisteredPassword, setProfile } = useUserProfile();
  const { signInFromBackendJwt } = useAuthSession();
  const { language } = useAppLanguage();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [provinceId, setProvinceId] = useState<string | null>(null);
  const [provinceLabel, setProvinceLabel] = useState('');
  const [districtLabel, setDistrictLabel] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [provinceOpen, setProvinceOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formLocked = bootLoading || Boolean(bootError);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBootLoading(true);
      setBootError(null);
      const base = getApiBaseUrl();
      if (!base) {
        setBootError(t('alertNotConfiguredMessage'));
        setBootLoading(false);
        return;
      }
      const health = await getHealth();
      if (cancelled) return;
      if (!health.ok) {
        setBootError(health.message);
        setBootLoading(false);
        return;
      }
      setBootLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bootAttempt, t]);

  useClearSensitiveOnWebRestore(
    useCallback(() => {
      setPassword('');
      setConfirmPassword('');
      setEmail('');
    }, []),
  );

  const districtOptions = useMemo(() => {
    return districtsForProvince(provinceId).map((d, i) => ({
      id: `${provinceId}-${i}`,
      label: d,
    }));
  }, [provinceId]);

  const strength: PasswordStrength = useMemo(() => scorePasswordStrength(password), [password]);

  const passwordsMatch =
    confirmPassword.length > 0 && password.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password.length > 0 && password !== confirmPassword;

  const emailOk = useMemo(() => isLoginEmailValid(email), [email]);
  const fullNameOk = useMemo(() => isFullPersonNameValid(fullName), [fullName]);

  const canSubmit = useMemo(() => {
    if (!isFullPersonNameValid(fullName)) return false;
    if (!emailOk) return false;
    if (!provinceId) return false;
    if (!isPasswordPolicyValid(password)) return false;
    if (password !== confirmPassword) return false;
    return true;
  }, [fullName, emailOk, provinceId, password, confirmPassword]);

  const onProvinceSelect = (id: string, label: string) => {
    setProvinceId(id);
    setProvinceLabel(label);
    setDistrictLabel('');
  };

  const onDistrictSelect = (_id: string, label: string) => {
    setDistrictLabel(label);
  };

  const onRegister = async () => {
    if (!canSubmit || submitting || formLocked) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Persist local profile fields BEFORE account scope changes so auth migration can carry them into
      // the newly-scoped storage. Otherwise these values would remain in the pre-auth scope.
      setProfile({
        fullName: fullName.trim(),
        province: provinceLabel.trim(),
        district: districtLabel.trim(),
        gender,
        createdAt: new Date().toISOString(),
      });

      const reg = await postBackendRegister({
        email: email.trim().toLowerCase(),
        password,
        displayName: fullName.trim(),
        preferredLanguage: appLanguageIdToBackendPreferred(language),
      });
      if (!reg.ok) {
        setSubmitError(reg.message);
        return;
      }
      const sessionRole = mapBackendRoleKeyToAuthSessionRole(reg.data.user.role);
      if (!sessionRole) {
        setSubmitError(t('registerUnexpectedAccountType'));
        return;
      }
      await signInFromBackendJwt({
        accessToken: reg.data.accessToken,
        refreshToken: reg.data.refreshToken,
        role: sessionRole,
        emailForScope: reg.data.user.email,
        preferredLanguage: reg.data.user.preferredLanguage,
      });
      await saveRegisteredPassword(password);
      const ve = reg.data.verificationEmail;
      const serverSent = reg.data.verificationEmailDelivered === true || ve?.delivered === true;
      if (!serverSent) {
        if (ve?.reason === 'smtp_not_configured') {
          showToast(t('registerEmailVerificationOff'), 'info');
        } else if (ve?.reason === 'send_failed') {
          showToast(t('registerEmailVerificationSendFailed'), 'error');
        } else {
          const sendRes = await postEmailVerificationSend({ email: reg.data.user.email });
          if (!sendRes.ok) {
            showToast(
              sendRes.status === 503
                ? t('registerEmailVerificationUnavailable')
                : sendRes.message,
              sendRes.status === 503 ? 'info' : 'error',
            );
          }
        }
      }
      showToast(t('registerAccountCreated'), 'success');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: '/verify-email',
        params: { email: reg.data.user.email },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onRetryBoot = useCallback(() => {
    setBootAttempt((n) => n + 1);
  }, []);

  const provinceItems = PROVINCES.map((p) => ({ id: p.id, label: p.name }));

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <View style={[styles.topBar, { paddingHorizontal: horizontal }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('a11yGoBack')}
              hitSlop={12}
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/login' as Href);
              }}
              style={styles.backBtn}>
              <Ionicons
                name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'}
                size={26}
                color={FormColors.title}
              />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={[
              styles.scrollInner,
              {
                paddingHorizontal: horizontal,
                paddingBottom: 32 + keyboardPad + insets.bottom,
              },
            ]}>
            <View style={[styles.hero, { maxWidth: maxW, width: '100%', alignSelf: 'center' }]}>
              <View style={styles.avatarRing}>
                <MaterialCommunityIcons name="account-plus" size={40} color={Brand.green} />
              </View>
              <Text style={styles.screenTitle} maxFontSizeMultiplier={1.25}>
                {t('registerTitle')}
              </Text>
            </View>

            <View style={{ maxWidth: maxW, width: '100%', alignSelf: 'center' }}>
              {bootLoading ? (
                <ActivityIndicator
                  accessibilityLabel={t('a11yCheckingService')}
                  color={Brand.green}
                  style={styles.bootSpinner}
                />
              ) : null}
              {bootError ? (
                <View style={styles.apiErrorBlock}>
                  <Text style={styles.apiErrorText} maxFontSizeMultiplier={1.2}>
                    {bootError}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('a11yRetryConnection')}
                    onPress={onRetryBoot}
                    style={({ pressed }) => [styles.retryOutlineBtn, pressed && styles.retryOutlinePressed]}>
                    <Text style={styles.retryOutlineLabel} maxFontSizeMultiplier={1.2}>
                      {t('certRetry')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              {submitError && !bootError ? (
                <View style={styles.apiErrorBlock}>
                  <Text style={styles.apiErrorText} maxFontSizeMultiplier={1.2}>
                    {submitError}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('a11yRetryRegistration')}
                    disabled={!canSubmit || submitting || formLocked}
                    onPress={() => {
                      setSubmitError(null);
                      if (canSubmit && !submitting && !formLocked) void onRegister();
                    }}
                    style={({ pressed }) => [
                      styles.retryOutlineBtn,
                      (!canSubmit || submitting || formLocked) && styles.retryOutlineDisabled,
                      pressed && canSubmit && !submitting && !formLocked && styles.retryOutlinePressed,
                    ]}>
                    <Text style={styles.retryOutlineLabel} maxFontSizeMultiplier={1.2}>
                      {t('certRetry')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Full name */}
              <Text style={styles.label} maxFontSizeMultiplier={1.2}>
                {t('registerFullName')}
              </Text>
              <View
                style={[
                  styles.inputWrapPlain,
                  fullName.trim().length > 0 && fullNameOk && styles.inputWrapPlainValid,
                  fullName.trim().length > 0 && !fullNameOk && styles.inputWrapPlainInvalid,
                ]}>
                <TextInput
                  style={styles.inputFlexPlain}
                  placeholder={t('registerFullNamePh')}
                  placeholderTextColor={FormColors.placeholder}
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!formLocked}
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="name"
                  autoComplete="name"
                />
                {fullName.trim().length > 0 && fullNameOk ? (
                  <Ionicons name="checkmark-circle" size={22} color={FormColors.successBright} />
                ) : null}
              </View>
              {fullName.trim().length > 0 && !fullNameOk ? (
                <Text style={styles.fieldError} maxFontSizeMultiplier={1.15}>
                  {t('registerFullNameInvalid')}
                </Text>
              ) : null}

              <Text style={[styles.label, styles.labelSp]} maxFontSizeMultiplier={1.2}>
                {t('registerEmail')}
              </Text>
              <View style={[styles.inputWrapPlain, emailOk && styles.inputWrapPlainValid]}>
                <TextInput
                  style={styles.inputFlexPlain}
                  placeholder={t('registerEmailPh')}
                  placeholderTextColor={FormColors.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  editable={!formLocked}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  autoComplete="email"
                />
                {emailOk ? (
                  <Ionicons name="checkmark-circle" size={22} color={FormColors.successBright} />
                ) : null}
              </View>

              {/* Province */}
              <Text style={[styles.label, styles.labelSp]} maxFontSizeMultiplier={1.2}>
                {t('registerProvince')}
              </Text>
              <Pressable
                style={[styles.selectRow, formLocked && styles.selectDisabled]}
                disabled={formLocked}
                onPress={() => !formLocked && setProvinceOpen(true)}
                accessibilityRole="button">
                <Text
                  style={[
                    styles.selectText,
                    !provinceLabel && styles.selectPlaceholder,
                  ]}
                  maxFontSizeMultiplier={1.2}>
                  {provinceLabel || t('registerProvincePh')}
                </Text>
                <Ionicons name="chevron-down" size={22} color={FormColors.label} />
              </Pressable>

              {/* District optional */}
              <Text style={[styles.label, styles.labelSp]} maxFontSizeMultiplier={1.2}>
                {t('registerDistrictOptional')}
              </Text>
              <Pressable
                style={[styles.selectRow, (!provinceId || formLocked) && styles.selectDisabled]}
                disabled={!provinceId || formLocked}
                onPress={() => provinceId && !formLocked && setDistrictOpen(true)}
                accessibilityRole="button">
                <Text
                  style={[
                    styles.selectText,
                    (!districtLabel || !provinceId) && styles.selectPlaceholder,
                  ]}
                  maxFontSizeMultiplier={1.2}>
                  {!provinceId ? t('registerDistrictPhNeedProvince') : districtLabel || t('registerDistrictPh')}
                </Text>
                <Ionicons name="chevron-down" size={22} color={FormColors.label} />
              </Pressable>

              {/* Gender */}
              <Text style={[styles.label, styles.labelSp]} maxFontSizeMultiplier={1.2}>
                {t('registerGender')}
              </Text>
              <View style={styles.genderRow}>
                <Pressable
                  style={[styles.genderChip, gender === 'male' && styles.genderChipActive]}
                  disabled={formLocked}
                  onPress={() => !formLocked && setGender('male')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: gender === 'male' }}>
                  <MaterialCommunityIcons
                    name="gender-male"
                    size={22}
                    color={gender === 'male' ? '#fff' : FormColors.title}
                  />
                  <Text
                    style={[styles.genderLabel, gender === 'male' && styles.genderLabelActive]}
                    maxFontSizeMultiplier={1.15}>
                    {t('registerMale')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.genderChip, gender === 'female' && styles.genderChipActive]}
                  disabled={formLocked}
                  onPress={() => !formLocked && setGender('female')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: gender === 'female' }}>
                  <MaterialCommunityIcons
                    name="gender-female"
                    size={22}
                    color={gender === 'female' ? '#fff' : FormColors.title}
                  />
                  <Text
                    style={[styles.genderLabel, gender === 'female' && styles.genderLabelActive]}
                    maxFontSizeMultiplier={1.15}>
                    {t('registerFemale')}
                  </Text>
                </Pressable>
              </View>

              {/* Password */}
              <Text style={[styles.label, styles.labelSp]} maxFontSizeMultiplier={1.2}>
                {t('registerPassword')}
              </Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder={t('registerPasswordPh')}
                  placeholderTextColor={FormColors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  editable={!formLocked}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  autoComplete="password-new"
                />
                <Pressable
                  disabled={formLocked}
                  onPress={() => !formLocked && setShowPassword((v) => !v)}
                  hitSlop={10}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={FormColors.label}
                  />
                </Pressable>
              </View>
              <PasswordStrengthBar strength={strength} />
              <Text style={styles.passwordPolicyHint} maxFontSizeMultiplier={1.15}>
                {t('registerPasswordPolicyHint')}
              </Text>

              {/* Confirm */}
              <Text style={[styles.label, styles.labelSp]} maxFontSizeMultiplier={1.2}>
                {t('registerConfirmPassword')}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  passwordsMismatch && styles.inputWrapError,
                  passwordsMatch && styles.inputWrapSuccess,
                ]}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder={t('registerConfirmPasswordPh')}
                  placeholderTextColor={FormColors.placeholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!formLocked}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  autoComplete="password-new"
                />
                <Pressable
                  disabled={formLocked}
                  onPress={() => !formLocked && setShowConfirm((v) => !v)}
                  hitSlop={10}>
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={FormColors.label}
                  />
                </Pressable>
              </View>
              {passwordsMismatch ? (
                <Text style={styles.mismatch} maxFontSizeMultiplier={1.15}>
                  {t('passwordsDoNotMatch')}
                </Text>
              ) : passwordsMatch ? (
                <View style={styles.matchRow}>
                  <Ionicons name="checkmark-circle" size={18} color={FormColors.successBright} />
                  <Text style={styles.matchText} maxFontSizeMultiplier={1.15}>
                    {t('passwordsMatch')}
                  </Text>
                </View>
              ) : null}

              <Pressable
                style={[
                  styles.registerBtn,
                  canSubmit && !submitting && !formLocked ? styles.registerBtnEnabled : styles.registerBtnDisabled,
                ]}
                disabled={!canSubmit || submitting || formLocked}
                onPress={() => void onRegister()}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit || submitting || formLocked }}>
                {submitting ? (
                  <ActivityIndicator color={FormColors.primaryButtonText} />
                ) : (
                  <Text
                    style={[
                      styles.registerLabel,
                      (!canSubmit || submitting || formLocked) && styles.registerLabelDisabled,
                    ]}
                    maxFontSizeMultiplier={1.2}>
                    {t('registerRegister')}
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.loginRow}
                onPress={() =>
                  router.push({ pathname: '/login', params: { backTo: 'register' } } as Href)
                }
                accessibilityRole="button">
                <Text style={styles.loginMuted} maxFontSizeMultiplier={1.15}>
                  {t('registerAlreadyHave')}
                </Text>
                <Text style={styles.loginLink} maxFontSizeMultiplier={1.15}>
                  {t('registerLogIn')}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <OptionPickerModal
        visible={provinceOpen}
        title={t('registerProvince')}
        options={provinceItems}
        selectedId={provinceId}
        onSelect={onProvinceSelect}
        onClose={() => setProvinceOpen(false)}
      />
      <OptionPickerModal
        visible={districtOpen}
        title={t('registerDistrictPickerTitle')}
        options={districtOptions}
        selectedId={
          districtLabel
            ? districtOptions.find((o) => o.label === districtLabel)?.id ?? null
            : null
        }
        onSelect={onDistrictSelect}
        onClose={() => setDistrictOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: FormColors.background,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  scrollInner: {
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: FormColors.iconMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    marginTop: 18,
    fontSize: 24,
    fontWeight: '700',
    color: FormColors.title,
  },
  screenSubtitlePs: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '600',
    color: FormColors.subtitle,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: FormColors.label,
    marginBottom: 8,
  },
  labelSp: {
    marginTop: 22,
  },
  bootSpinner: {
    marginBottom: 20,
    alignSelf: 'center',
  },
  apiErrorBlock: {
    marginBottom: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FormColors.weak,
    backgroundColor: FormColors.background,
  },
  apiErrorText: {
    fontSize: 14,
    fontWeight: '500',
    color: FormColors.weak,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryOutlineBtn: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Brand.green,
    minWidth: 140,
    alignItems: 'center',
  },
  retryOutlinePressed: {
    opacity: 0.88,
  },
  retryOutlineDisabled: {
    opacity: 0.45,
  },
  retryOutlineLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.green,
  },
  input: {
    borderWidth: 1,
    borderColor: FormColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: FormColors.title,
    backgroundColor: FormColors.background,
  },
  inputWrapPlain: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FormColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: FormColors.background,
    minHeight: 52,
  },
  inputWrapPlainValid: {
    borderColor: FormColors.successBright,
    borderWidth: 1.5,
  },
  inputWrapPlainInvalid: {
    borderColor: FormColors.weak,
    borderWidth: 1.5,
  },
  fieldError: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
    color: FormColors.weak,
  },
  passwordPolicyHint: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '500',
    color: FormColors.label,
    lineHeight: 18,
  },
  inputFlexPlain: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: FormColors.title,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: FormColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: FormColors.background,
  },
  selectDisabled: {
    opacity: 0.55,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    color: FormColors.title,
  },
  selectPlaceholder: {
    color: FormColors.placeholder,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FormColors.border,
    backgroundColor: FormColors.background,
  },
  genderChipActive: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: FormColors.title,
  },
  genderLabelActive: {
    color: '#fff',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FormColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: FormColors.background,
  },
  inputFlex: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: FormColors.title,
  },
  inputWrapError: {
    borderColor: FormColors.weak,
    borderWidth: 1.5,
  },
  inputWrapSuccess: {
    borderColor: FormColors.successBright,
    borderWidth: 1.5,
  },
  mismatch: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
    color: FormColors.weak,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  matchText: {
    fontSize: 13,
    fontWeight: '600',
    color: FormColors.successBright,
  },
  registerBtn: {
    marginTop: 24,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: 999,
  },
  registerBtnEnabled: {
    backgroundColor: Brand.green,
    ...Platform.select({
      ios: {
        shadowColor: Brand.green,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  registerBtnDisabled: {
    backgroundColor: FormColors.disabledButtonBg,
    elevation: 0,
    shadowOpacity: 0,
  },
  registerLabel: {
    color: FormColors.primaryButtonText,
    fontSize: 17,
    fontWeight: '700',
  },
  registerLabelDisabled: {
    color: FormColors.disabledButtonText,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 22,
  },
  loginMuted: {
    fontSize: 15,
    color: FormColors.label,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '700',
    color: FormColors.link,
  },
});
