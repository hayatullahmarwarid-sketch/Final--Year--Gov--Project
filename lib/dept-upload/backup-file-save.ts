import { Directory, File, Paths } from 'expo-file-system';
import {
  EncodingType,
  StorageAccessFramework,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { storage } from '@/lib/adapters/storage';

function safeBasename(name: string): string {
  const t = name.replace(/[^a-z0-9._-]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return t.length > 0 ? t.slice(0, 120) : 'backup';
}

function directoryForWrite(): Directory {
  try {
    return Paths.document;
  } catch {
    return Paths.cache;
  }
}

const ANDROID_BACKUPS_DIR_URI_KEY = 'deptUpload.backups.android.backupDirUri.v1';

async function ensureAndroidBackupsDirUri(): Promise<string | null> {
  try {
    const cached = await storage.getItem(ANDROID_BACKUPS_DIR_URI_KEY);
    if (cached && String(cached).trim()) return String(cached);
  } catch {
    // ignore
  }

  const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!perm.granted || !perm.directoryUri) return null;
  try {
    await storage.setItem(ANDROID_BACKUPS_DIR_URI_KEY, perm.directoryUri);
  } catch {
    // ignore
  }
  return perm.directoryUri;
}

export async function saveBackupJsonToDeviceStorage(args: {
  contentJson: unknown;
  filename: string;
}): Promise<{ savedUri: string; userVisible: boolean }> {
  const filename = safeBasename(args.filename.toLowerCase().endsWith('.json') ? args.filename : `${args.filename}.json`);
  const content = JSON.stringify(args.contentJson, null, 2);

  if (Platform.OS === 'android') {
    const dirUri = await ensureAndroidBackupsDirUri();
    if (!dirUri) {
      // Fall back to app sandbox.
      const dir = directoryForWrite();
      const local = new File(dir, filename);
      await writeAsStringAsync(local.uri, content, { encoding: EncodingType.UTF8 });
      return { savedUri: local.uri, userVisible: false };
    }
    const destUri = await StorageAccessFramework.createFileAsync(dirUri, filename, 'application/json');
    await StorageAccessFramework.writeAsStringAsync(destUri, content, { encoding: EncodingType.UTF8 });
    return { savedUri: filename, userVisible: true };
  }

  // iOS: store in app Documents (local device storage).
  const dir = directoryForWrite();
  const local = new File(dir, filename);
  await writeAsStringAsync(local.uri, content, { encoding: EncodingType.UTF8 });
  return { savedUri: local.uri, userVisible: false };
}

