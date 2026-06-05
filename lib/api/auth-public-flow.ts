import { getApiBaseUrl } from '@/constants/api';
import type { BackendPreferredLanguage } from '@/lib/language-backend-map';

type ApiFailBody = {
  success?: false;
  message?: string;
  error?: { code?: string; message?: string };
};

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { success: false, message: text || 'Invalid JSON from server' };
  }
}

export type BackendRegisterUser = {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  preferredLanguage: BackendPreferredLanguage;
};

export type VerificationEmailStatus = {
  delivered: boolean;
  reason?: 'smtp_not_configured' | 'send_failed';
};

export type BackendRegisterSuccess = {
  accessToken: string;
  refreshToken: string;
  user: BackendRegisterUser;
  /** True when the API sent a verification email during registration (SMTP configured). */
  verificationEmailDelivered?: boolean;
  /** Prefer this over `verificationEmailDelivered` for UI messaging. */
  verificationEmail?: VerificationEmailStatus;
};

export async function postBackendRegister(body: {
  email: string;
  password: string;
  displayName?: string;
  preferredLanguage?: BackendPreferredLanguage;
}): Promise<
  | { ok: true; data: BackendRegisterSuccess }
  | { ok: false; status: number; message: string; code?: string }
> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API is not configured. Set EXPO_PUBLIC_API_BASE_URL in .env.' };
  }
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: body.email.trim().toLowerCase(),
        password: body.password,
        displayName: body.displayName?.trim(),
        ...(body.preferredLanguage
          ? { preferredLanguage: body.preferredLanguage }
          : {}),
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, status: 0, message: msg };
  }
  const json = (await readJson(res)) as Record<string, unknown> | null;
  const success = json && typeof json === 'object' && json.success === true;
  if (success && json.data && typeof json.data === 'object') {
    const d = json.data as Record<string, unknown>;
    const accessToken = typeof d.accessToken === 'string' ? d.accessToken : '';
    const refreshToken = typeof d.refreshToken === 'string' ? d.refreshToken : '';
    const u = d.user && typeof d.user === 'object' ? (d.user as Record<string, unknown>) : {};
    const prefRaw = u.preferredLanguage;
    const preferredLanguage: BackendPreferredLanguage =
      prefRaw === 'en' || prefRaw === 'ps' || prefRaw === 'fa' ? prefRaw : 'en';
    const user: BackendRegisterUser = {
      id: typeof u.id === 'string' ? u.id : '',
      email: typeof u.email === 'string' ? u.email : '',
      role: typeof u.role === 'string' ? u.role : '',
      emailVerified: typeof u.emailVerified === 'boolean' ? u.emailVerified : false,
      preferredLanguage,
    };
    const verificationEmailDelivered =
      typeof d.verificationEmailDelivered === 'boolean' ? d.verificationEmailDelivered : false;
    let verificationEmail: VerificationEmailStatus | undefined;
    const ve = d.verificationEmail;
    if (ve && typeof ve === 'object' && typeof (ve as { delivered?: unknown }).delivered === 'boolean') {
      const delivered = Boolean((ve as { delivered: boolean }).delivered);
      const reasonRaw = (ve as { reason?: unknown }).reason;
      const reason =
        reasonRaw === 'smtp_not_configured' || reasonRaw === 'send_failed' ? reasonRaw : undefined;
      verificationEmail = reason ? { delivered, reason } : { delivered };
    }
    if (!accessToken || !user.email) {
      return { ok: false, status: res.status, message: 'Registration response was incomplete.' };
    }
    return {
      ok: true,
      data: {
        accessToken,
        refreshToken,
        user,
        verificationEmailDelivered,
        verificationEmail,
      },
    };
  }
  const fail = json as ApiFailBody | null;
  return {
    ok: false,
    status: res.status,
    message: fail?.message || fail?.error?.message || `Request failed (${res.status})`,
    code: typeof fail?.error?.code === 'string' ? fail.error.code : undefined,
  };
}

export async function postEmailVerificationSend(body: {
  email: string;
}): Promise<{ ok: true } | { ok: false; status: number; message: string; code?: string }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API is not configured.' };
  }
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/auth/email-verification/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: body.email.trim().toLowerCase() }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, status: 0, message: msg };
  }
  const json = (await readJson(res)) as Record<string, unknown> | null;
  if (json && typeof json === 'object' && json.success === true) {
    return { ok: true };
  }
  const fail = json as ApiFailBody | null;
  return {
    ok: false,
    status: res.status,
    message: fail?.message || fail?.error?.message || `Request failed (${res.status})`,
    code: typeof fail?.error?.code === 'string' ? fail.error.code : undefined,
  };
}

export async function postEmailVerificationConfirm(body: {
  email: string;
  token: string;
}): Promise<
  | { ok: true; data: { emailVerified: boolean } }
  | { ok: false; status: number; message: string; code?: string }
> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API is not configured.' };
  }
  const res = await fetch(`${base}/api/v1/auth/email-verification/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email: body.email.trim().toLowerCase(),
      token: body.token.trim(),
    }),
  });
  const json = (await readJson(res)) as Record<string, unknown> | null;
  const success = json && typeof json === 'object' && json.success === true;
  if (success && json.data && typeof json.data === 'object') {
    const d = json.data as Record<string, unknown>;
    return { ok: true, data: { emailVerified: Boolean(d.emailVerified) } };
  }
  const fail = json as ApiFailBody | null;
  return {
    ok: false,
    status: res.status,
    message: fail?.message || fail?.error?.message || `Request failed (${res.status})`,
    code: typeof fail?.error?.code === 'string' ? fail.error.code : undefined,
  };
}

export async function postPasswordResetRequest(body: {
  email: string;
}): Promise<{ ok: true } | { ok: false; status: number; message: string; code?: string }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API is not configured.' };
  }
  const res = await fetch(`${base}/api/v1/auth/password-reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: body.email.trim().toLowerCase() }),
  });
  const json = (await readJson(res)) as Record<string, unknown> | null;
  if (json && typeof json === 'object' && json.success === true) {
    return { ok: true };
  }
  const fail = json as ApiFailBody | null;
  return {
    ok: false,
    status: res.status,
    message: fail?.message || fail?.error?.message || `Request failed (${res.status})`,
    code: typeof fail?.error?.code === 'string' ? fail.error.code : undefined,
  };
}

export async function postPasswordResetComplete(body: {
  email: string;
  token: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; status: number; message: string; code?: string }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API is not configured.' };
  }
  const res = await fetch(`${base}/api/v1/auth/password-reset/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email: body.email.trim().toLowerCase(),
      token: body.token.trim(),
      newPassword: body.newPassword,
    }),
  });
  const json = (await readJson(res)) as Record<string, unknown> | null;
  if (json && typeof json === 'object' && json.success === true) {
    return { ok: true };
  }
  const fail = json as ApiFailBody | null;
  return {
    ok: false,
    status: res.status,
    message: fail?.message || fail?.error?.message || `Request failed (${res.status})`,
    code: typeof fail?.error?.code === 'string' ? fail.error.code : undefined,
  };
}
