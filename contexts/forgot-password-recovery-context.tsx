import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearPasswordResetSessionToken,
  peekPasswordResetSessionToken,
  savePasswordResetSessionToken,
} from '@/lib/public-password-reset-session';

export type PendingPasswordReset = { email: string; token: string };

type ForgotPasswordRecoveryContextValue = {
  /** False only until AsyncStorage has been read once (avoid false “missing token” alerts). */
  passwordResetHydrated: boolean;
  passwordResetToken: string | null;
  setPasswordResetToken: (token: string | null) => void;
  clearPasswordResetToken: () => void;
  /** In-memory: email + reset token between forgot-password verify → reset steps. */
  pendingPasswordReset: PendingPasswordReset | null;
  setPendingPasswordReset: (value: PendingPasswordReset | null) => void;
};

const ForgotPasswordRecoveryContext = createContext<ForgotPasswordRecoveryContextValue | null>(null);

export function ForgotPasswordRecoveryProvider({ children }: { children: React.ReactNode }) {
  const [passwordResetToken, setToken] = useState<string | null>(null);
  const [passwordResetHydrated, setHydrated] = useState(false);
  const [pendingPasswordReset, setPendingPasswordReset] = useState<PendingPasswordReset | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const t = await peekPasswordResetSessionToken();
      if (alive) {
        if (t) setToken(t);
        setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setPasswordResetToken = useCallback((t: string | null) => {
    setToken(t);
    if (t) {
      void savePasswordResetSessionToken(t);
    } else {
      void clearPasswordResetSessionToken();
    }
  }, []);

  const clearPasswordResetToken = useCallback(() => {
    setToken(null);
    void clearPasswordResetSessionToken();
  }, []);

  const value = useMemo(
    () => ({
      passwordResetHydrated,
      passwordResetToken,
      setPasswordResetToken,
      clearPasswordResetToken,
      pendingPasswordReset,
      setPendingPasswordReset,
    }),
    [
      passwordResetHydrated,
      passwordResetToken,
      setPasswordResetToken,
      clearPasswordResetToken,
      pendingPasswordReset,
    ],
  );

  return (
    <ForgotPasswordRecoveryContext.Provider value={value}>{children}</ForgotPasswordRecoveryContext.Provider>
  );
}

export function useForgotPasswordRecovery() {
  const ctx = useContext(ForgotPasswordRecoveryContext);
  if (!ctx) {
    throw new Error('useForgotPasswordRecovery must be used within ForgotPasswordRecoveryProvider');
  }
  return ctx;
}
