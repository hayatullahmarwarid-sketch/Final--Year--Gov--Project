import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { showToast } from '@/lib/adapters/toast';

import { AppPressable } from '@/components/ui/AppPressable';
import { CollapsibleFilters } from '@/components/ui/CollapsibleFilters';
import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useSystemAdminUi } from '@/contexts/system-admin-ui-context';
import { palette, radius, spacing, touchTarget, typography } from '@/lib/theme';
import { useSystemAdminRemote } from '@/contexts/system-admin-remote-context';
import {
  initialsFromName,
  staffRoleLabel,
  systemAdminActions,
  useSystemAdminStore,
  type StaffRole,
  type StaffUser,
} from '@/data/system-admin-store';
import { createStaff, patchStaff, resetStaffPortalPassword } from '@/lib/api/system-admin';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';
import { staffMemberToStaffUser, staffRoleToApiRoleKey } from '@/lib/system-admin-mapper';
import { isPasswordPolicyValid } from '@/lib/validation/password-policy';
import { verifySuperAdminLogin } from '@/services/admin-portal-auth';

const MASK = '••••••';

/** Roles the system admin may provision via Add user (internal staff only). */
const ADMIN_CREATABLE_ROLES: StaffRole[] = ['super_admin', 'decree_dept', 'inspector_admin', 'inspector'];

export default function SystemAdminUsersScreen() {
  const { t } = useAppTranslation();
  const { isDarkMode } = useSystemAdminUi();
  const data = useSystemAdminStore();
  const { refreshRemote, remoteBusy, lastRemoteError } = useSystemAdminRemote();

  const [searchQuery, setSearchQuery] = useState('');

  const [addUserModal, setAddUserModal] = useState(false);
  const [passwordResetTarget, setPasswordResetTarget] = useState<StaffUser | null>(null);
  const [resetSkipGate, setResetSkipGate] = useState(false);
  const [gateSaUsername, setGateSaUsername] = useState('');
  const [gateSaPassword, setGateSaPassword] = useState('');
  const [resetManualPassword, setResetManualPassword] = useState('');
  const [issuedOneTimePassword, setIssuedOneTimePassword] = useState<string | null>(null);

  useEffect(() => {
    if (!passwordResetTarget) {
      setResetSkipGate(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const token = await getJwtAccessToken();
      if (!cancelled) setResetSkipGate(Boolean(token));
    })();
    return () => {
      cancelled = true;
    };
  }, [passwordResetTarget]);

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<StaffRole>('inspector');
  const [editStaff, setEditStaff] = useState<StaffUser | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');

  const resetUserDirectorySearch = useCallback(() => setSearchQuery(''), []);

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.staffUsers;
    return data.staffUsers.filter((u) => {
      const phone = (u.phoneE164 ?? '').toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        phone.includes(q) ||
        staffRoleLabel(u.role).toLowerCase().includes(q)
      );
    });
  }, [data.staffUsers, searchQuery]);

  const cardSurface = isDarkMode ? '#111827' : '#fff';
  const borderC = isDarkMode ? '#1F2937' : '#F3F4F6';
  const textMuted = isDarkMode ? '#9CA3AF' : '#6B7280';
  const textTitle = isDarkMode ? '#F3F4F6' : '#111827';

  const openResetPassword = (u: StaffUser) => {
    if (u.role === 'public_user') return;
    setPasswordResetTarget(u);
    setIssuedOneTimePassword(null);
    setResetManualPassword('');
    setGateSaUsername('');
    setGateSaPassword('');
  };

  const closeResetPasswordModal = () => {
    setPasswordResetTarget(null);
    setIssuedOneTimePassword(null);
    setGateSaPassword('');
    setGateSaUsername('');
    setResetManualPassword('');
  };

  const onConfirmPasswordReset = async () => {
    if (!passwordResetTarget) return;
    const manual = resetManualPassword.trim();
    if (manual.length > 0 && !isPasswordPolicyValid(manual)) {
      showToast(t('registerPasswordPolicyHint'), 'error');
      return;
    }
    const token = await getJwtAccessToken();
    if (!token) {
      const ok = await verifySuperAdminLogin(gateSaUsername, gateSaPassword);
      if (!ok) {
        showToast(t('systemAdminSuperAdminCredentialsIncorrect'), 'error');
        return;
      }
    }
    const u = passwordResetTarget;
    if (token) {
      const r = await resetStaffPortalPassword(u.id, manual.length > 0 ? { newPassword: manual } : {});
      if (!r.ok) {
        showToast(r.message || t('systemAdminPasswordResetFailed'), 'error');
        return;
      }
      setIssuedOneTimePassword(r.oneTimePassword);
      showToast(t('systemAdminPasswordResetIssued'), 'success');
      void refreshRemote();
      return;
    }
    const local = systemAdminActions.resetStaffLocalPassword(u.id);
    if (!local.ok) {
      showToast(local.error, 'error');
      return;
    }
    setIssuedOneTimePassword(local.password);
    showToast(t('systemAdminPasswordResetIssued'), 'success');
  };

  const onInviteSubmit = async () => {
    const name = inviteName.trim();
    const email = inviteEmail.trim();
    const username = inviteUsername.trim().toLowerCase();
    const portalPassword = invitePassword;
    const token = await getJwtAccessToken();

    const finishOk = (msg: string) => {
      setInviteName('');
      setInviteEmail('');
      setInviteUsername('');
      setInvitePassword('');
      setInviteRole('inspector');
      setAddUserModal(false);
      showToast(msg, 'success');
      void refreshRemote();
    };

    if (inviteRole === 'public_user') {
      showToast(t('systemAdminUsePublicRegistrationFlow'), 'error');
      return;
    }

    if (token) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast(t('systemAdminValidEmailForApiProvisioning'), 'error');
        return;
      }
      const roleKey = staffRoleToApiRoleKey(inviteRole);
      const trimmedPortalPassword = portalPassword.trim();
      if (trimmedPortalPassword.length > 0 && !isPasswordPolicyValid(trimmedPortalPassword)) {
        showToast(t('registerPasswordPolicyHint'), 'error');
        return;
      }
      const r = await createStaff({
        displayName: name,
        roleKey,
        email,
        preferredLocale: 'ps',
        ...(trimmedPortalPassword.length > 0
          ? { initialPassword: trimmedPortalPassword }
          : { status: 'pending' }),
      });
      if (r.ok) {
        systemAdminActions.upsertStaffMember(staffMemberToStaffUser(r.data));
        finishOk(t('systemAdminUserSavedDirectoryUpdated'));
        return;
      }
      const local = systemAdminActions.addStaffUser({
        name,
        email,
        role: inviteRole,
        username: username || email.split('@')[0] || 'user',
        portalPassword,
      });
      if (!local.ok) {
        showToast(r.message || local.error, 'error');
        return;
      }
      finishOk(t('systemAdminUserSavedLocally'));
      return;
    }

    const res = systemAdminActions.addStaffUser({
      name,
      email,
      role: inviteRole,
      username,
      portalPassword,
    });
    if (!res.ok) {
      showToast(res.error, 'error');
      return;
    }
    finishOk(t('systemAdminUserSavedDirectoryUpdated'));
  };

  const onOpenEditName = (u: StaffUser) => {
    setEditStaff(u);
    setEditDisplayName(u.name);
  };

  const onSaveDisplayName = async () => {
    if (!editStaff) return;
    const name = editDisplayName.trim();
    if (name.length < 2) {
      showToast(t('systemAdminEnterFullName'), 'error');
      return;
    }
    const token = await getJwtAccessToken();
    if (token && editStaff.portalPassword === MASK) {
      const r = await patchStaff(editStaff.id, { displayName: name });
      if (r.ok) {
        systemAdminActions.upsertStaffMember(staffMemberToStaffUser(r.data));
        setEditStaff(null);
        showToast(t('systemAdminDisplayNameUpdated'), 'success');
        void refreshRemote();
        return;
      }
      showToast(r.message, 'error');
      return;
    }
    systemAdminActions.upsertStaffMember({ ...editStaff, name });
    setEditStaff(null);
    showToast(t('systemAdminNameUpdatedLocally'), 'success');
  };

  const toggleStatus = async (u: StaffUser) => {
    const next: StaffUser['status'] = u.status === 'active' ? 'suspended' : 'active';
    const token = await getJwtAccessToken();
    if (token && u.portalPassword === MASK) {
      const r = await patchStaff(u.id, { status: next });
      if (r.ok) {
        systemAdminActions.upsertStaffMember(staffMemberToStaffUser(r.data));
        showToast(t('systemAdminUserStatusChanged', { name: u.name, status: next }), 'success');
        void refreshRemote();
        return;
      }
    }
    systemAdminActions.setStaffStatus(u.id, next);
    showToast(t('systemAdminUserStatusChanged', { name: u.name, status: next }), 'success');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: isDarkMode ? '#030712' : FormColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {lastRemoteError ? (
          <View
            style={[
              styles.syncWarn,
              { borderColor: borderC, backgroundColor: isDarkMode ? '#422006' : '#FFFBEB' },
            ]}>
            <Text style={[styles.syncWarnText, { color: isDarkMode ? '#FDE68A' : '#B45309', flex: 1 }]}>
              {t('saOfflineDataBanner')}
            </Text>
            <Pressable
              onPress={() => void refreshRemote()}
              style={styles.syncRetry}
              accessibilityRole="button"
              accessibilityLabel={t('systemAdminRetryDirectorySync')}>
              <Text style={styles.syncRetryLbl}>{t('certRetry')}</Text>
            </Pressable>
          </View>
        ) : null}
        {remoteBusy ? (
          <Text style={{ color: textMuted, fontSize: 11, marginBottom: spacing.xs }}>{t('systemAdminSyncingDirectory')}</Text>
        ) : null}

        <View style={[styles.mainCard, { backgroundColor: cardSurface, borderColor: borderC }]}>
          <View style={styles.mainCardHeader}>
            <View style={styles.directoryHeaderTop}>
              <View style={styles.titleBlock}>
                <Text style={[styles.h2, { color: textTitle }]}>{t('systemAdminUserDirectory')}</Text>
                <Text style={[styles.sub, { color: textMuted }]}>{t('systemAdminUserDirectoryHint')}</Text>
              </View>
              <AppPressable
                onPress={() => setAddUserModal(true)}
                style={styles.addRound}
                accessibilityLabel={t('systemAdminAddUser')}
                accessibilityRole="button">
                <Ionicons name="person-add" size={22} color={palette.white} />
              </AppPressable>
            </View>
            <CollapsibleFilters
              title={t('systemAdminFilters')}
              summary={`${filteredStaff.length} / ${data.staffUsers.length}`}
              activeCount={searchQuery.trim() ? 1 : 0}
              onReset={resetUserDirectorySearch}
              resetDisabled={!searchQuery.trim()}
              adminPalette={{
                cardBg: cardSurface,
                borderColor: borderC,
                titleColor: textTitle,
                mutedColor: textMuted,
                triggerIdleBg: isDarkMode ? '#1F2937' : FormColors.inputMutedFill,
                accentColor: Brand.green,
              }}
              style={styles.directoryFilters}>
              <View
                style={[styles.searchField, { borderColor: borderC, backgroundColor: isDarkMode ? '#1F2937' : FormColors.inputMutedFill }]}>
                <Ionicons name="search" size={18} color={textMuted} style={styles.searchIcon} />
                <TextInput
                  placeholder={t('saSearchPlaceholder')}
                  placeholderTextColor={textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={[styles.searchInput, { color: textTitle }]}
                />
              </View>
            </CollapsibleFilters>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={styles.tableScroll}
            style={styles.tableScrollWrap}>
            <View>
              <View style={[styles.thRow, { borderColor: borderC, backgroundColor: isDarkMode ? '#1F2937' : FormColors.inputMutedFill }]}>
                <Text style={[styles.th, styles.colName, { color: textMuted }]}>{t('systemAdminTableName')}</Text>
                <Text style={[styles.th, styles.colEmail, { color: textMuted }]}>{t('systemAdminTableEmail')}</Text>
                <Text style={[styles.th, styles.colUser, { color: textMuted }]}>{t('systemAdminTablePortalUser')}</Text>
                <Text style={[styles.th, styles.colRole, { color: textMuted }]}>{t('systemAdminTableRole')}</Text>
                <Text style={[styles.th, styles.colStatus, { color: textMuted }]}>{t('systemAdminTableStatus')}</Text>
                <Text style={[styles.th, styles.colActions, { color: textMuted }]}>{t('systemAdminTableActions')}</Text>
              </View>
              {filteredStaff.map((u) => (
                <View key={u.id} style={[styles.tr, { borderColor: borderC }]}>
                  <View style={[styles.td, styles.colName, styles.tdName]}>
                    <View style={styles.rowAvatar}>
                      <Text style={styles.rowAvatarText}>{initialsFromName(u.name)}</Text>
                    </View>
                    <Text style={[styles.tdNameText, { color: textTitle }]} numberOfLines={2}>
                      {u.name}
                    </Text>
                  </View>
                  <Text style={[styles.td, styles.colEmail, styles.tdMuted, { color: textMuted }]} numberOfLines={2}>
                    {u.email}
                  </Text>
                  <Text
                    style={[styles.td, styles.colUser, styles.mono, { color: textMuted }]}
                    numberOfLines={1}>
                    {u.username}
                  </Text>
                  <Text style={[styles.td, styles.colRole, { color: textTitle }]} numberOfLines={2}>
                    {staffRoleLabel(u.role)}
                  </Text>
                  <View style={[styles.td, styles.colStatus]}>
                    <View
                      style={[
                        styles.statusPill,
                        u.status === 'active' ? styles.stOk : u.status === 'suspended' ? styles.stBad : styles.stWarn,
                      ]}>
                      <Text
                        style={[
                          styles.statusPillText,
                          u.status === 'active' ? { color: '#047857' } : u.status === 'suspended' ? { color: '#B91C1C' } : { color: '#B45309' },
                        ]}>
                        {u.status}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.td, styles.colActions, styles.actionStack]}>
                    {u.role !== 'public_user' ? (
                      <Pressable onPress={() => openResetPassword(u)} hitSlop={6}>
                        <Text style={styles.linkAmber} numberOfLines={1}>
                          {t('systemAdminResetPassword')}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => void toggleStatus(u)} hitSlop={6}>
                      <Text style={styles.linkGreen} numberOfLines={1}>
                        {u.status === 'active' ? t('systemAdminSuspend') : t('systemAdminActivate')}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => onOpenEditName(u)} hitSlop={6}>
                      <Text style={styles.linkGreenSmall} numberOfLines={1}>
                        {t('systemAdminEditProfile')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
          {filteredStaff.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ color: textTitle, fontWeight: '700' }}>{t('systemAdminNoUsersMatchSearch')}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={editStaff !== null} animationType="slide" transparent onRequestClose={() => setEditStaff(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditStaff(null)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetTitle}>{t('systemAdminEditProfile')}</Text>
            <Text style={styles.sheetHint}>{t('systemAdminEditProfileHint')}</Text>
            <Field label={t('systemAdminFullName')} value={editDisplayName} onChangeText={setEditDisplayName} />
            <View style={styles.sheetActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditStaff(null)}>
                <Text style={styles.cancelBtnTxt}>{t('btnCancel')}</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={() => void onSaveDisplayName()}>
                <Text style={styles.saveBtnTxt}>{t('btnSave')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={addUserModal} animationType="slide" transparent onRequestClose={() => setAddUserModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAddUserModal(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetTitle}>{t('systemAdminAddUser')}</Text>
            <Text style={styles.sheetHint}>
              {t('systemAdminAddUserHint')}
            </Text>
            <Field label={t('systemAdminFullName')} value={inviteName} onChangeText={setInviteName} />
            <Field label={t('systemAdminEmailAddress')} value={inviteEmail} onChangeText={setInviteEmail} keyboardType="email-address" />
            <Field label={t('systemAdminPortalUsername')} value={inviteUsername} onChangeText={setInviteUsername} autoCapitalize="none" />
            <Field label={t('systemAdminPortalPassword')} value={invitePassword} onChangeText={setInvitePassword} secureTextEntry />
            <Text style={styles.fieldLbl}>{t('systemAdminRole')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rolePick}>
              {ADMIN_CREATABLE_ROLES.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setInviteRole(r)}
                  style={[styles.roleChip, inviteRole === r && styles.roleChipOn]}>
                  <Text style={[styles.roleChipTxt, inviteRole === r && styles.roleChipTxtOn]}>{staffRoleLabel(r)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.sheetActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setAddUserModal(false)}>
                <Text style={styles.cancelBtnTxt}>{t('btnCancel')}</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={() => void onInviteSubmit()}>
                <Text style={styles.saveBtnTxt}>{t('systemAdminSaveUser')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={passwordResetTarget !== null}
        animationType="slide"
        transparent
        onRequestClose={closeResetPasswordModal}>
        <Pressable style={styles.backdrop} onPress={closeResetPasswordModal} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetTitle}>{t('systemAdminResetPasswordTitle')}</Text>
            {passwordResetTarget ? (
              <>
                <View style={styles.warnBox}>
                  <Text style={styles.warnBoxText}>{t('systemAdminResetPasswordWarning')}</Text>
                </View>
                <View style={styles.kvBox}>
                  <Text style={styles.kvMuted}>{t('systemAdminName')}</Text>
                  <Text style={styles.kvStrong}>{passwordResetTarget.name}</Text>
                  <Text style={[styles.kvMuted, { marginTop: 8 }]}>{t('systemAdminUsername')}</Text>
                  <Text style={styles.kvMono}>{passwordResetTarget.username}</Text>
                </View>
                {!issuedOneTimePassword ? (
                  <>
                    <Text style={styles.sheetHint}>{t('systemAdminResetPasswordHint')}</Text>
                    <Field
                      label={t('systemAdminResetPasswordOptionalNew')}
                      value={resetManualPassword}
                      onChangeText={setResetManualPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                    {!resetSkipGate ? (
                      <>
                        <Text style={[styles.sheetHint, { marginTop: 8 }]}>{t('systemAdminConfirmSuperAdminSignin')}</Text>
                        <Field
                          label={t('systemAdminYourSuperAdminUsername')}
                          value={gateSaUsername}
                          onChangeText={setGateSaUsername}
                          autoCapitalize="none"
                        />
                        <Field
                          label={t('systemAdminYourSuperAdminPassword')}
                          value={gateSaPassword}
                          onChangeText={setGateSaPassword}
                          secureTextEntry
                        />
                      </>
                    ) : null}
                    <Pressable style={styles.saveBtn} onPress={() => void onConfirmPasswordReset()}>
                      <Text style={styles.saveBtnTxt}>{t('systemAdminResetPasswordConfirm')}</Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.secretBox}>
                    <Text style={styles.secretLbl}>{t('systemAdminNewTemporaryPassword')}</Text>
                    <Text style={styles.secretVal}>{issuedOneTimePassword}</Text>
                    <Text style={[styles.sheetHint, { marginTop: 10 }]}>{t('systemAdminOneTimePasswordHint')}</Text>
                  </View>
                )}
                <Pressable style={styles.cancelBtnWide} onPress={closeResetPasswordModal}>
                  <Text style={styles.cancelBtnTxt}>{t('deptCategoryClose')}</Text>
                </Pressable>
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLbl}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        style={styles.fieldInp}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  syncWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  syncWarnText: { fontSize: 12 },
  syncRetry: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FCD34D',
  },
  syncRetryLbl: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  mainCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.sm,
    overflow: 'hidden',
  },
  mainCardHeader: { padding: spacing.md, gap: spacing.md },
  directoryHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  directoryFilters: {
    marginTop: spacing.xs,
  },
  titleBlock: { flex: 1, gap: 4 },
  h2: { fontSize: 18, fontWeight: '800' },
  sub: { ...typography.bodySmall, fontSize: 12, lineHeight: 18 },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.sm,
  },
  searchIcon: { marginEnd: 6 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  addRound: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: 22,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableScrollWrap: { maxHeight: 720 },
  tableScroll: { paddingBottom: spacing.md },
  thRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  th: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  tr: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 72,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
  },
  td: { justifyContent: 'center' },
  tdName: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212,175,55,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAvatarText: { fontWeight: '800', color: Brand.green, fontSize: 11 },
  tdNameText: { fontSize: 13, fontWeight: '700', flex: 1, minWidth: 0 },
  tdMuted: { fontSize: 12 },
  mono: { fontSize: 11, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
  colName: { width: 200 },
  colEmail: { width: 200 },
  colUser: { width: 120 },
  colRole: { width: 200 },
  colStatus: { width: 100 },
  colActions: { width: 160 },
  actionStack: { gap: 6, alignItems: 'flex-start' },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  stOk: { backgroundColor: '#ECFDF5' },
  stBad: { backgroundColor: '#FEF2F2' },
  stWarn: { backgroundColor: '#FFFBEB' },
  statusPillText: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  linkAmber: { fontSize: 9, fontWeight: '800', color: '#92400E', textTransform: 'uppercase' },
  linkGreen: { fontSize: 9, fontWeight: '800', color: Brand.green, textTransform: 'uppercase' },
  linkGreenSmall: { fontSize: 9, fontWeight: '700', color: Brand.green, textTransform: 'uppercase' },
  empty: { padding: 40, alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  sheetHint: { fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 12 },
  fieldLbl: { fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 },
  fieldInp: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  rolePick: { gap: 8, paddingVertical: 4 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F3F4F6', marginEnd: 8 },
  roleChipOn: { backgroundColor: 'rgba(11,79,46,0.12)' },
  roleChipTxt: { fontSize: 12, fontWeight: '600', color: '#374151' },
  roleChipTxtOn: { color: Brand.green },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', alignItems: 'center' },
  cancelBtnTxt: { fontSize: 12, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Brand.green, alignItems: 'center' },
  saveBtnTxt: { fontSize: 12, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  kvBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 12 },
  kvMuted: { fontSize: 12, color: '#6B7280' },
  kvStrong: { fontSize: 15, fontWeight: '700', color: '#111827' },
  kvMono: { fontSize: 14, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
  warnBox: {
    backgroundColor: 'rgba(254,226,226,0.55)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FECACA',
  },
  warnBoxText: { fontSize: 12, color: '#991B1B', lineHeight: 18, fontWeight: '600' },
  secretBox: { backgroundColor: 'rgba(254,243,199,0.6)', borderRadius: 12, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: '#FDE68A' },
  secretLbl: { fontSize: 10, fontWeight: '800', color: '#92400E', textTransform: 'uppercase' },
  secretVal: { marginTop: 4, fontSize: 14, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
  cancelBtnWide: { marginTop: 12, paddingVertical: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', alignItems: 'center' },
});
