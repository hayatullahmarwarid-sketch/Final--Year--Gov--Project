/**
 * Shared storage adapter for admin/demo state — mirrors a `localStorage`-style API using AsyncStorage.
 * Use for code paths that should work with async storage on mobile (and sync test doubles).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const asyncStorageAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
  multiRemove: (keys: string[]) => AsyncStorage.multiRemove(keys),
};
