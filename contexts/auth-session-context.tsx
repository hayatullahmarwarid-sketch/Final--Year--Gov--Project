import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { readPersistedAppLanguageFromStorage, useAppLanguage } from '@/contexts/app-language-context';
import { migratePreauthProfileAndPasswordTo } from '@/lib/migrate-preauth-profile';
import { getBackendAuthMe } from '@/lib/api/auth-jwt';
import {
  clearJwtTokens,
  getJwtAccessToken,
  getJwtRefreshToken,
  saveJwtTokens,
  setJwtPersistenceDefault,
} from '@/lib/api/jwt-session-storage';
import { mapBackendRoleKeyToAuthSessionRole } from '@/lib/auth-backend-role-map';
import { backendPreferredToAppLanguageId } from '@/lib/language-backend-map';
import { postBackendLogout } from '@/lib/api/auth-logout';
import { unregisterAllDevices } from '@/lib/api/devices';
import {
  DEPT_UPLOAD_ACCOUNT_KEY,
  deptUploadAccountKeyFromEmail,
  inspectorAccountKeyFromUsername,
  inspectorAdminAccountKeyFromUsername,
  publicAccountKeyFromEmail,
  systemAdminAccountKeyFromUsername,
} from '@/lib/user-scoped-storage-keys';

const STORAGE_KEY_ROLE = '@sharia_auth_session_role_v1';
const STORAGE_KEY_ACCOUNT = '@sharia_auth_account_key_v1';
const STORAGE_KEY_SESSION_EMAIL = '@sharia_session_email_v1';

void SplashScreen.preventAutoHideAsync();

export type AuthSessionRole =
  | 'public'
  | 'dept_upload'
  | 'inspector'
  | 'system_admin'
  | 'inspector_admin';

type AuthSessionContextValue = {
  hydrated: boolean;
  /** `null` = logged out */
  role: AuthSessionRole | null;
  /**
   * Stable id for scoping local data (notifications, bookmarks, exam history, profile).
   * `null` when logged out.
   */
  accountKey: string | null;
  /** Lowercased account email when known (JWT user or public email-only session). */
  sessionEmail: string | null;
  /** Public offline / demo sign-in: pass the same email address used on the login screen. */
  signInAsPublic: (email: string) => Promise<void>;
  signInAsDeptUpload: () => Promise<void>;
  signInAsInspector: (username: string) => Promise<void>;
  signInAsSystemAdmin: (username: string) => Promise<void>;
  signInAsInspectorAdmin: (username: string) => Promise<void>;
  /**
   * After a successful `POST /api/v1/auth/login` — stores JWTs and sets role + scoped `accountKey`
   * from the backend `roleKey` (e.g. `system_admin` → session `system_admin`).
   */
  signInFromBackendJwt: (args: {
    accessToken: string;
    refreshToken: string;
    role: AuthSessionRole;
    emailForScope: string;
    /** When present, persists app language (`user-language`) to match the account. */
    preferredLanguage?: string | null;
    /**
     * Native "Remember me": when false, tokens are kept in-memory only and won't auto-restore
     * after a full app restart.
     */
    remember?: boolean;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function isAuthRole(raw: string | null): raw is AuthSessionRole {
  return (
    raw === 'public' ||
    raw === 'dept_upload' ||
    raw === 'inspector' ||
    raw === 'system_admin' ||
    raw === 'inspector_admin'
  );
}

function accountKeyForBackendSession(role: AuthSessionRole, emailOrUsername: string): string {
  const id = emailOrUsername.trim();
  switch (role) {
    case 'public':
      return publicAccountKeyFromEmail(id);
    case 'dept_upload':
      return deptUploadAccountKeyFromEmail(id);
    case 'inspector':
      return inspectorAccountKeyFromUsername(id);
    case 'system_admin':
      return systemAdminAccountKeyFromUsername(id);
    case 'inspector_admin':
      return inspectorAdminAccountKeyFromUsername(id);
  }
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const { setLanguage } = useAppLanguage();
  const setLanguageRef = useRef(setLanguage);
  setLanguageRef.current = setLanguage;

  const [role, setRole] = useState<AuthSessionRole | null>(null);
  const [accountKey, setAccountKey] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const persistSessionEmail = useCallback(async (email: string | null) => {
    try {
      if (!email) {
        await AsyncStorage.removeItem(STORAGE_KEY_SESSION_EMAIL);
        setSessionEmail(null);
      } else {
        const e = email.trim().toLowerCase();
        await AsyncStorage.setItem(STORAGE_KEY_SESSION_EMAIL, e);
        setSessionEmail(e);
      }
    } catch {
      setSessionEmail(email ? email.trim().toLowerCase() : null);
    }
  }, []);

  const persist = useCallback(async (nextRole: AuthSessionRole | null, nextKey: string | null) => {
    try {
      if (nextRole === null) {
        await AsyncStorage.multiRemove([STORAGE_KEY_ROLE, STORAGE_KEY_ACCOUNT, STORAGE_KEY_SESSION_EMAIL]);
        setSessionEmail(null);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY_ROLE, nextRole);
        if (nextKey) {
          await AsyncStorage.setItem(STORAGE_KEY_ACCOUNT, nextKey);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rawRole, rawKey, accessToken, refreshToken] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_ROLE),
          AsyncStorage.getItem(STORAGE_KEY_ACCOUNT),
          getJwtAccessToken(),
          getJwtRefreshToken(),
        ]);
        if (cancelled) return;

        let nextRole: AuthSessionRole | null = null;
        if (isAuthRole(rawRole)) {
          nextRole = rawRole;
        }
        let nextKey = rawKey && rawKey.length > 0 ? rawKey : null;

        const hasJwt = Boolean(accessToken?.length || refreshToken?.length);

        if (hasJwt) {
          const me = await getBackendAuthMe();

          if (me.ok && me.data.user.role) {
            const mapped = mapBackendRoleKeyToAuthSessionRole(me.data.user.role);
            if (mapped) {
              const scopeEmail = me.data.user.email?.trim() || '';
              const key = accountKeyForBackendSession(mapped, scopeEmail || nextKey || '');
              await persist(mapped, key);
              setRole(mapped);
              setAccountKey(key);
              const em = me.data.user.email?.trim().toLowerCase() || '';
              await persistSessionEmail(em || null);
              if (mapped === 'public') {
                await migratePreauthProfileAndPasswordTo(key);
              }
              const appId = backendPreferredToAppLanguageId(me.data.user.preferredLanguage ?? undefined);
              if (appId) {
                const storedUiLang = await readPersistedAppLanguageFromStorage();
                if (!storedUiLang) setLanguageRef.current(appId);
              }
            } else {
              await clearJwtTokens();
              await persist(null, null);
              setRole(null);
              setAccountKey(null);
            }
          } else {
            await clearJwtTokens();
            await persist(null, null);
            setRole(null);
            setAccountKey(null);
          }
        } else {
          if (nextRole && !nextKey) {
            const legacyKey =
              nextRole === 'public'
                ? 'pub_legacy_device'
                : nextRole === 'inspector'
                  ? 'insp_legacy_device'
                  : nextRole === 'dept_upload'
                    ? 'dept_legacy_device'
                    : nextRole === 'system_admin'
                      ? 'sys_legacy_device'
                      : 'inspadm_legacy_device';
            nextKey = legacyKey;
            await AsyncStorage.setItem(STORAGE_KEY_ACCOUNT, legacyKey);
          }
          setRole(nextRole);
          setAccountKey(nextKey);
          try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY_SESSION_EMAIL);
            if (!cancelled) {
              setSessionEmail(stored && stored.length > 0 ? stored.trim().toLowerCase() : null);
            }
          } catch {
            if (!cancelled) setSessionEmail(null);
          }
        }
      } catch {
        if (!cancelled) {
          setRole(null);
          setAccountKey(null);
          setSessionEmail(null);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
          void SplashScreen.hideAsync();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persist, persistSessionEmail]);

  const signInAsPublic = useCallback(
    async (email: string) => {
      const trimmed = email.trim().toLowerCase();
      const key = publicAccountKeyFromEmail(trimmed);
      await migratePreauthProfileAndPasswordTo(key);
      setRole('public');
      setAccountKey(key);
      await persist('public', key);
      await persistSessionEmail(trimmed);
    },
    [persist, persistSessionEmail],
  );

  const signInAsDeptUpload = useCallback(async () => {
    const key = DEPT_UPLOAD_ACCOUNT_KEY;
    setRole('dept_upload');
    setAccountKey(key);
    await persist('dept_upload', key);
  }, [persist]);

  const signInAsInspector = useCallback(
    async (username: string) => {
      const key = inspectorAccountKeyFromUsername(username);
      setRole('inspector');
      setAccountKey(key);
      await persist('inspector', key);
    },
    [persist],
  );

  const signInAsSystemAdmin = useCallback(
    async (username: string) => {
      const key = systemAdminAccountKeyFromUsername(username);
      setRole('system_admin');
      setAccountKey(key);
      await persist('system_admin', key);
    },
    [persist],
  );

  const signInAsInspectorAdmin = useCallback(
    async (username: string) => {
      const key = inspectorAdminAccountKeyFromUsername(username);
      setRole('inspector_admin');
      setAccountKey(key);
      await persist('inspector_admin', key);
    },
    [persist],
  );

  const signInFromBackendJwt = useCallback(
    async (args: {
      accessToken: string;
      refreshToken: string;
      role: AuthSessionRole;
      emailForScope: string;
      preferredLanguage?: string | null;
      remember?: boolean;
    }) => {
      const email = args.emailForScope.trim();
      const key = accountKeyForBackendSession(args.role, email);
      const remember = args.remember !== false;
      setJwtPersistenceDefault(remember);
      await saveJwtTokens(args.accessToken, args.refreshToken, { persist: remember });
      if (args.role === 'public') {
        await migratePreauthProfileAndPasswordTo(key);
      }
      setRole(args.role);
      setAccountKey(key);
      if (remember) {
        await persist(args.role, key);
        const em = args.emailForScope.trim().toLowerCase();
        await persistSessionEmail(em.includes('@') ? em : null);
      } else {
        await persist(null, null);
        await persistSessionEmail(null);
      }
      const appId = backendPreferredToAppLanguageId(args.preferredLanguage ?? undefined);
      if (appId) {
        const storedUiLang = await readPersistedAppLanguageFromStorage();
        if (!storedUiLang) setLanguageRef.current(appId);
      }
    },
    [persist, persistSessionEmail],
  );

  const signOut = useCallback(async () => {
    try {
      await unregisterAllDevices();
    } catch {
      // Best-effort push credential cleanup; ignore failures.
    }
    try {
      const refresh = await getJwtRefreshToken();
      if (refresh?.trim()) {
        await postBackendLogout({ refreshToken: refresh });
      }
    } catch {
      // Ignore network/server failures; always clear local session.
    }
    setRole(null);
    setAccountKey(null);
    setSessionEmail(null);
    await clearJwtTokens();
    await persist(null, null);
  }, [persist]);

  const value = useMemo(
    () => ({
      hydrated,
      role,
      accountKey,
      sessionEmail,
      signInAsPublic,
      signInAsDeptUpload,
      signInAsInspector,
      signInAsSystemAdmin,
      signInAsInspectorAdmin,
      signInFromBackendJwt,
      signOut,
    }),
    [
      hydrated,
      role,
      accountKey,
      sessionEmail,
      signInAsPublic,
      signInAsDeptUpload,
      signInAsInspector,
      signInAsSystemAdmin,
      signInAsInspectorAdmin,
      signInFromBackendJwt,
      signOut,
    ],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }
  return ctx;
}
