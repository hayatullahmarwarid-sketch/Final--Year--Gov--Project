import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  I18nManager,
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
import { FormColors } from '@/constants/form';
import { shadowPrimary } from '@/lib/theme';
import { HomeColors } from '@/constants/home';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useUserProfile } from '@/contexts/user-profile-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useRedirectNonPublicFromPublicRoutes } from '@/hooks/use-redirect-non-public-from-public-routes';

const LINK = Brand.green;

function profileInitials(fullName: string): string {
  const n = fullName.trim();
  if (!n) return '';
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = (parts.length >= 2 ? parts[1]?.[0] : parts[0]?.[1]) ?? '';
  return (first + second).toUpperCase();
}

/**
 * Edit profile: name, photo, read-only account email (change via dedicated flow).
 * Province, district, and gender are display-only (disabled).
 */
export default function EditProfileScreen() {
  useRedirectNonPublicFromPublicRoutes();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useAppTranslation();
  const horizontal = width < 360 ? 14 : 18;
  const { profile, hydrated, setProfile } = useUserProfile();
  const { sessionEmail } = useAuthSession();

  const [fullName, setFullName] = useState(profile.fullName);
  const [avatarUri, setAvatarUri] = useState(profile.avatarUri);

  useEffect(() => {
    if (!hydrated) return;
    setFullName(profile.fullName);
    setAvatarUri(profile.avatarUri);
  }, [hydrated, profile.fullName, profile.avatarUri]);

  const nameOk = fullName.trim().length >= 2;
  const canSave = nameOk;

  const pickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('alertPermissionPhotosTitle'), t('alertPermissionPhotosProfile'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      void Haptics.selectionAsync();
      setAvatarUri(res.assets[0].uri);
    }
  }, [t]);

  const onSave = () => {
    if (!canSave) return;
    const name = fullName.trim();
    setProfile({ fullName: name, avatarUri });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const openChangeAccountEmail = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/change-account-email');
  };

  const goBack = () => {
    router.back();
  };

  const displayEmail = sessionEmail?.trim() || t('changeAccountEmailUnknown');

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingHorizontal: horizontal }]}>
        <Pressable
          onPress={goBack}
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
          {t('editProfileTitle')}
        </Text>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('a11yCancel')}>
          <Text style={styles.headerCancel} maxFontSizeMultiplier={1.1}>
            {t('btnCancel')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontal, paddingBottom: 24 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel={t('a11yChangePhoto')}>
            <View style={styles.avatarRing}>
              {avatarUri?.trim() ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} contentFit="cover" transition={200} />
              ) : (
                <View style={[styles.avatarImg, styles.avatarInitials]}>
                  <Text style={styles.avatarInitialsText} maxFontSizeMultiplier={1.1}>
                    {profileInitials(fullName) || '—'}
                  </Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </View>
          </Pressable>
          <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel={t('a11yChangePhoto')}>
            <Text style={styles.changePhoto} maxFontSizeMultiplier={1.1}>
              {t('editProfileChangePhoto')}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.1}>
          {t('registerFullName')}
        </Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder={t('editProfileFullNamePh')}
          placeholderTextColor={FormColors.placeholder}
          autoCapitalize="words"
          accessibilityLabel={t('registerFullName')}
        />

        <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.1}>
          Change Email
        </Text>
        <View style={styles.emailRow}>
          <TextInput
            style={[styles.input, styles.emailInput]}
            value={displayEmail}
            editable={false}
            selectTextOnFocus={false}
            accessibilityLabel="Change Email"
          />
          <Pressable
            onPress={openChangeAccountEmail}
            style={styles.changeLinkWrap}
            accessibilityRole="button"
            accessibilityLabel={t('a11yChangeAccountEmail')}>
            <Text style={styles.changeLink} maxFontSizeMultiplier={1.05}>
              {t('editProfileChange')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.row2}>
          <View style={styles.row2Col}>
            <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.1}>
              {t('registerProvince')}
            </Text>
            <View style={styles.fakeSelect} pointerEvents="none">
              <Text style={styles.fakeSelectText} maxFontSizeMultiplier={1.05}>
                {profile.province}
              </Text>
              <Ionicons name="chevron-down" size={18} color={FormColors.placeholder} />
            </View>
          </View>
          <View style={styles.row2Col}>
            <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.1}>
              {t('editProfileDistrict')}
            </Text>
            <View style={styles.fakeSelect} pointerEvents="none">
              <Text style={styles.fakeSelectText} maxFontSizeMultiplier={1.05}>
                {profile.district}
              </Text>
              <Ionicons name="chevron-down" size={18} color={FormColors.placeholder} />
            </View>
          </View>
        </View>

        <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.1}>
          {t('registerGender')}
        </Text>
        <View style={styles.genderRow} pointerEvents="none">
          <View
            style={[
              styles.genderCard,
              profile.gender === 'male' ? styles.genderCardOn : styles.genderCardOff,
            ]}>
            <View style={[styles.radioOuter, profile.gender === 'male' && styles.radioOuterOn]}>
              {profile.gender === 'male' ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
            </View>
            <Text style={styles.genderLabel} maxFontSizeMultiplier={1.05}>
              {t('registerMale')}
            </Text>
          </View>
          <View
            style={[
              styles.genderCard,
              profile.gender === 'female' ? styles.genderCardOn : styles.genderCardOff,
            ]}>
            <View style={[styles.radioOuter, profile.gender === 'female' && styles.radioOuterOn]}>
              {profile.gender === 'female' ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
            </View>
            <Text style={styles.genderLabel} maxFontSizeMultiplier={1.05}>
              {t('registerFemale')}
            </Text>
          </View>
        </View>

        <Pressable style={styles.outlineBtn} onPress={goBack} accessibilityRole="button">
          <Text style={styles.outlineBtnLabel} maxFontSizeMultiplier={1.1}>
            {t('btnCancel')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.primaryBtn, !canSave && styles.btnDisabled]}
          onPress={onSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}>
          <Ionicons name="checkmark" size={20} color={canSave ? '#fff' : FormColors.disabledButtonText} />
          <Text style={[styles.primaryBtnLabel, !canSave && styles.primaryBtnLabelOff]} maxFontSizeMultiplier={1.1}>
            {t('editProfileSaveChanges')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: HomeColors.pageBg,
  },
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
  headerCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 56,
    textAlign: 'right',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarRing: {
    position: 'relative',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: Brand.gold,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  avatarInitialsText: {
    color: HomeColors.decreeTitle,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    end: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  changePhoto: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: LINK,
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
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  emailInput: {
    flex: 1,
    marginBottom: 0,
    color: FormColors.subtitle,
    backgroundColor: FormColors.inputMutedFill,
  },
  changeLinkWrap: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  changeLink: {
    fontSize: 15,
    fontWeight: '700',
    color: LINK,
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  row2Col: {
    flex: 1,
  },
  fakeSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: FormColors.inputMutedFill,
    borderWidth: 1,
    borderColor: FormColors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    marginBottom: 16,
    opacity: 0.68,
  },
  fakeSelectText: {
    fontSize: 15,
    color: FormColors.subtitle,
    fontWeight: '500',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
    opacity: 0.72,
  },
  genderCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  genderCardOn: {
    backgroundColor: FormColors.iconMint,
    borderColor: Brand.green,
  },
  genderCardOff: {
    backgroundColor: '#fff',
    borderColor: FormColors.border,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterOn: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: FormColors.title,
  },
  outlineBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: FormColors.border,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 52,
    justifyContent: 'center',
  },
  outlineBtnLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: FormColors.label,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.green,
    borderRadius: 12,
    paddingVertical: 15,
    minHeight: 52,
    ...shadowPrimary(),
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
