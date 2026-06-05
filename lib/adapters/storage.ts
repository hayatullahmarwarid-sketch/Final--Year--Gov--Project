import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Async key-value storage with the same method names as `localStorage`.
 * On React Native, `getItem` / `setItem` / `removeItem` return Promises (web `Storage` is synchronous).
 */
export const storage = {
  getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },
  setItem(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  },
  removeItem(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  },
  clear(): Promise<void> {
    return AsyncStorage.clear();
  },
};
