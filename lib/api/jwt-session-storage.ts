import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS = '@sharia_jwt_access_v1';
const REFRESH = '@sharia_jwt_refresh_v1';
// SecureStore has stricter key rules: non-empty and only [A-Za-z0-9._-]
const ACCESS_SS = 'sharia_jwt_access_v1';
const REFRESH_SS = 'sharia_jwt_refresh_v1';

let memAccess: string | null = null;
let memRefresh: string | null = null;
let persistByDefault = true;
let migratedFromAsyncStorage = false;

function isNative(): boolean {
  return Platform.OS !== 'web';
}

async function migrateAsyncStorageToSecureStoreOnce(): Promise<void> {
  if (!isNative()) return;
  if (migratedFromAsyncStorage) return;
  migratedFromAsyncStorage = true;
  try {
    const [a, r] = await AsyncStorage.multiGet([ACCESS, REFRESH]);
    const access = a?.[1] ?? null;
    const refresh = r?.[1] ?? null;
    if (access) await SecureStore.setItemAsync(ACCESS_SS, access, { keychainAccessible: SecureStore.WHEN_UNLOCKED });
    if (refresh) await SecureStore.setItemAsync(REFRESH_SS, refresh, { keychainAccessible: SecureStore.WHEN_UNLOCKED });
    if (access || refresh) await AsyncStorage.multiRemove([ACCESS, REFRESH]);
  } catch {
    // Best-effort migration; ignore.
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (isNative()) {
    await migrateAsyncStorageToSecureStoreOnce();
    const k = key === ACCESS ? ACCESS_SS : key === REFRESH ? REFRESH_SS : key;
    await SecureStore.setItemAsync(k, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isNative()) {
    await migrateAsyncStorageToSecureStoreOnce();
    const k = key === ACCESS ? ACCESS_SS : key === REFRESH ? REFRESH_SS : key;
    return await SecureStore.getItemAsync(k);
  }
  return await AsyncStorage.getItem(key);
}

async function removeItem(key: string): Promise<void> {
  if (isNative()) {
    await migrateAsyncStorageToSecureStoreOnce();
    const k = key === ACCESS ? ACCESS_SS : key === REFRESH ? REFRESH_SS : key;
    await SecureStore.deleteItemAsync(k);
    return;
  }
  await AsyncStorage.removeItem(key);
}

export function setJwtPersistenceDefault(persist: boolean): void {
  persistByDefault = persist;
}

export async function saveJwtTokens(
  accessToken: string,
  refreshToken: string,
  options?: { persist?: boolean },
): Promise<void> {
  const persist = options?.persist ?? persistByDefault;
  persistByDefault = persist;

  memAccess = accessToken;
  memRefresh = refreshToken;

  if (!persist) return;

  await Promise.all([setItem(ACCESS, accessToken), setItem(REFRESH, refreshToken)]);
}

export async function clearJwtTokens(): Promise<void> {
  memAccess = null;
  memRefresh = null;
  await Promise.all([removeItem(ACCESS), removeItem(REFRESH)]);
}

export async function getJwtAccessToken(): Promise<string | null> {
  try {
    if (memAccess) return memAccess;
    const stored = await getItem(ACCESS);
    if (stored) memAccess = stored;
    return stored;
  } catch {
    return null;
  }
}

export async function getJwtRefreshToken(): Promise<string | null> {
  try {
    if (memRefresh) return memRefresh;
    const stored = await getItem(REFRESH);
    if (stored) memRefresh = stored;
    return stored;
  } catch {
    return null;
  }
}
