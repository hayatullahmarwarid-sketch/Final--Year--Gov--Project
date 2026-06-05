import { Directory, File, Paths } from 'expo-file-system';
import { EncodingType, readAsStringAsync, StorageAccessFramework, writeAsStringAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { storage } from '@/lib/adapters/storage';

function safeBasename(name: string): string {
  const t = name.replace(/[^a-z0-9._-]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return t.length > 0 ? t.slice(0, 120) : 'report';
}

function directoryForWrite(): Directory {
  try {
    return Paths.document;
  } catch {
    return Paths.cache;
  }
}

const ANDROID_REPORTS_DIR_URI_KEY = 'deptUpload.reports.android.downloadDirUri.v1';

async function ensureAndroidReportsDirUri(): Promise<string | null> {
  try {
    const cached = await storage.getItem(ANDROID_REPORTS_DIR_URI_KEY);
    if (cached && String(cached).trim()) return String(cached);
  } catch {
    // ignore
  }

  const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!perm.granted || !perm.directoryUri) return null;
  try {
    await storage.setItem(ANDROID_REPORTS_DIR_URI_KEY, perm.directoryUri);
  } catch {
    // ignore
  }
  return perm.directoryUri;
}

async function copyLocalFileToAndroidDirectory(args: {
  localUri: string;
  filename: string;
  mimeType: string;
}): Promise<boolean> {
  const dirUri = await ensureAndroidReportsDirUri();
  if (!dirUri) return false;
  const destUri = await StorageAccessFramework.createFileAsync(dirUri, args.filename, args.mimeType);
  const b64 = await readAsStringAsync(args.localUri, { encoding: EncodingType.Base64 });
  await StorageAccessFramework.writeAsStringAsync(destUri, b64, { encoding: EncodingType.Base64 });
  return true;
}

export async function saveTextFileToDeviceStorage(args: {
  content: string;
  filename: string;
  mimeType: string;
  encoding?: EncodingType;
}): Promise<{ savedUri: string; userVisible: boolean }> {
  const filename = safeBasename(args.filename);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([args.content], { type: args.mimeType });
    const bUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = bUrl;
    a.setAttribute('download', filename);
    a.click();
    setTimeout(() => URL.revokeObjectURL(bUrl), 60_000);
    return { savedUri: filename, userVisible: true };
  }

  const dir = directoryForWrite();
  const local = new File(dir, filename);
  await writeAsStringAsync(local.uri, args.content, { encoding: args.encoding ?? EncodingType.UTF8 });

  if (Platform.OS === 'android') {
    const ok = await copyLocalFileToAndroidDirectory({ localUri: local.uri, filename, mimeType: args.mimeType });
    if (ok) return { savedUri: filename, userVisible: true };
    return { savedUri: local.uri, userVisible: false };
  }

  return { savedUri: local.uri, userVisible: false };
}

export async function savePdfFileToDeviceStorage(args: {
  localUri: string;
  filename: string;
}): Promise<{ savedUri: string; userVisible: boolean }> {
  const filename = safeBasename(args.filename.toLowerCase().endsWith('.pdf') ? args.filename : `${args.filename}.pdf`);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const r = await fetch(args.localUri);
    const blob = await r.blob();
    const bUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = bUrl;
    a.setAttribute('download', filename);
    a.click();
    setTimeout(() => URL.revokeObjectURL(bUrl), 60_000);
    return { savedUri: filename, userVisible: true };
  }

  const dir = directoryForWrite();
  const local = new File(dir, filename);
  const b64 = await readAsStringAsync(args.localUri, { encoding: EncodingType.Base64 });
  await writeAsStringAsync(local.uri, b64, { encoding: EncodingType.Base64 });

  if (Platform.OS === 'android') {
    const ok = await copyLocalFileToAndroidDirectory({ localUri: local.uri, filename, mimeType: 'application/pdf' });
    if (ok) return { savedUri: filename, userVisible: true };
    return { savedUri: local.uri, userVisible: false };
  }

  return { savedUri: local.uri, userVisible: false };
}

