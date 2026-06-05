import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sharia_public_password_reset_jwt_v1';

/** Persists short-lived reset JWT so it survives stack remounts / navigation. */
export async function savePasswordResetSessionToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, token);
}

export async function peekPasswordResetSessionToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function clearPasswordResetSessionToken(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
