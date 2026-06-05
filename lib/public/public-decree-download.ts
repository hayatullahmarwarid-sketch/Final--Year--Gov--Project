import { Directory, File, Paths } from 'expo-file-system';
import {
  cacheDirectory as legacyCache,
  documentDirectory as legacyDocument,
  downloadAsync as legacyDownloadAsync,
  EncodingType,
  getContentUriAsync,
  getInfoAsync,
  readAsStringAsync,
  StorageAccessFramework,
} from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Alert, Linking, Platform } from 'react-native';

import { resolveApiAssetUrl } from '@/constants/api';
import { storage } from '@/lib/adapters/storage';
import { buildPublicDecreePdfUrl } from '@/lib/api/public-user';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';

function safeBasename(name: string): string {
  const t = name.replace(/[^a-z0-9._-]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return t.length > 0 ? t.slice(0, 88) : 'decree';
}

function extFromMime(mime: string | null | undefined): string {
  const m = (mime || '').toLowerCase();
  if (m === 'application/pdf' || m.includes('pdf')) return '.pdf';
  if (m.includes('wordprocessingml') || m.includes('officedocument.wordprocessingml')) return '.docx';
  if (m === 'application/msword' || m.includes('msword')) return '.doc';
  return '';
}

function pickFilename(args: { suggestedName?: string; decreeId: string; originalName: string | null; mime: string | null }): string {
  const { suggestedName, decreeId, originalName, mime } = args;
  if (originalName && String(originalName).trim()) {
    return safeBasename(String(originalName).replace(/[:/\\?*|"<>|]/g, '_'));
  }
  let ext = extFromMime(mime) || '.bin';
  if (!ext.startsWith('.')) ext = `.${ext}`;
  const base = safeBasename((suggestedName?.trim() || `decree-${decreeId}`).replace(/\.(pdf|docx|doc|bin)$/i, ''));
  return `${base}${ext}`;
}

function mimeForShare(m: string | null | undefined, filename: string): { mimeType: string; UTI?: string } {
  const M = (m || '').toLowerCase();
  if (M) {
    if (M === 'application/pdf' || M.includes('pdf')) {
      return { mimeType: M, UTI: 'com.adobe.pdf' };
    }
    if (M.includes('wordprocessingml') || M.includes('msword') || M.includes('officedocument')) {
      return { mimeType: M, UTI: 'org.openxmlformats.wordprocessingml.document' };
    }
    return { mimeType: M };
  }
  if (filename.toLowerCase().endsWith('.pdf')) return { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' };
  if (filename.toLowerCase().endsWith('.docx')) {
    return {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      UTI: 'org.openxmlformats.wordprocessingml.document',
    };
  }
  if (filename.toLowerCase().endsWith('.doc')) return { mimeType: 'application/msword' };
  return { mimeType: 'application/octet-stream' };
}

const ANDROID_DOWNLOAD_DIR_URI_KEY = 'publicDecree.android.downloadDirUri.v1';

async function getAndroidDownloadDirUri(): Promise<string | null> {
  try {
    const v = await storage.getItem(ANDROID_DOWNLOAD_DIR_URI_KEY);
    return v && String(v).trim() ? String(v) : null;
  } catch {
    return null;
  }
}

async function setAndroidDownloadDirUri(uri: string): Promise<void> {
  try {
    await storage.setItem(ANDROID_DOWNLOAD_DIR_URI_KEY, uri);
  } catch {
    // non-fatal: we'll re-prompt next time
  }
}

async function ensureAndroidDownloadDirUri(): Promise<string | null> {
  const cached = await getAndroidDownloadDirUri();
  if (cached) return cached;

  const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!perm.granted || !perm.directoryUri) return null;
  await setAndroidDownloadDirUri(perm.directoryUri);
  return perm.directoryUri;
}

async function copyLocalFileToAndroidDownloads(args: {
  localUri: string;
  filename: string;
  mimeType: string;
}): Promise<{ saved: true; savedUri: string } | { saved: false }> {
  const { localUri, filename, mimeType } = args;

  const directoryUri = await ensureAndroidDownloadDirUri();
  if (!directoryUri) return { saved: false };

  // Create the destination file in the user-chosen directory (typically Downloads).
  const destUri = await StorageAccessFramework.createFileAsync(directoryUri, filename, mimeType);

  // Read local file and write to SAF destination.
  const b64 = await readAsStringAsync(localUri, { encoding: EncodingType.Base64 });
  await StorageAccessFramework.writeAsStringAsync(destUri, b64, { encoding: EncodingType.Base64 });
  return { saved: true, savedUri: destUri };
}

function expectedKindFromMimeOrName(mime: string | null | undefined, name: string): 'pdf' | 'word' | 'other' {
  const m = (mime || '').toLowerCase();
  const n = name.toLowerCase();
  if (m.includes('pdf') || n.endsWith('.pdf')) return 'pdf';
  if (m.includes('wordprocessingml') || m.includes('msword') || n.endsWith('.docx') || n.endsWith('.doc')) return 'word';
  return 'other';
}

function checkDecreeMagicBytes(value: Uint8Array, expected: 'pdf' | 'word' | 'other'): void {
  if (value.length < 1) {
    throw new Error('The file data is empty. Check EXPO_PUBLIC_API_BASE_URL points at your API (not the Metro bundler).');
  }
  if (value[0] === 0x3c) {
    throw new Error(
      'Received HTML instead of a document. Set EXPO_PUBLIC_API_BASE_URL to your API base (e.g. http://YOUR_PC_IP:4000) and restart the app.',
    );
  }
  if (expected === 'pdf') {
    const sig = String.fromCharCode(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0, value[3] ?? 0);
    if (sig !== '%PDF') {
      throw new Error('The file is not a valid PDF. Try downloading again or re-upload the decree from the department app.');
    }
  } else if (expected === 'word') {
    const isDocxZip = value[0] === 0x50 && value[1] === 0x4b;
    const isPdf = String.fromCharCode(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0, value[3] ?? 0) === '%PDF';
    if (!isDocxZip && !isPdf) {
      throw new Error('The file is not a valid Word document. Try downloading again or re-upload the decree.');
    }
  }
}

/**
 * Verifies the saved file on disk (first bytes only). React Native `fetch` often has no
 * `response.body`, so we must not rely on a remote preflight `getReader()` check.
 */
async function assertLocalFileIsDecreeDocument(localUri: string, expected: 'pdf' | 'word' | 'other'): Promise<void> {
  const b64 = await readAsStringAsync(localUri, {
    encoding: EncodingType.Base64,
    position: 0,
    length: 16,
  });
  if (typeof atob !== 'function') {
    return;
  }
  let binary: string;
  try {
    binary = atob(b64);
  } catch {
    throw new Error('Could not read the downloaded file. The file may be corrupted.');
  }
  const take = Math.min(binary.length, 8);
  const value = new Uint8Array(take);
  for (let i = 0; i < take; i++) {
    value[i] = binary.charCodeAt(i) & 0xff;
  }
  checkDecreeMagicBytes(value, expected);
}

function directoryForWrite(): Directory {
  // Prefer app documents; cache is the fallback (same as many download managers’ temp-then-export flow).
  try {
    return Paths.document;
  } catch {
    return Paths.cache;
  }
}

/**
 * Download bytes from URL into a `File` using a streaming `fetch` (no legacy `downloadAsync` —
 * that API can throw `UnavailabilityError` in current Expo native builds).
 */
async function downloadUrlToFileStreaming(url: string, dest: File, init?: RequestInit): Promise<string> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Download failed (HTTP ${response.status})`);
  }
  const writer = dest.writableStream().getWriter();
  const body = response.body;
  if (body) {
    const reader = body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.length) {
          await writer.write(value);
        }
      }
    } finally {
      await writer.close();
    }
  } else {
    const buf = new Uint8Array(await response.arrayBuffer());
    await writer.write(buf);
    await writer.close();
  }
  return dest.uri;
}

function legacyFileUriFor(filename: string): string | null {
  const base = legacyDocument ?? legacyCache;
  if (!base || !filename) return null;
  return base.endsWith('/') ? `${base}${filename}` : `${base}/${filename}`;
}

async function saveToAppStorage(url: string, filename: string, init?: RequestInit): Promise<string> {
  const dir = directoryForWrite();
  const out = new File(dir, filename);

  try {
    // `downloadFileAsync` does not support auth headers; prefer streaming `fetch`.
    if (!init?.headers) {
      return (await File.downloadFileAsync(url, out)).uri;
    }
  } catch {
    /* try next */
  }

  const legacyPath = legacyFileUriFor(filename);
  if (legacyPath) {
    try {
      const r = await legacyDownloadAsync(url, legacyPath);
      if (r.status >= 200 && r.status < 300) {
        return r.uri;
      }
    } catch {
      /* try streaming */
    }
  }

  try {
    return await downloadUrlToFileStreaming(url, out, init);
  } catch (e) {
    throw e instanceof Error ? e : new Error('Could not save the file to this device');
  }
}

/**
 * Fetches a short-lived URL for the decree document, saves the full file locally, then:
 * - **Web:** triggers a real browser download of the bytes (API may return a path like `/uploads/…`,
 *   which must be resolved against the API base — otherwise the wrong host receives the request).
 * - **Android:** opens the saved PDF/Word in the default viewer (content `Uri`) when possible, so
 *   recipients get a full `content://` file; the share sheet is only a fallback.
 * - **iOS:** opens the system share sheet so the user can use “Save to Files”; `file://` to other
 *   apps requires this path on iOS.
 */
export async function downloadPublicDecreeFile(
  decreeId: string,
  options?: { suggestedName?: string; locale?: string },
): Promise<void> {
  const fetchUrl = buildPublicDecreePdfUrl(decreeId, { locale: options?.locale }) ?? '';
  if (!fetchUrl) throw new Error('API is not configured.');

  const filename = pickFilename({
    suggestedName: options?.suggestedName,
    decreeId,
    originalName: null,
    mime: 'application/pdf',
  });
  const expectedKind: 'pdf' = 'pdf';

  const token = await getJwtAccessToken();
  if (!token) throw new Error('Not signed in.');
  const init: RequestInit = { headers: { Authorization: `Bearer ${token}` } };

  if (Platform.OS === 'web' && typeof fetch !== 'undefined' && typeof document !== 'undefined') {
    try {
      const r = await fetch(fetchUrl, init);
      if (!r.ok) {
        throw new Error(`Download failed (HTTP ${r.status})`);
      }
      const blob = await r.blob();
      const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
      checkDecreeMagicBytes(head, expectedKind);
      const bUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = bUrl;
      a.setAttribute('download', filename);
      a.click();
      setTimeout(() => URL.revokeObjectURL(bUrl), 60_000);
    } catch {
      const opened = await Linking.openURL(fetchUrl);
      if (!opened) throw new Error('Could not start download in the browser.');
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }

  if (Platform.OS === 'web') {
    const opened = await Linking.openURL(fetchUrl);
    if (!opened) throw new Error('Could not open the download link.');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }

  let localUri: string;
  try {
    localUri = await saveToAppStorage(fetchUrl, filename, init);
  } catch (e) {
    throw e instanceof Error ? e : new Error('Could not save the file. Check storage and network.');
  }

  const info = await getInfoAsync(localUri);
  if (!info.exists || typeof info.size !== 'number' || info.size < 32) {
    throw new Error('The file did not download completely. Check the network and try again.');
  }

  try {
    await assertLocalFileIsDecreeDocument(localUri, expectedKind);
  } catch (e) {
    throw e instanceof Error ? e : new Error('The downloaded file could not be verified.');
  }

  const shareMime = 'application/pdf';

  if (Platform.OS === 'android') {
    // Save to user-visible device storage (Downloads) instead of opening the file in a viewer.
    // This avoids Microsoft 365 (or other apps) attempting to open an inaccessible URI and showing errors.
    try {
      const copied = await copyLocalFileToAndroidDownloads({
        localUri,
        filename,
        mimeType: shareMime,
      });
      if (copied.saved) {
        Alert.alert('Downloaded', 'Saved to your device storage (Downloads).');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
    } catch {
      // fallback below
    }

    Alert.alert('Downloaded', 'Saved inside the app storage.');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }

  Alert.alert('Downloaded', 'Saved inside the app storage.');
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** @deprecated use `downloadPublicDecreeFile` (supports PDF and Word) */
export const downloadPublicDecreePdf = downloadPublicDecreeFile;
