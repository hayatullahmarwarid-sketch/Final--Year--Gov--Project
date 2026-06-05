/**
 * Stored file metadata API — `POST /api/v1/files` (binary lives with provider).
 * Pair with `expo-image-picker` URIs: register metadata after capture, keep `url` as local `file://` until CDN wired.
 */
import { getApiBaseUrl } from '@/constants/api';
import { fetchWithJwtRefresh } from '@/lib/api/fetch-with-jwt-refresh';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';

const PREFIX = '/api/v1/files';

export type CreateStoredFileBody = {
  originalName: string;
  mimeType: string;
  size: number;
  provider: string;
  providerFileId: string;
  url?: string | null;
  folder?: string | null;
  purpose: string;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  tenantId?: string | null;
  uploadedBy?: string | null;
};

type ApiSuccess<T> = { success: true; data: T };

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function createStoredFileMetadata(
  body: CreateStoredFileBody,
): Promise<{ ok: true; data: unknown } | { ok: false; message: string; status: number }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, message: 'API is not configured.', status: 0 };
  }
  const token = await getJwtAccessToken();
  if (!token) {
    return { ok: false, message: 'Not signed in.', status: 0 };
  }
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${base}${PREFIX}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const success = json && typeof json === 'object' && (json as ApiSuccess<unknown>).success === true;
  if (success) {
    return { ok: true, data: (json as ApiSuccess<unknown>).data };
  }
  const fail = json as { message?: string } | null;
  return { ok: false, message: fail?.message || `Request failed (${res.status})`, status: res.status };
}

/** Register metadata for an image picked with `expo-image-picker` (local URI until provider upload exists). */
export async function registerInspectionEvidenceFromPicker(asset: {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
}): Promise<{ ok: true; data: unknown } | { ok: false; message: string; status: number }> {
  return createStoredFileMetadata({
    originalName: asset.fileName ?? 'evidence.jpg',
    mimeType: asset.mimeType ?? 'image/jpeg',
    size: typeof asset.fileSize === 'number' ? asset.fileSize : 0,
    provider: 'expo',
    providerFileId: `expo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    url: asset.uri,
    purpose: 'inspection_evidence',
  });
}
