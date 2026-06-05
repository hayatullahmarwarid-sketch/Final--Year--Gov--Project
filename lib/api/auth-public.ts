import { getApiBaseUrl } from '@/constants/api';

export type PublicAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type ApiFieldErrors = Record<string, string[] | undefined> | null | undefined;

export type ApiFailBody = {
  success: false;
  message?: string;
  errors?: ApiFieldErrors;
  error?: { code?: string; message?: string; details?: unknown };
};

export type PublicAuthUser = {
  id?: string;
  email?: string | null;
  displayName?: string;
  fullName?: string;
  gender?: 'male' | 'female' | null;
  provinceId?: string;
  provinceName?: string;
  district?: string;
  isVerified?: boolean;
};

export type PublicRegisterResponse = {
  user: PublicAuthUser;
  verification: {
    expiresAt: string | null;
    delivery?: { channel?: string; status?: string; provider?: string; reachedMailbox?: boolean; note?: string };
    cooldownSeconds?: number;
  };
};

export type PublicLoginResponse = {
  user: PublicAuthUser;
  tokens: PublicAuthTokens;
};

export type VerificationIssueData = {
  delivery?: {
    channel?: string;
    status?: string;
    provider?: string;
    reachedMailbox?: boolean;
    note?: string;
  };
  expiresAt?: string | null;
  cooldownSeconds?: number;
};

/** Same response shape for new-account resend and forgot-password — API does not reveal whether the email exists. */
export function isVerificationNoActiveChallenge(data: VerificationIssueData): boolean {
  return data.delivery?.status === 'no_active_challenge';
}

type VerifyCodeData = {
  verified?: boolean;
  nextStep?: 'sign_in' | 'set_password';
  passwordResetToken?: string;
  user?: PublicAuthUser;
};

function joinErrors(errors: ApiFieldErrors): string | null {
  if (!errors || typeof errors !== 'object') return null;
  const parts: string[] = [];
  for (const v of Object.values(errors)) {
    if (Array.isArray(v) && v[0]) parts.push(v[0]);
  }
  return parts.length ? parts.join('\n') : null;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { success: false, message: text || 'Invalid JSON from server' };
  }
}

export async function postPublicRegister(body: {
  fullName: string;
  email: string;
  password: string;
  gender: 'male' | 'female';
  province: string;
  district?: string;
}): Promise<
  | { ok: true; data: PublicRegisterResponse }
  | { ok: false; status: number; message: string; errors: ApiFieldErrors; code?: string; details?: unknown }
> {
  const base = getApiBaseUrl();
  if (!base) {
    return {
      ok: false,
      status: 0,
      message: 'API is not configured. Set EXPO_PUBLIC_API_BASE_URL in .env.',
      errors: null,
    };
  }
  const res = await fetch(`${base}/api/v1/auth/public/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await readJson(res)) as Record<string, unknown> | null;
  const success = json && typeof json === 'object' && json.success === true;
  if (success && json.data) {
    return { ok: true, data: json.data as PublicRegisterResponse };
  }
  const fail = json as ApiFailBody | null;
  const message =
    fail?.message ||
    fail?.error?.message ||
    joinErrors(fail?.errors) ||
    `Request failed (${res.status})`;
  return {
    ok: false,
    status: res.status,
    message,
    errors: fail?.errors ?? null,
    code: fail?.error?.code,
    details: fail?.error?.details,
  };
}

export async function postRequestVerificationCode(body: {
  email: string;
}): Promise<{ ok: true; data: VerificationIssueData } | { ok: false; status: number; message: string; code?: string }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API is not configured.' };
  }
  const res = await fetch(`${base}/api/v1/auth/public/request-verification-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: body.email.trim().toLowerCase() }),
  });
  const json = (await readJson(res)) as Record<string, unknown> | null;
  const success = json && typeof json === 'object' && json.success === true;
  if (success && json.data) {
    return { ok: true, data: json.data as VerificationIssueData };
  }
  const fail = json as ApiFailBody | null;
  return {
    ok: false,
    status: res.status,
    message: fail?.message || fail?.error?.message || `Request failed (${res.status})`,
    code: fail?.error?.code,
  };
}

export async function postVerifyCode(body: {
  email: string;
  code: string;
}): Promise<{ ok: true; data: VerifyCodeData } | { ok: false; status: number; message: string; code?: string }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API is not configured.' };
  }
  const res = await fetch(`${base}/api/v1/auth/public/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email: body.email.trim().toLowerCase(),
      code: body.code.trim(),
    }),
  });
  const json = (await readJson(res)) as Record<string, unknown> | null;
  const success = json && typeof json === 'object' && json.success === true;
  if (success && json.data) {
    return { ok: true, data: json.data as VerifyCodeData };
  }
  const fail = json as ApiFailBody | null;
  return {
    ok: false,
    status: res.status,
    message: fail?.message || fail?.error?.message || `Request failed (${res.status})`,
    code: fail?.error?.code,
  };
}

export async function postPublicResetPasswordWithToken(body: {
  resetToken: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; status: number; message: string; code?: string }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API is not configured.' };
  }
  const res = await fetch(`${base}/api/v1/auth/public/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      resetToken: body.resetToken.trim(),
      newPassword: body.newPassword,
    }),
  });
  const json = (await readJson(res)) as Record<string, unknown> | null;
  const success = json && typeof json === 'object' && json.success === true;
  if (success) {
    return { ok: true };
  }
  const fail = json as ApiFailBody | null;
  return {
    ok: false,
    status: res.status,
    message: fail?.message || fail?.error?.message || `Request failed (${res.status})`,
    code: fail?.error?.code,
  };
}

export async function postPublicLogin(body: {
  email: string;
  password: string;
}): Promise<
  | { ok: true; data: PublicLoginResponse }
  | { ok: false; status: number; message: string; errors: ApiFieldErrors; code?: string }
> {
  const base = getApiBaseUrl();
  if (!base) {
    return {
      ok: false,
      status: 0,
      message: 'API is not configured. Set EXPO_PUBLIC_API_BASE_URL in .env.',
      errors: null,
    };
  }
  const res = await fetch(`${base}/api/v1/auth/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email: body.email.trim().toLowerCase(),
      password: body.password,
    }),
  });
  const json = (await readJson(res)) as Record<string, unknown> | null;
  const success = json && typeof json === 'object' && json.success === true;
  if (success && json.data) {
    return { ok: true, data: json.data as PublicLoginResponse };
  }
  const fail = json as ApiFailBody | null;
  const message =
    fail?.message ||
    fail?.error?.message ||
    joinErrors(fail?.errors) ||
    `Request failed (${res.status})`;
  return {
    ok: false,
    status: res.status,
    message,
    errors: fail?.errors ?? null,
    code: fail?.error?.code,
  };
}
