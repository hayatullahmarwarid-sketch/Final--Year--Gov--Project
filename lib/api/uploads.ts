/**
 * Multipart binary upload — `POST /api/v1/uploads?purpose=…` (requires JWT).
 * Native uses `expo-file-system/legacy` `uploadAsync` (multipart) so the real file is streamed
 * from disk; `fetch` + `Blob` can finish instantly with an empty or wrong body on some devices.
 */
import { getApiBaseUrl } from '@/constants/api';
import { fetchWithJwtRefresh, rotateStoredRefreshToken } from '@/lib/api/fetch-with-jwt-refresh';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

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

export type MultipartUploadResponse = {
  fileId: string;
  storageKey?: string;
  url?: string | null;
  size?: number;
  sha256?: string;
  deduplicated?: boolean;
};

function parseUploadResponseJson(
  text: string,
  httpStatus: number,
): { ok: true; data: MultipartUploadResponse } | { ok: false; message: string; status: number } {
  const json = (() => {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  })();
  const success = json && typeof json === 'object' && (json as ApiSuccess<MultipartUploadResponse>).success === true;
  if (success) {
    return { ok: true, data: (json as ApiSuccess<MultipartUploadResponse>).data };
  }
  const fail = json as { message?: string } | null;
  return {
    ok: false,
    message: fail?.message || `Upload failed (${httpStatus})`,
    status: httpStatus,
  };
}

export async function postMultipartUpload(opts: {
  uri: string;
  name: string;
  mimeType: string;
  purpose?: string;
}): Promise<{ ok: true; data: MultipartUploadResponse } | { ok: false; message: string; status: number }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, message: 'API is not configured.', status: 0 };
  }
  const token = await getJwtAccessToken();
  if (!token) {
    return { ok: false, message: 'Not signed in.', status: 0 };
  }

  const purpose = opts.purpose ?? 'decree_attachment';
  const url = `${base}/api/v1/uploads?purpose=${encodeURIComponent(purpose)}`;

  if (Platform.OS === 'web') {
    const form = new FormData();
    let appended = false;
    try {
      const fileRes = await fetch(opts.uri);
      if (fileRes.ok) {
        const blob = await fileRes.blob();
        if (blob.size > 0) {
          form.append('file', blob, opts.name || 'upload.bin');
          appended = true;
        }
      }
    } catch {
      /* fall back */
    }
    if (!appended) {
      form.append('file', { uri: opts.uri, name: opts.name, type: opts.mimeType } as unknown as Blob);
    }
    let res: Response;
    try {
      res = await fetchWithJwtRefresh(url, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: form,
      });
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
    }
    const text = await res.text();
    return parseUploadResponseJson(text, res.status);
  }

  const runNativeUpload = async (bearer: string) => {
    return FileSystem.uploadAsync(url, opts.uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: opts.mimeType || 'application/octet-stream',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bearer}`,
      },
    });
  };

  let out: FileSystem.FileSystemUploadResult;
  try {
    out = await runNativeUpload(token);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  if (out.status === 401) {
    const rotated = await rotateStoredRefreshToken();
    if (rotated) {
      const next = await getJwtAccessToken();
      if (next) {
        try {
          out = await runNativeUpload(next);
        } catch (e) {
          return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
        }
      }
    }
  }
  return parseUploadResponseJson(out.body, out.status);
}
