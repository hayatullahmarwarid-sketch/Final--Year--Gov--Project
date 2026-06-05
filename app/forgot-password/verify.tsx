import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
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

function normalizeParam(p: string | string[] | undefined): string {
  if (Array.isArray(p)) return p[0] ?? '';
  return p ?? '';
}

/** Forgot password — step 2: paste reset code from email. */
export default function ForgotPasswordVerifyTokenScreen() {
  const { width } = useWindowDimensions();
  const keyboardPad = useAuthFormKeyboardPadding();
  const { t } = useAppTranslation();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email = normalizeParam(params.email).trim().toLowerCase();
  const { setPendingPasswordReset } = useForgotPasswordRecovery();

  const horizontal = width < 360 ? 18 : width >= 768 ? Math.max(32, (width - 560) / 2) : 22;

  const [token, setToken] = useState('');

  useEffect(() => {
    if (!email) {
      router.replace('/forgot-password');
    }
  }, [email]);

  const canContinue = useMemo(() => token.trim().length >= 8, [token]);

  const onContinue = () => {
    if (!canContinue || !email) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPendingPasswordReset({ email, token: token.trim() });
    router.push('/forgot-password/reset');
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
              <ForgotPasswordProgress step={2} />
            </View>

            <View style={styles.hero}>
              <View style={styles.shieldCircle}>
                <View style={styles.shieldBadge}>
                  <Ionicons name="mail" size={26} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.title} maxFontSizeMultiplier={1.2}>
                {t('forgotVerifyTitle')}
              </Text>
              <Text style={styles.subline} maxFontSizeMultiplier={1.15}>
                {t('forgotVerifyBodyPrefix')}{' '}
                <Text style={styles.emailEm}>{email || t('verifyOtpEmailFallback')}</Text>
                {t('forgotVerifyBodySuffix')}
              </Text>
            </View>

            <Text style={styles.label}>{t('forgotVerifyCodeLabel')}</Text>
            <TextInput
              style={styles.tokenInput}
              placeholder={t('forgotPasteCodePlaceholder')}
              placeholderTextColor={FormColors.placeholder}
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              textAlignVertical="top"
              accessibilityLabel={t('a11yPasswordResetCode')}
            />

            <Pressable
              style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
              disabled={!canContinue}
              onPress={onContinue}
              accessibilityRole="button">
              <Text style={[styles.primaryLabel, !canContinue && styles.primaryLabelDisabled]}>
                {t('onboardingContinue')}
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
  hero: { alignItems: 'center', marginBottom: 24 },
  shieldCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: FormColors.iconMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  shieldBadge: {
    width: 56,
    height: 62,
    borderRadius: 12,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: FormColors.title,
    textAlign: 'center',
    marginBottom: 10,
  },
  subline: { fontSize: 15, color: FormColors.label, textAlign: 'center', lineHeight: 22 },
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
  primaryBtnDisabled: {
    backgroundColor: FormColors.disabledButtonBg,
    elevation: 0,
    shadowOpacity: 0,
  },
  primaryLabel: { color: '#fff', fontSize: 17, fontWeight: '700' },
  primaryLabelDisabled: { color: FormColors.disabledButtonText },
});
