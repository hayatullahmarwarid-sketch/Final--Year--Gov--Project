import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  notificationSettingsStorageKey,
  passwordStorageKey,
  PREAUTH_ACCOUNT_SCOPE,
  profileStorageKey,
  publicUserDataStorageKey,
} from '@/lib/user-scoped-storage-keys';

/**
 * After a public account key is established, copy onboarding profile/password from the
 * pre-auth bucket so the signed-in user keeps their registration data.
 */
export async function migratePreauthProfileAndPasswordTo(targetScope: string): Promise<void> {
  const fromP = profileStorageKey(PREAUTH_ACCOUNT_SCOPE);
  const toP = profileStorageKey(targetScope);
  const fromPw = passwordStorageKey(PREAUTH_ACCOUNT_SCOPE);
  const toPw = passwordStorageKey(targetScope);
  const [draftProfile, draftPw, existing] = await Promise.all([
    AsyncStorage.getItem(fromP),
    AsyncStorage.getItem(fromPw),
    AsyncStorage.getItem(toP),
  ]);
  if (existing) {
    if (draftProfile) await AsyncStorage.removeItem(fromP);
    if (draftPw) await AsyncStorage.removeItem(fromPw);
    return;
  }
  if (draftProfile) {
    await AsyncStorage.setItem(toP, draftProfile);
    await AsyncStorage.removeItem(fromP);
  }
  if (draftPw) {
    await AsyncStorage.setItem(toPw, draftPw);
    await AsyncStorage.removeItem(fromPw);
  }
}

/**
 * When a public user's login email changes, scoped AsyncStorage keys move from the old
 * `pub_email_*` scope to the new one so profile, password, bookmarks cache, and settings follow.
 */
export async function migratePublicAccountScopedStorage(fromScope: string, toScope: string): Promise<void> {
  if (!fromScope || !toScope || fromScope === toScope) return;
  const keysFor = (scope: string) => [
    profileStorageKey(scope),
    passwordStorageKey(scope),
    publicUserDataStorageKey(scope),
    notificationSettingsStorageKey(scope),
  ];
  const fromKeys = keysFor(fromScope);
  const toKeys = keysFor(toScope);
  for (let i = 0; i < fromKeys.length; i++) {
    const raw = await AsyncStorage.getItem(fromKeys[i]);
    if (!raw) continue;
    const existing = await AsyncStorage.getItem(toKeys[i]);
    if (existing) continue;
    await AsyncStorage.setItem(toKeys[i], raw);
  }
  await AsyncStorage.multiRemove(fromKeys);
}
