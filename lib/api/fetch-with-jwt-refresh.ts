/**
 * Shared JWT access-token refresh for authenticated API calls.
 * Backend returns 401 "Access token expired" when the short-lived access JWT lapses;
 * this module exchanges the stored refresh token once and retries the request.
 */
import { postBackendTokenRefresh } from '@/lib/api/auth-token-refresh';
import { clearJwtTokens, getJwtAccessToken, getJwtRefreshToken, saveJwtTokens } from '@/lib/api/jwt-session-storage';
import { bumpActivity, msSinceActivity } from '@/lib/session/activity-tracker';
import { getDeptSessionTimeoutMinutes } from '@/lib/session/dept-session-policy';

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Calls `POST /api/v1/auth/refresh` using the stored refresh token and saves the new pair.
 * Concurrent callers share one in-flight refresh to avoid refresh-token reuse races.
 */
export function rotateStoredRefreshToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const refresh = await getJwtRefreshToken();
        if (!refresh?.trim()) return false;
        const out = await postBackendTokenRefresh({ refreshToken: refresh });
        if (!out.ok) return false;
        await saveJwtTokens(out.data.accessToken, out.data.refreshToken);
        bumpActivity();
        return true;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/**
 * `fetch` with Bearer from storage; on HTTP 401 performs at most one refresh + retry.
 * Preserves method, body, and non-Authorization headers from `init`.
 */
export async function fetchWithJwtRefresh(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const access = await getJwtAccessToken();
  if (access) headers.set('Authorization', `Bearer ${access}`);

  let res = await fetch(url, { ...init, headers });

  if (res.ok) {
    bumpActivity();
  }

  if (res.status !== 401) return res;

  const deptTimeout = getDeptSessionTimeoutMinutes();
  if (deptTimeout != null) {
    const limitMs = deptTimeout * 60 * 1000;
    if (msSinceActivity() >= limitMs - 500) {
      await clearJwtTokens();
      return res;
    }
  }

  const rotated = await rotateStoredRefreshToken();
  if (!rotated) return res;

  const headers2 = new Headers(init.headers);
  const access2 = await getJwtAccessToken();
  if (access2) headers2.set('Authorization', `Bearer ${access2}`);

  const res2 = await fetch(url, { ...init, headers: headers2 });
  if (res2.ok) bumpActivity();
  return res2;
}
