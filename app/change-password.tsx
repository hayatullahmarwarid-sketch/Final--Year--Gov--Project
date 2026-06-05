import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  PasswordStrengthBar,
  scorePasswordStrength,
  type PasswordStrength,
} from '@/components/auth/PasswordStrengthBar';
import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useUserProfile } from '@/contexts/user-profile-context';
import { useClearSensitiveOnWebRestore } from '@/hooks/use-clear-sensitive-on-web-restore';
import { useRedirectNonPublicFromPublicRoutes } from '@/hooks/use-redirect-non-public-from-public-routes';

/**
 * Change password — same field layout and styles as registration (`register.tsx`) password section.
 */
export default function ChangePasswordScreen() {
  useRedirectNonPublicFromPublicRoutes();
  const { width } = useWindowDimensions();
  const { t } = useAppTranslation();
  const horizontal = width < 360 ? 16 : width >= 768 ? Math.max(32, (width - 560) / 2) : 20;
  const maxW = Math.min(560, width - horizontal * 2);

  const { passwordHydrated, hasSavedPassword, updateAccountPassword } = useUserProfile();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentError, setCurrentError] = useState(false);

  useClearSensitiveOnWebRestore(
    useCallback(() => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, []),
  );

  const strength: PasswordStrength = useMemo(() => scorePasswordStrength(newPassword), [newPassword]);

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword.length > 0 && newPassword !== confirmPassword;

  const canSubmit = useMemo(() => {
    if (!passwordHydrated) return false;
    if (hasSavedPassword && currentPassword.length === 0) return false;
    if (newPassword.length < 6) return false;
    if (newPassword !== confirmPassword) return false;
    return true;
  }, [passwordHydrated, hasSavedPassword, currentPassword, newPassword, confirmPassword]);

  const onSave = async () => {
    if (!canSubmit) return;
    setCurrentError(false);
    const result = await updateAccountPassword(currentPassword, newPassword);
    if (!result.ok) {
      if (result.error === 'bad_old') {
        setCurrentError(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      Alert.alert(t('alertCouldNotSavePasswordTitle'), t('alertCouldNotSavePasswordMessage'));
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <View style={[styles.topBar, { paddingHorizontal: horizontal }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('a11yGoBack')}
              hitSlop={12}
              onPress={() => router.back()}
              style={styles.backBtn}>
              <Ionicons
                name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'}
                size={26}
                color={FormColors.title}
              />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollInner,
              { paddingHorizontal: horizontal, paddingBottom: 32 },
            ]}>
            <View style={[styles.hero, { maxWidth: maxW, width: '100%', alignSelf: 'center' }]}>
              <View style={styles.avatarRing}>
                <MaterialCommunityIcons name="lock-reset" size={40} color={Brand.green} />
              </View>
              <Text style={styles.screenTitle} maxFontSizeMultiplier={1.25}>
                {t('changePasswordTitle')}
              </Text>
            </View>

            <View style={{ maxWidth: maxW, width: '100%', alignSelf: 'center' }}>
              <Text style={styles.label} maxFontSizeMultiplier={1.2}>
                {t('changePasswordCurrent')}
              </Text>
              <View style={[styles.inputWrap, currentError && styles.inputWrapError]}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder={t('changePasswordPh')}
                  placeholderTextColor={FormColors.placeholder}
                  value={currentPassword}
                  onChangeText={(t) => {
                    setCurrentPassword(t);
                    setCurrentError(false);
                  }}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={passwordHydrated}
                  textContentType="password"
                  autoComplete="current-password"
                />
                <Pressable onPress={() => setShowCurrent((v) => !v)} hitSlop={10}>
                  <Ionicons
                    name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={FormColors.label}
                  />
                </Pressable>
              </View>
              {!hasSavedPassword ? (
                <Text style={styles.helperFirst} maxFontSizeMultiplier={1.1}>
                  {t('changePasswordNoSavedHint')}
                </Text>
              ) : null}
              {currentError ? (
                <Text style={styles.mismatch} maxFontSizeMultiplier={1.15}>
                  {t('changePasswordCurrentIncorrect')}
                </Text>
              ) : null}

              <Text style={[styles.label, styles.labelSp]} maxFontSizeMultiplier={1.2}>
                {t('changePasswordNew')}
              </Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder={t('changePasswordPh')}
                  placeholderTextColor={FormColors.placeholder}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  autoComplete="password-new"
                />
                <Pressable onPress={() => setShowNew((v) => !v)} hitSlop={10}>
                  <Ionicons
                    name={showNew ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={FormColors.label}
                  />
                </Pressable>
              </View>
              <PasswordStrengthBar strength={strength} />

              <Text style={[styles.label, styles.labelSp]} maxFontSizeMultiplier={1.2}>
                {t('changePasswordConfirm')}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  passwordsMismatch && styles.inputWrapError,
                  passwordsMatch && styles.inputWrapSuccess,
                ]}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder={t('changePasswordConfirmPh')}
                  placeholderTextColor={FormColors.placeholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  autoComplete="password-new"
                />
                <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={10}>
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
                  styles.saveBtn,
                  canSubmit ? styles.saveBtnEnabled : styles.saveBtnDisabled,
                ]}
                disabled={!canSubmit}
                onPress={() => void onSave()}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit }}>
                <Text
                  style={[styles.saveLabel, !canSubmit && styles.saveLabelDisabled]}
                  maxFontSizeMultiplier={1.2}>
                  {t('changePasswordSave')}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  helperFirst: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
    color: FormColors.label,
    lineHeight: 18,
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
  saveBtn: {
    marginTop: 24,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: 999,
  },
  saveBtnEnabled: {
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
  saveBtnDisabled: {
    backgroundColor: FormColors.disabledButtonBg,
    elevation: 0,
    shadowOpacity: 0,
  },
  saveLabel: {
    color: FormColors.primaryButtonText,
    fontSize: 17,
    fontWeight: '700',
  },
  saveLabelDisabled: {
    color: FormColors.disabledButtonText,
  },
});
