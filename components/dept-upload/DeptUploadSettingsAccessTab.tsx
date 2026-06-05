import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { showToast } from '@/lib/adapters/toast';
import { patchBackendAuthMe, postBackendLogin } from '@/lib/api/auth-jwt';
import { saveJwtTokens } from '@/lib/api/jwt-session-storage';
import { FormColors, palette } from '@/lib/theme';
import { isPasswordPolicyValid } from '@/lib/validation/password-policy';

const GREEN = palette.primary;

export function DeptUploadSettingsAccessTab() {
  const { sessionEmail } = useAuthSession();
  const { t } = useAppTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const savePassword = useCallback(async () => {
    const email = sessionEmail?.trim().toLowerCase();
    if (!email) {
      showToast(t('deptAccessNoSession'), 'error');
      return;
    }
    if (!newPassword.trim()) {
      showToast(t('deptAccessNewPasswordRequired'), 'error');
      return;
    }
    if (!isPasswordPolicyValid(newPassword)) {
      showToast(t('registerPasswordPolicyHint'), 'error');
      return;
    }
    if (!currentPassword) {
      showToast(t('deptAccessCurrentRequired'), 'error');
      return;
    }

    setSaving(true);
    const verify = await postBackendLogin({ email, password: currentPassword });
    if (!verify.ok) {
      setSaving(false);
      showToast(t('deptAccessCurrentWrong'), 'error');
      return;
    }
    await saveJwtTokens(verify.data.accessToken, verify.data.refreshToken);
    const out = await patchBackendAuthMe({ password: newPassword });
    setSaving(false);
    if (!out.ok) {
      showToast(out.message, 'error');
      return;
    }
    await saveJwtTokens(out.data.accessToken, out.data.refreshToken);
    setNewPassword('');
    setCurrentPassword('');
    showToast(t('deptAccessPasswordUpdated'), 'success');
  }, [currentPassword, newPassword, sessionEmail, t]);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.adminHead}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="people-outline" size={20} color={GREEN} />
          </View>
          <View style={styles.cardHeadTxt}>
            <Text style={styles.cardTitle}>{t('deptAccessAdminCardTitle')}</Text>
            <Text style={styles.cardSub}>{t('deptAccessAdminCardSub')}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.adminBody}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarLgTxt}>
              {(sessionEmail?.slice(0, 2) ?? 'DE').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.adminRoleTitle}>{t('deptAccessAdminRoleTitle')}</Text>
          <Text style={styles.signedLine}>
            <Text style={styles.signedMuted}>{t('settingsAdminSignedIn')} </Text>
            <Text style={styles.signedBold}>{sessionEmail ?? '—'}</Text>
          </Text>
          <Text style={styles.adminPara}>
            {t('deptAccessAdminBody')}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={GREEN} />
          </View>
          <View style={styles.cardHeadTxt}>
            <Text style={styles.cardTitle}>{t('changePasswordTitle')}</Text>
            <Text style={styles.cardSub}>{t('deptAccessChangePasswordSub')}</Text>
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.inputLabel}>{t('changePasswordCurrent')}</Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            style={styles.inputCurrentPwd}
            secureTextEntry
            placeholder={t('loginPasswordPlaceholder')}
            placeholderTextColor={FormColors.subtitle}
            editable={!saving}
          />
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.inputLabel}>{t('changePasswordNew')}</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            style={styles.input}
            secureTextEntry
            placeholder={t('registerPasswordPh')}
            placeholderTextColor={FormColors.subtitle}
            editable={!saving}
          />
          <Text style={styles.helpPwd}>{t('registerPasswordPolicyHint')}</Text>
        </View>

        <Pressable
          onPress={() => void savePassword()}
          style={styles.savePwdBtn}
          accessibilityRole="button"
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <Text style={styles.savePwdBtnTxt}>{t('settingsSaveChanges')}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={22} color={GREEN} style={styles.infoIcon} />
        <Text style={styles.infoTxt}>
          {t('deptAccessEmailIdentityHint')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
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
  adminHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginBottom: 18,
    marginHorizontal: -4,
  },
  adminBody: { alignItems: 'flex-start' },
  avatarLg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarLgTxt: { fontSize: 22, fontWeight: '800', color: palette.white },
  adminRoleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: FormColors.title,
    marginBottom: 8,
  },
  signedLine: { marginBottom: 12 },
  signedMuted: { fontSize: 14, fontWeight: '500', color: DeptUploadDash.mutedText },
  signedBold: { fontSize: 14, fontWeight: '700', color: FormColors.title },
  adminPara: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9CA3AF',
    lineHeight: 20,
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
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  cardSub: { fontSize: 12, fontWeight: '500', color: DeptUploadDash.mutedText, marginTop: 4, lineHeight: 16 },
  fieldBlock: { marginBottom: 16 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: DeptUploadDash.mutedText,
    marginBottom: 8,
  },
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
  inputCurrentPwd: {
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: FormColors.title,
    backgroundColor: '#EEF2FF',
  },
  helpPwd: {
    fontSize: 12,
    fontWeight: '500',
    color: DeptUploadDash.mutedText,
    marginTop: 8,
  },
  savePwdBtn: {
    marginTop: 4,
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  savePwdBtnTxt: { fontSize: 15, fontWeight: '700', color: palette.white },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: DeptUploadDash.radiusLg,
    backgroundColor: 'rgba(14, 116, 144, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(14, 116, 144, 0.2)',
  },
  infoIcon: { marginTop: 2 },
  infoTxt: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: DeptUploadDash.mutedText,
    lineHeight: 20,
  },
});
