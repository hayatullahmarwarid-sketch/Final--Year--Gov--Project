import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
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

import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { getApiBaseUrl } from '@/constants/api';
import { useAuthFormKeyboardPadding } from '@/hooks/use-auth-form-keyboard-padding';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { postEmailVerificationConfirm, postEmailVerificationSend } from '@/lib/api/auth-public-flow';
import { shadowPrimary } from '@/lib/theme';
import { homeHrefForRole } from '@/lib/auth-routing';

function normalizeParam(p: string | string[] | undefined): string {
  if (Array.isArray(p)) return p[0] ?? '';
  return p ?? '';
}

/**
 * After public registration — paste the verification token from the email (same API as deep links).
 */
export default function VerifyEmailScreen() {
  const { width } = useWindowDimensions();
  const keyboardPad = useAuthFormKeyboardPadding();
  const { t, number } = useAppTranslation();
  const params = useLocalSearchParams<{ email?: string | string[]; token?: string | string[] }>();
  const email = normalizeParam(params.email).trim().toLowerCase();
  const [token, setToken] = useState(() => normalizeParam(params.token).trim());
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const horizontal = width < 360 ? 18 : width >= 768 ? Math.max(32, (width - 560) / 2) : 22;

  useEffect(() => {
    const t = normalizeParam(params.token).trim();
    if (t) setToken(t);
  }, [params.token]);

  useEffect(() => {
    if (!email) {
      router.replace('/register');
    }
  }, [email]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setInterval(() => setResendSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendSeconds]);

  const canVerify = useMemo(() => Boolean(email) && token.trim().length >= 8, [email, token]);

  const onResend = async () => {
    if (resendSeconds > 0 || !email || busy) return;
    const base = getApiBaseUrl();
    if (!base) {
      Alert.alert(t('alertNotConfiguredTitle'), t('alertNotConfiguredMessage'));
      return;
    }
    setBusy(true);
    const r = await postEmailVerificationSend({ email });
    setBusy(false);
    if (!r.ok) {
      if (r.status === 503) {
        Alert.alert(t('forgotEmailUnavailableTitle'), t('verifyEmailUnavailableMessage'));
        return;
      }
      Alert.alert(t('alertCouldNotSend'), r.message);
      return;
    }
    setResendSeconds(60);
    Alert.alert(t('alertSentTitle'), t('alertSentEmailCode'));
  };

  const onVerify = async () => {
    if (!canVerify || busy) return;
    setBusy(true);
    const r = await postEmailVerificationConfirm({ email, token: token.trim() });
    setBusy(false);
    if (!r.ok) {
      Alert.alert(t('alertVerificationFailed'), r.message);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(homeHrefForRole('public'));
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

            <View style={styles.hero}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-outline" size={40} color={Brand.green} />
              </View>
              <Text style={styles.title} maxFontSizeMultiplier={1.2}>
                {t('verifyEmailTitle')}
              </Text>
              <Text style={styles.body} maxFontSizeMultiplier={1.15}>
                {t('verifyEmailBodyPrefix')}{' '}
                <Text style={styles.emailEm}>{email || '…'}</Text>
                {t('verifyEmailBodySuffix')}
              </Text>
            </View>

            <Text style={styles.label}>{t('verifyEmailCodeLabel')}</Text>
            <TextInput
              style={styles.tokenInput}
              placeholder={t('verifyEmailPastePlaceholder')}
              placeholderTextColor={FormColors.placeholder}
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              textAlignVertical="top"
              accessibilityLabel={t('a11yEmailCode')}
            />

            <Pressable
              style={[styles.primaryBtn, (!canVerify || busy) && styles.primaryBtnDisabled]}
              disabled={!canVerify || busy}
              onPress={() => void onVerify()}
              accessibilityRole="button">
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.primaryLabel, (!canVerify || busy) && styles.primaryLabelDisabled]}>
                  {t('verifyEmailContinue')}
                </Text>
              )}
            </Pressable>

            {resendSeconds > 0 ? (
              <Text style={styles.resendWait}>
                {t('verifyEmailResendWait', { seconds: number(resendSeconds) })}
              </Text>
            ) : (
              <Pressable onPress={() => void onResend()} style={styles.resendBtn} disabled={busy}>
                <Text style={styles.resendText}>{t('verifyEmailResend')}</Text>
              </Pressable>
            )}
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
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 12 },
  hero: { alignItems: 'center', marginBottom: 28 },
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
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: FormColors.label,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  emailEm: { fontWeight: '700', color: FormColors.title },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: FormColors.label,
    marginBottom: 8,
  },
  tokenInput: {
    minHeight: 100,
    borderWidth: 1.5,
    borderColor: Brand.green,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: FormColors.title,
    marginBottom: 24,
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
  primaryLabel: { color: '#fff', fontSize: 17, fontWeight: '700' },
  primaryLabelDisabled: { color: FormColors.primaryButtonDisabledText },
  resendWait: { marginTop: 20, textAlign: 'center', fontSize: 14, color: FormColors.label },
  resendBtn: { marginTop: 20, alignSelf: 'center' },
  resendText: { fontSize: 15, fontWeight: '700', color: Brand.green },
});
