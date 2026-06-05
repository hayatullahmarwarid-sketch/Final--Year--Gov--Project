import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppPressable } from '@/components/ui/AppPressable';
import { FormInput } from '@/components/ui/FormInput';
import { getApiBaseUrl } from '@/constants/api';
import { isDeptUploadCredentials } from '@/constants/dept-upload-auth';
import { getPublicUiCopy } from '@/constants/public-ui-copy';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useAuthFormKeyboardPadding } from '@/hooks/use-auth-form-keyboard-padding';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useClearSensitiveOnWebRestore } from '@/hooks/use-clear-sensitive-on-web-restore';
import { postBackendLogin } from '@/lib/api/auth-jwt';
import { mapBackendRoleKeyToAuthSessionRole } from '@/lib/auth-backend-role-map';
import { homeHrefForRole } from '@/lib/auth-routing';
import { isLoginEmailValid } from '@/lib/validation/login-email';
import { tryPortalLogin } from '@/services/admin-portal-auth';
import { Brand, FormColors, layout, primaryBtn, radius, semantic, shadowPrimary, sizes, spacing, typography } from '@/lib/theme';

/**
 * Layer: `SignInScreen` — email + password for all roles (public, staff portals, inspectors).
 */
export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const { language } = useAppLanguage();
  const { t } = useAppTranslation();
  const { backTo } = useLocalSearchParams<{ backTo?: string | string[] }>();
  const backToRegister =
    backTo === 'register' || (Array.isArray(backTo) && backTo.includes('register'));
  const c = useMemo(() => getPublicUiCopy(language), [language]);
  const horizontal =
    width < 360
      ? layout.authEdgeCompact
      : width >= 768
        ? Math.max(spacing.xl, (width - layout.authFormMaxWidth) / 2)
        : layout.authEdgeDefault;
  const formWidth = Math.min(layout.authFormMaxWidth, width - horizontal * 2);
  const {
    hydrated: authHydrated,
    role,
    signInAsDeptUpload,
    signInAsInspector,
    signInAsInspectorAdmin,
    signInAsPublic,
    signInAsSystemAdmin,
    signInFromBackendJwt,
  } = useAuthSession();

  const [emailLocal, setEmailLocal] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const keyboardPad = useAuthFormKeyboardPadding();

  useClearSensitiveOnWebRestore(
    useCallback(() => {
      setEmailLocal('');
      setPassword('');
      setLoginError(null);
    }, []),
  );

  const onAuthGoBack = useCallback(() => {
    if (backToRegister) {
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace('/register' as Href);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/' as Href);
  }, [backToRegister]);

  const emailOk = useMemo(() => isLoginEmailValid(emailLocal), [emailLocal]);
  /** Same rules as before: staff demo portals may use short passwords (e.g. 6 chars). */
  const loginLooksReady = emailOk && password.length >= 6;

  useEffect(() => {
    if (!authHydrated) return;
    if (role === null) return;
    router.replace(homeHrefForRole(role));
  }, [authHydrated, role]);

  const onLogin = async () => {
    if (!loginLooksReady) return;
    setLoginError(null);
    const id = emailLocal.trim();

    if (isDeptUploadCredentials(emailLocal, password)) {
      await signInAsDeptUpload();
      router.replace(homeHrefForRole('dept_upload'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    const portal = await tryPortalLogin(id, password);
    if (portal) {
      if (portal.role === 'system') {
        await signInAsSystemAdmin(portal.username);
        router.replace(homeHrefForRole('system_admin'));
      } else if (portal.role === 'decree') {
        await signInAsDeptUpload();
        router.replace(homeHrefForRole('dept_upload'));
      } else if (portal.role === 'inspector') {
        if (portal.inspectorPortal === 'inspector_admin') {
          await signInAsInspectorAdmin(portal.username);
          router.replace(homeHrefForRole('inspector_admin'));
        } else {
          await signInAsInspector(portal.username);
          router.replace(homeHrefForRole('inspector'));
        }
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    const apiBase = getApiBaseUrl();
    if (apiBase) {
      const backend = await postBackendLogin({ email: id, password });
      if (backend.ok) {
        const mapped = mapBackendRoleKeyToAuthSessionRole(backend.data.user.role);
        if (!mapped) {
          setLoginError(c.loginInvalidEmailPassword);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        await signInFromBackendJwt({
          accessToken: backend.data.accessToken,
          refreshToken: backend.data.refreshToken,
          role: mapped,
          emailForScope: backend.data.user.email || id,
          preferredLanguage: backend.data.user.preferredLanguage,
          remember,
        });
        router.replace(homeHrefForRole(mapped));
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
      setLoginError(
        backend.status === 401 || backend.status === 403 ? c.loginInvalidEmailPassword : backend.message,
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!isLoginEmailValid(emailLocal)) {
      setLoginError(c.loginInvalidEmailPassword);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    await signInAsPublic(emailLocal.trim());
    router.replace(homeHrefForRole('public'));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}>
          <ScrollView
            style={styles.scrollViewNative}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={[
              styles.scroll,
              styles.scrollInnerNative,
              {
                paddingHorizontal: horizontal,
                paddingBottom: spacing['2xl'] + keyboardPad,
              },
            ]}>
            <View
              style={[styles.formColumn, { width: '100%', maxWidth: formWidth, alignSelf: 'center' }]}>
            <AppPressable
              style={styles.backWrap}
              onPress={onAuthGoBack}
              accessibilityRole="button"
              accessibilityLabel={t('a11yGoBack')}
              accessibilityHint={t('a11yGoBackHint')}>
              <Ionicons name="chevron-back" size={26} color={FormColors.title} />
            </AppPressable>

            <View style={styles.content}>
              <View style={styles.hero}>
                <View style={styles.avatarRing}>
                  <MaterialCommunityIcons name="login" size={36} color={Brand.green} />
                </View>
                <Text style={styles.title}>{c.loginTitle}</Text>
                <Text style={styles.instruction}>{c.loginSubtitle}</Text>
              </View>

              <FormInput
                label={c.loginEmailLabel}
                placeholder={c.loginEmailPlaceholder}
                value={emailLocal}
                onChangeText={setEmailLocal}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={120}
                textContentType="emailAddress"
                autoComplete="email"
                fieldState={emailOk ? 'valid' : 'default'}
                leftAccessory={<Ionicons name="mail-outline" size={20} color={FormColors.label} />}
                rightAccessory={
                  emailOk ? <Ionicons name="checkmark-circle" size={22} color={Brand.green} /> : null
                }
                accessibilityHint={t('a11yEmailFieldHint')}
              />

              <FormInput
                label={c.loginPasswordLabel}
                placeholder={c.loginPasswordPlaceholder}
                surface="muted"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                autoComplete="password"
                containerStyle={styles.passwordField}
                rightAccessory={
                  <AppPressable
                    onPress={() => setShowPassword((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? t('a11yHidePassword') : t('a11yShowPassword')}
                    accessibilityHint={t('a11yTogglePasswordVisibility')}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={FormColors.label}
                    />
                  </AppPressable>
                }
              />

              <View style={styles.actionRow}>
                <AppPressable
                  style={styles.rememberPress}
                  onPress={() => setRemember((r) => !r)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: remember }}
                  accessibilityLabel={c.loginRemember}
                  accessibilityHint={t('a11yRememberMeHint')}>
                  <View style={[styles.checkbox, remember && styles.checkboxOn]}>
                    {remember ? (
                      <Ionicons name="checkmark" size={14} color={FormColors.primaryButtonText} />
                    ) : null}
                  </View>
                  <Text style={styles.rememberText}>{c.loginRemember}</Text>
                </AppPressable>
                <AppPressable
                  onPress={() => router.push('/forgot-password' as Href)}
                  accessibilityRole="button"
                  accessibilityLabel={c.loginForgot}
                  accessibilityHint={t('a11yForgotPasswordHint')}
                  style={styles.forgotHit}>
                  <Text style={styles.forgotText}>{c.loginForgot}</Text>
                </AppPressable>
              </View>

              {loginError ? (
                <Text style={styles.loginError} accessibilityLiveRegion="polite">
                  {loginError}
                </Text>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.loginBtn,
                  loginLooksReady ? styles.loginBtnEnabled : styles.loginBtnDisabled,
                  pressed && loginLooksReady && { backgroundColor: primaryBtn.activeBg },
                ]}
                disabled={!loginLooksReady}
                onPress={() => void onLogin()}
                accessibilityRole="button"
                accessibilityState={{ disabled: !loginLooksReady }}
                accessibilityLabel={c.loginButton}
                accessibilityHint={t('a11ySubmitLoginHint')}>
                <Text
                  style={[styles.loginBtnLabel, !loginLooksReady && styles.loginBtnLabelDisabled]}
                  maxFontSizeMultiplier={1.2}>
                  {c.loginButton}
                </Text>
              </Pressable>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>{c.loginOr}</Text>
                <View style={styles.orLine} />
              </View>

              <AppPressable
                style={styles.signUpRow}
                onPress={() => router.push('/register')}
                accessibilityRole="button"
                accessibilityLabel={`${c.loginNoAccount} ${c.loginCreateAccount}`}
                accessibilityHint={t('a11yOpenRegistrationHint')}>
                <Text style={styles.signUpMuted}>{c.loginNoAccount}</Text>
                <Text style={styles.signUpLink}>{c.loginCreateAccount}</Text>
              </AppPressable>

              <Text style={styles.inspectorHint}>{c.loginUnifiedInspectorHint}</Text>
            </View>
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
    width: '100%',
    minHeight: '100%',
  },
  scrollViewNative: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  scroll: {
    flexGrow: 1,
    paddingTop: spacing.xxs,
  },
  scrollInnerNative: {
    width: '100%',
    maxWidth: '100%',
    minWidth: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  formColumn: {
    width: '100%',
  },
  backWrap: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xxs,
    marginBottom: spacing.xs,
  },
  content: {
    width: '100%',
  },
  passwordField: {
    marginTop: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarRing: {
    width: sizes.avatarLg,
    height: sizes.avatarLg,
    borderRadius: sizes.avatarLg / 2,
    backgroundColor: FormColors.iconMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: spacing.md,
    ...typography.headline,
    color: FormColors.title,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  instruction: {
    marginTop: spacing.sm,
    ...typography.bodySmall,
    color: FormColors.label,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rememberPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: sizes.checkbox,
    height: sizes.checkbox,
    borderRadius: sizes.checkbox / 2,
    borderWidth: 1.5,
    borderColor: FormColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FormColors.background,
  },
  checkboxOn: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  rememberText: {
    fontSize: 15,
    fontWeight: '500',
    color: FormColors.subtitle,
  },
  forgotHit: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  forgotText: {
    fontSize: 15,
    fontWeight: '600',
    color: FormColors.link,
  },
  loginBtn: {
    marginTop: spacing.xl,
    width: '100%',
    borderRadius: radius['2xl'],
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  loginBtnEnabled: {
    backgroundColor: Brand.green,
    ...shadowPrimary(),
  },
  loginBtnDisabled: {
    backgroundColor: FormColors.primaryButtonDisabledBg,
    opacity: 0.72,
    elevation: 0,
    shadowOpacity: 0,
  },
  loginBtnLabel: {
    color: FormColors.primaryButtonText,
    fontSize: 17,
    fontWeight: '700',
  },
  loginBtnLabelDisabled: {
    color: FormColors.primaryButtonDisabledText,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing['2xl'],
    gap: spacing.sm,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: FormColors.dividerMuted,
  },
  orText: {
    ...typography.captionBold,
    color: FormColors.placeholder,
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.xl,
    gap: spacing.xxs,
  },
  signUpMuted: {
    fontSize: 15,
    color: FormColors.label,
  },
  signUpLink: {
    fontSize: 15,
    fontWeight: '700',
    color: FormColors.link,
  },
  loginError: {
    marginTop: spacing.sm,
    ...typography.caption,
    fontWeight: '600',
    color: semantic.errorText,
    textAlign: 'center',
  },
  inspectorHint: {
    marginTop: spacing.lg,
    ...typography.caption,
    lineHeight: 18,
    color: FormColors.subtitle,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
});
