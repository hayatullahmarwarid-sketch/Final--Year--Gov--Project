import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { getApiBaseUrl } from '@/constants/api';
import { FormColors } from '@/constants/form';
import { HomeColors } from '@/constants/home';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useRedirectNonPublicFromPublicRoutes } from '@/hooks/use-redirect-non-public-from-public-routes';
import { showToast } from '@/lib/adapters/toast';
import { patchBackendAuthMe } from '@/lib/api/auth-jwt';
import { mapBackendRoleKeyToAuthSessionRole } from '@/lib/auth-backend-role-map';
import { migratePublicAccountScopedStorage } from '@/lib/migrate-preauth-profile';
import { publicAccountKeyFromEmail } from '@/lib/user-scoped-storage-keys';
import { isLoginEmailValid, normalizeLoginEmail } from '@/lib/validation/login-email';

function isValidEmail(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return isLoginEmailValid(t);
}

/**
 * Change the signed-in public account email via `PATCH /api/v1/auth/me` (server session + scoped local data).
 */
export default function ChangeAccountEmailScreen() {
  useRedirectNonPublicFromPublicRoutes();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useAppTranslation();
  const { sessionEmail, accountKey, signInFromBackendJwt } = useAuthSession();
  const horizontal = width < 360 ? 14 : 18;

  const [nextEmail, setNextEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const current = sessionEmail ?? '';
  const trimmedNext = normalizeLoginEmail(nextEmail);
  const nextOk = isValidEmail(trimmedNext);
  const unchanged = trimmedNext === current;
  const canSubmit = Boolean(getApiBaseUrl()) && nextOk && !unchanged && !busy;

  const hint = useMemo(() => {
    if (!getApiBaseUrl()) return t('changeAccountEmailNeedApi');
    if (!current) return t('changeAccountEmailNoSession');
    return null;
  }, [current, t]);

  const onSave = async () => {
    if (!canSubmit) return;
    const oldScope =
      accountKey && accountKey.startsWith('pub_email_')
        ? accountKey
        : current
          ? publicAccountKeyFromEmail(current)
          : null;
    setBusy(true);
    const res = await patchBackendAuthMe({ email: trimmedNext });
    setBusy(false);
    if (!res.ok) {
      if (res.status === 409) {
        showToast(t('changeAccountEmailConflict'), 'error');
      } else {
        showToast(res.message, 'error');
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const mapped = mapBackendRoleKeyToAuthSessionRole(res.data.user.role);
    if (!mapped) {
      showToast(t('registerUnexpectedAccountType'), 'error');
      return;
    }
    const newScope = publicAccountKeyFromEmail(res.data.user.email);
    if (current && oldScope && oldScope !== newScope) {
      await migratePublicAccountScopedStorage(oldScope, newScope);
    }
    await signInFromBackendJwt({
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      role: mapped,
      emailForScope: res.data.user.email,
      preferredLanguage: res.data.user.preferredLanguage,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(t('changeAccountEmailSuccess'), 'success');
    router.replace('/edit-profile');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingHorizontal: horizontal }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerIconBtn}
          accessibilityRole="button"
          accessibilityLabel={t('a11yGoBack')}>
          <Ionicons
            name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color={HomeColors.decreeTitle}
          />
        </Pressable>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.15}>
          {t('changeAccountEmailTitle')}
        </Text>
        <View style={styles.headerIconBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontal, paddingBottom: 24 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {hint ? (
            <Text style={styles.hint} maxFontSizeMultiplier={1.1}>
              {hint}
            </Text>
          ) : null}

          <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.1}>
            {t('changeAccountEmailCurrent')}
          </Text>
          <TextInput
            style={[styles.input, styles.inputMuted]}
            value={current || '—'}
            editable={false}
            accessibilityLabel={t('changeAccountEmailCurrent')}
          />

          <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.1}>
            {t('changeAccountEmailNew')}
          </Text>
          <TextInput
            style={[styles.input, !nextOk && nextEmail.length > 0 && styles.inputError]}
            value={nextEmail}
            onChangeText={setNextEmail}
            placeholder={t('changeAccountEmailPlaceholder')}
            placeholderTextColor={FormColors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t('changeAccountEmailNew')}
          />

          <Pressable
            style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]}
            onPress={() => void onSave()}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.primaryBtnLabel, !canSubmit && styles.primaryBtnLabelOff]} maxFontSizeMultiplier={1.1}>
                {t('changeAccountEmailSave')}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: HomeColors.pageBg,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    backgroundColor: HomeColors.pageBg,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: HomeColors.decreeTitle,
  },
  scrollContent: {
    paddingTop: 12,
  },
  hint: {
    fontSize: 14,
    color: FormColors.label,
    marginBottom: 16,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: FormColors.label,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: FormColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: FormColors.title,
    marginBottom: 16,
  },
  inputMuted: {
    backgroundColor: FormColors.inputMutedFill,
    color: FormColors.subtitle,
  },
  inputError: {
    borderColor: FormColors.weak,
  },
  primaryBtn: {
    backgroundColor: Brand.green,
    borderRadius: 12,
    paddingVertical: 15,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  primaryBtnLabelOff: {
    color: FormColors.primaryButtonDisabledText,
  },
  btnDisabled: {
    opacity: 0.72,
  },
});
