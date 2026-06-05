import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { getPublicUiCopy } from '@/constants/public-ui-copy';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useAuthFormKeyboardPadding } from '@/hooks/use-auth-form-keyboard-padding';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useClearSensitiveOnWebRestore } from '@/hooks/use-clear-sensitive-on-web-restore';
import { postPasswordResetRequest } from '@/lib/api/auth-public-flow';
import { shadowPrimary } from '@/lib/theme';
import { getApiBaseUrl } from '@/constants/api';
import { isLoginEmailValid } from '@/lib/validation/login-email';

/** Forgot password — step 1: registered email (reset link is sent by the API). */
export default function ForgotPasswordEmailScreen() {
  const { width } = useWindowDimensions();
  const keyboardPad = useAuthFormKeyboardPadding();
  const { language } = useAppLanguage();
  const { t } = useAppTranslation();
  const c = useMemo(() => getPublicUiCopy(language), [language]);
  const horizontal = width < 360 ? 18 : width >= 768 ? Math.max(32, (width - 560) / 2) : 22;

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useClearSensitiveOnWebRestore(
    useCallback(() => {
      setEmail('');
    }, []),
  );

  const emailOk = useMemo(() => isLoginEmailValid(email), [email]);

  const onSend = async () => {
    if (!emailOk || submitting) return;
    const base = getApiBaseUrl();
    if (!base) {
      Alert.alert(t('alertNotConfiguredTitle'), t('alertNotConfiguredMessage'));
      return;
    }
    setSubmitting(true);
    const res = await postPasswordResetRequest({ email: email.trim().toLowerCase() });
    setSubmitting(false);
    if (!res.ok) {
      if (res.status === 503) {
        Alert.alert(t('forgotEmailUnavailableTitle'), t('forgotEmailUnavailableMessage'));
        return;
      }
      Alert.alert(t('alertRequestFailed'), res.message);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('forgotPasswordEmailSentTitle'),
      t('forgotPasswordEmailSentBody'),
      [
        {
          text: t('btnContinue'),
          onPress: () =>
            router.push({
              pathname: '/forgot-password/verify',
              params: { email: email.trim().toLowerCase() },
            }),
        },
      ],
    );
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
              <Ionicons name="chevron-back" size={26} color={FormColors.title} />
            </Pressable>

            <View style={styles.progressWrap}>
              <ForgotPasswordProgress step={1} />
            </View>

            <View style={styles.hero}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="email-outline" size={44} color={Brand.green} />
              </View>
              <Text style={styles.title} maxFontSizeMultiplier={1.2}>
                Forgot Password?
              </Text>
              <Text style={styles.body} maxFontSizeMultiplier={1.15}>
                Enter the email you used for your public account. We will send a reset code to that inbox.
              </Text>
            </View>

            <Text style={styles.label} maxFontSizeMultiplier={1.2}>
              {c.loginEmailLabel}
            </Text>
            <View style={[styles.inputShell, emailOk && styles.inputShellValid]}>
              <TextInput
                style={styles.input}
                placeholder={c.loginEmailPlaceholder}
                placeholderTextColor={FormColors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
              />
              {emailOk ? <Ionicons name="checkmark-circle" size={22} color={Brand.green} /> : null}
            </View>

            <Pressable
              style={[styles.primaryBtn, (!emailOk || submitting) && styles.primaryBtnDisabled]}
              disabled={!emailOk || submitting}
              onPress={() => void onSend()}
              accessibilityRole="button">
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={[styles.primaryBtnLabel, (!emailOk || submitting) && styles.primaryBtnLabelDisabled]}
                  maxFontSizeMultiplier={1.15}>
                  Send reset code
                </Text>
              )}
            </Pressable>

            <Pressable style={styles.footerRow} onPress={() => router.replace('/login')}>
              <Text style={styles.footerMuted} maxFontSizeMultiplier={1.1}>
                Remember it?{' '}
              </Text>
              <Text style={styles.footerLink} maxFontSizeMultiplier={1.1}>
                Back to Login
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  hero: { alignItems: 'center', marginBottom: 28 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: FormColors.iconMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: FormColors.title,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
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
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FormColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
    marginBottom: 28,
  },
  inputShellValid: {
    borderColor: Brand.green,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: FormColors.title,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: Brand.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    ...shadowPrimary(),
  },
  primaryBtnDisabled: {
    backgroundColor: FormColors.primaryButtonDisabledBg,
    opacity: 0.72,
    elevation: 0,
    shadowOpacity: 0,
  },
  primaryBtnLabel: { color: '#fff', fontSize: 17, fontWeight: '700' },
  primaryBtnLabelDisabled: { color: FormColors.primaryButtonDisabledText },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 24,
  },
  footerMuted: { fontSize: 15, color: FormColors.label },
  footerLink: { fontSize: 15, fontWeight: '700', color: Brand.green },
});
