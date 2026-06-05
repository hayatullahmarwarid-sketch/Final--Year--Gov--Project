import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuthSession } from '@/contexts/auth-session-context';
import {
  PASSWORD_STORAGE_KEY_LEGACY,
  PROFILE_STORAGE_KEY_LEGACY,
  passwordStorageKey,
  PREAUTH_ACCOUNT_SCOPE,
  profileStorageKey,
} from '@/lib/user-scoped-storage-keys';

export type UserGender = 'male' | 'female';

export type UserProfile = {
  fullName: string;
  avatarUri: string;
  province: string;
  district: string;
  gender: UserGender;
  /** ISO string set at registration time (local profile field). */
  createdAt: string;
};

const LEGACY_DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80&auto=format&fit=crop';

export const DEFAULT_USER_PROFILE: UserProfile = {
  fullName: '',
  avatarUri: '',
  province: '',
  district: '',
  gender: 'male',
  createdAt: '',
};

type UserProfileContextValue = {
  profile: UserProfile;
  hydrated: boolean;
  setProfile: (patch: Partial<UserProfile>) => void;
  replaceProfile: (next: UserProfile) => void;
  /** True once local saved password has been read from storage (may be null if never set). */
  passwordHydrated: boolean;
  /** Whether the user has previously saved an app password (change-password / login sync). */
  hasSavedPassword: boolean;
  /** Persist new password after validating current. Returns `bad_old` if current does not match saved password. */
  updateAccountPassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: true } | { ok: false; error: 'bad_old' | 'storage' }>;
  /** Called after successful registration — stores the password the user chose (no prior password check). */
  saveRegisteredPassword: (password: string) => Promise<void>;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

function storageScope(accountKey: string | null): string {
  return accountKey ?? PREAUTH_ACCOUNT_SCOPE;
}

function sanitizeLoadedProfile(raw: unknown): UserProfile {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_USER_PROFILE };
  const o = raw as Record<string, unknown>;
  const gender: UserGender = o.gender === 'female' ? 'female' : 'male';
  const rawAvatar = typeof o.avatarUri === 'string' ? o.avatarUri.trim() : '';
  const avatarUri = rawAvatar && rawAvatar !== LEGACY_DEFAULT_AVATAR ? rawAvatar : '';
  const createdAt = typeof o.createdAt === 'string' ? o.createdAt.trim() : '';
  return {
    fullName:
      typeof o.fullName === 'string' && o.fullName.trim()
        ? o.fullName.trim()
        : DEFAULT_USER_PROFILE.fullName,
    avatarUri,
    province:
      typeof o.province === 'string' && o.province.trim() ? o.province.trim() : DEFAULT_USER_PROFILE.province,
    district:
      typeof o.district === 'string' && o.district.trim() ? o.district.trim() : DEFAULT_USER_PROFILE.district,
    gender,
    createdAt,
  };
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { hydrated: authHydrated, accountKey } = useAuthSession();
  const scope = storageScope(accountKey);
  const [profile, setProfileState] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [hydrated, setHydrated] = useState(false);
  const [savedAccountPassword, setSavedAccountPassword] = useState<string | null>(null);
  const [passwordHydrated, setPasswordHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!authHydrated) return;
    setHydrated(false);
    setPasswordHydrated(false);
    (async () => {
      try {
        const pKey = profileStorageKey(scope);
        const pwKey = passwordStorageKey(scope);
        let rawProfile = await AsyncStorage.getItem(pKey);
        let rawPassword = await AsyncStorage.getItem(pwKey);

        if (!rawProfile && scope !== PREAUTH_ACCOUNT_SCOPE) {
          const legacyP = await AsyncStorage.getItem(PROFILE_STORAGE_KEY_LEGACY);
          if (legacyP) {
            rawProfile = legacyP;
            await AsyncStorage.setItem(pKey, legacyP);
            await AsyncStorage.removeItem(PROFILE_STORAGE_KEY_LEGACY);
          }
        }
        if (rawPassword === null && scope !== PREAUTH_ACCOUNT_SCOPE) {
          const legacyPw = await AsyncStorage.getItem(PASSWORD_STORAGE_KEY_LEGACY);
          if (legacyPw !== null && legacyPw.length > 0) {
            rawPassword = legacyPw;
            await AsyncStorage.setItem(pwKey, legacyPw);
            await AsyncStorage.removeItem(PASSWORD_STORAGE_KEY_LEGACY);
          }
        }

        if (cancelled) return;
        if (rawProfile) {
          try {
            const parsed = JSON.parse(rawProfile) as unknown;
            setProfileState(sanitizeLoadedProfile(parsed));
          } catch {
            setProfileState({ ...DEFAULT_USER_PROFILE });
          }
        } else {
          setProfileState({ ...DEFAULT_USER_PROFILE });
        }
        if (rawPassword !== null && rawPassword.length > 0) {
          setSavedAccountPassword(rawPassword);
        } else {
          setSavedAccountPassword(null);
        }
      } catch {
        if (!cancelled) {
          setProfileState({ ...DEFAULT_USER_PROFILE });
          setSavedAccountPassword(null);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setPasswordHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHydrated, scope]);

  const persistProfile = useCallback(async (next: UserProfile) => {
    try {
      await AsyncStorage.setItem(profileStorageKey(scope), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [scope]);

  const setProfile = useCallback(
    (patch: Partial<UserProfile>) => {
      setProfileState((prev) => {
        const next = { ...prev, ...patch };
        void persistProfile(next);
        return next;
      });
    },
    [persistProfile],
  );

  const replaceProfile = useCallback(
    (next: UserProfile) => {
      setProfileState(next);
      void persistProfile(next);
    },
    [persistProfile],
  );

  const updateAccountPassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
    ): Promise<{ ok: true } | { ok: false; error: 'bad_old' | 'storage' }> => {
      const cur = currentPassword;
      if (savedAccountPassword !== null) {
        if (cur !== savedAccountPassword) {
          return { ok: false, error: 'bad_old' };
        }
      } else if (cur.length > 0) {
        return { ok: false, error: 'bad_old' };
      }
      try {
        await AsyncStorage.setItem(passwordStorageKey(scope), newPassword);
        setSavedAccountPassword(newPassword);
        return { ok: true };
      } catch {
        return { ok: false, error: 'storage' };
      }
    },
    [savedAccountPassword, scope],
  );

  const hasSavedPassword = savedAccountPassword !== null;

  const saveRegisteredPassword = useCallback(
    async (password: string) => {
      try {
        await AsyncStorage.setItem(passwordStorageKey(scope), password);
        setSavedAccountPassword(password);
      } catch {
        /* ignore */
      }
    },
    [scope],
  );

  const value = useMemo(
    () => ({
      profile,
      hydrated: hydrated && authHydrated,
      setProfile,
      replaceProfile,
      passwordHydrated,
      hasSavedPassword,
      updateAccountPassword,
      saveRegisteredPassword,
    }),
    [
      profile,
      hydrated,
      authHydrated,
      setProfile,
      replaceProfile,
      passwordHydrated,
      hasSavedPassword,
      updateAccountPassword,
      saveRegisteredPassword,
    ],
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return ctx;
}
