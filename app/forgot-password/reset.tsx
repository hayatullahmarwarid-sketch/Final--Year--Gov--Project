import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import { ForgotPasswordProgress } from '@/components/auth/ForgotPasswordProgress';
import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { useForgotPasswordRecovery } from '@/contexts/forgot-password-recovery-context';
import { useAuthFormKeyboardPadding } from '@/hooks/use-auth-form-keyboard-padding';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useClearSensitiveOnWebRestore } from '@/hooks/use-clear-sensitive-on-web-restore';
import { postPasswordResetComplete } from '@/lib/api/auth-public-flow';
import {
  allPasswordRequirementsMet,
  countMetRequirements,
  getPasswordRequirements,
} from '@/lib/password-requirements';

function StrengthMeter({ password }: { password: string }) {
  const { t } = useAppTranslation();
  const r = getPasswordRequirements(password);
  const met = countMetRequirements(r);
  let label = '';
  let labelColor: string = FormColors.label;
  const segs: [string, string, string] = [
    FormColors.segmentEmpty,
    FormColors.segmentEmpty,
    FormColors.segmentEmpty,
  ];

  if (!password) {
    return null;
  }
  if (met === 3) {
    label = t('forgotResetStrongPassword');
    labelColor = Brand.green;
    segs[0] = segs[1] = segs[2] = Brand.green;
  } else if (met === 2) {
    label = t('forgotResetFairPassword');
    labelColor = FormColors.fairPassword;
    segs[0] = FormColors.fairPassword;
    segs[1] = FormColors.fairPassword;
  } else if (met === 1) {
    label = t('forgotResetWeakPassword');
    labelColor = FormColors.weak;
    segs[0] = FormColors.weak;
  } else {
    label = t('forgotResetWeakPassword');
    labelColor = FormColors.weak;
    segs[0] = FormColors.weak;
  }

  return (
    <View style={styles.strengthWrap}>
      <View style={styles.strengthRow}>
        {segs.map((c, i) => (
          <View key={i} style={[styles.strengthSeg, { backgroundColor: c }]} />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color: labelColor }]} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
    </View>
  );
}

/** Forgot password — step 3: new password + checklist. */
export default function ForgotPasswordResetScreen() {
  const { width } = useWindowDimensions();
  const keyboardPad = useAuthFormKeyboardPadding();
  const { t } = useAppTranslation();
  const horizontal = width < 360 ? 18 : width >= 768 ? Math.max(32, (width - 560) / 2) : 22;
  const { pendingPasswordReset, setPendingPasswordReset } = useForgotPasswordRecovery();
  const missingSessionAlerted = useRef(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useClearSensitiveOnWebRestore(
    useCallback(() => {
      setPassword('');
      setConfirm('');
    }, []),
  );

  const req = useMemo(() => getPasswordRequirements(password), [password]);
  const match = confirm.length > 0 && password === confirm;
  const canReset =
    allPasswordRequirementsMet(req) && password.length >= 8 && match && Boolean(pendingPasswordReset?.email);

  useEffect(() => {
    if (pendingPasswordReset?.email || missingSessionAlerted.current) return;
    missingSessionAlerted.current = true;
    Alert.alert(t('alertSessionExpiredTitle'), t('alertSessionExpiredMessage'), [
      { text: t('btnOk'), onPress: () => router.replace('/forgot-password') },
    ]);
  }, [pendingPasswordReset, t]);

  const onReset = async () => {
    if (!canReset || !pendingPasswordReset || submitting) return;
    setSubmitting(true);
    const r = await postPasswordResetComplete({
      email: pendingPasswordReset.email,
      token: pendingPasswordReset.token,
      newPassword: password,
    });
    setSubmitting(false);
    if (!r.ok) {
      Alert.alert(t('alertResetFailed'), r.message);
      return;
    }
    setPendingPasswordReset(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/login');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={[
              styles.scroll,
              { paddingHorizontal: horizontal, paddingBottom: 32 + keyboardPad },
            ]}>
            <Pressable
              style={styles.backBtn}
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('a11yGoBack')}>
              <Ionicons
                name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'}
                size={26}
                color={FormColors.title}
              />
            </Pressable>

            <View style={styles.progressWrap}>
              <ForgotPasswordProgress step={3} />
            </View>

            <View style={styles.hero}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="key-variant" size={40} color={Brand.green} />
              </View>
              <Text style={styles.title} maxFontSizeMultiplier={1.2}>
                {t('forgotResetTitle')}
              </Text>
              <Text style={styles.subtitle} maxFontSizeMultiplier={1.15}>
                {t('forgotResetSubtitle')}
              </Text>
            </View>

            <Text style={styles.label} maxFontSizeMultiplier={1.2}>
              {t('forgotResetNewPassword')}
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('changePasswordPh')}
                placeholderTextColor={FormColors.placeholder}
                textContentType="newPassword"
                autoComplete="password-new"
              />
              <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={10}>
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={FormColors.label}
                />
              </Pressable>
            </View>
            <StrengthMeter password={password} />

            <Text style={[styles.label, styles.labelSp]} maxFontSizeMultiplier={1.2}>
              {t('forgotResetConfirmPassword')}
            </Text>
            <View style={[styles.inputWrap, match && styles.inputWrapMatch]}>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showCf}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('forgotResetConfirmPh')}
                placeholderTextColor={FormColors.placeholder}
                textContentType="newPassword"
                autoComplete="password-new"
              />
              {match ? <Ionicons name="checkmark-circle" size={22} color={Brand.green} /> : null}
              <Pressable onPress={() => setShowCf((v) => !v)} hitSlop={10}>
                <Ionicons
                  name={showCf ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={FormColors.label}
                />
              </Pressable>
            </View>

            <View style={styles.checklist}>
              <CheckRow ok={req.len8} text={t('forgotResetReqLength')} />
              <CheckRow ok={req.mixCase} text={t('forgotResetReqCase')} />
              <CheckRow ok={req.numOrSpecial} text={t('forgotResetReqNumberSpecial')} />
            </View>

            <Pressable
              style={[styles.resetBtn, canReset && !submitting ? styles.resetBtnOn : styles.resetBtnOff]}
              disabled={!canReset || submitting}
              onPress={() => void onReset()}
              accessibilityRole="button">
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={canReset ? '#fff' : FormColors.disabledButtonText}
                  />
                  <Text style={[styles.resetLabel, !canReset && styles.resetLabelOff]}>
                    {t('forgotResetButton')}
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function CheckRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.checkRow}>
      {ok ? (
        <Ionicons name="checkmark-circle" size={20} color={Brand.green} />
      ) : (
        <View style={styles.checkDot} />
      )}
      <Text style={styles.checkText} maxFontSizeMultiplier={1.1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FormColors.background },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingTop: 4 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 8 },
  progressWrap: { marginBottom: 20 },
  hero: { alignItems: 'center', marginBottom: 24 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: FormColors.iconMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: FormColors.title,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: FormColors.label,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: FormColors.label,
    marginBottom: 8,
  },
  labelSp: { marginTop: 20 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FormColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
    backgroundColor: FormColors.background,
    minHeight: 52,
  },
  inputWrapMatch: {
    borderColor: FormColors.successBright,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: FormColors.title,
  },
  strengthWrap: { marginTop: 10, marginBottom: 4 },
  strengthRow: { flexDirection: 'row', gap: 6 },
  strengthSeg: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { marginTop: 6, fontSize: 13, fontWeight: '600' },
  checklist: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: FormColors.inputMutedFill,
    borderWidth: 1,
    borderColor: FormColors.border,
    gap: 12,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: FormColors.border,
    backgroundColor: FormColors.background,
  },
  checkText: { flex: 1, fontSize: 14, color: FormColors.subtitle },
  resetBtn: {
    marginTop: 28,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 52,
  },
  resetBtnOn: {
    backgroundColor: Brand.green,
    ...Platform.select({
      ios: {
        shadowColor: Brand.green,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  resetBtnOff: {
    backgroundColor: FormColors.disabledButtonBg,
    elevation: 0,
    shadowOpacity: 0,
  },
  resetLabel: { fontSize: 17, fontWeight: '700', color: '#fff' },
  resetLabelOff: { color: FormColors.disabledButtonText },
});
