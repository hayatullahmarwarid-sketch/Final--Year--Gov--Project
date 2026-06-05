/**
 * Save a generated certificate PDF to user-visible storage (Android SAF → Downloads, etc.)
 * instead of only opening the system share sheet.
 */
import { EncodingType, readAsStringAsync, StorageAccessFramework } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { storage } from '@/lib/adapters/storage';

const ANDROID_CERT_PDF_DIR_URI_KEY = 'certificate.android.downloadDirUri.v1';

function safeBasename(name: string): string {
  const t = name.replace(/[^a-z0-9._-]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return t.length > 0 ? t.slice(0, 88) : 'certificate';
}

/** File name for the exported PDF (e.g. `Certificate_ABC123.pdf`). */
export function certificatePdfFilename(certificateDisplayId: string): string {
  const raw = String(certificateDisplayId || 'certificate').replace(/\.pdf$/i, '');
  const base = safeBasename(raw);
  return `${base}.pdf`;
}

async function ensureAndroidCertificateDirUri(): Promise<string | null> {
  try {
    const cached = await storage.getItem(ANDROID_CERT_PDF_DIR_URI_KEY);
    if (cached && String(cached).trim()) return String(cached);
  } catch {
    /* ignore */
  }
  const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!perm.granted || !perm.directoryUri) return null;
  try {
    await storage.setItem(ANDROID_CERT_PDF_DIR_URI_KEY, perm.directoryUri);
  } catch {
    /* non-fatal */
  }
  return perm.directoryUri;
}

async function copyLocalPdfToAndroidUserFolder(localUri: string, filename: string): Promise<boolean> {
  const directoryUri = await ensureAndroidCertificateDirUri();
  if (!directoryUri) return false;
  const destUri = await StorageAccessFramework.createFileAsync(directoryUri, filename, 'application/pdf');
  const b64 = await readAsStringAsync(localUri, { encoding: EncodingType.Base64 });
  await StorageAccessFramework.writeAsStringAsync(destUri, b64, { encoding: EncodingType.Base64 });
  return true;
}

export type SaveCertificatePdfOutcome = 'saved_downloads' | 'shared';

/**
 * @param localUri — `file://` URI from `Print.printToFileAsync`
 * @param filename — must end in `.pdf`
 * @param shareDialogTitle — title for the share sheet when used as fallback
 */
export async function saveCertificatePdfToDevice(
  localUri: string,
  filename: string,
  shareDialogTitle: string,
): Promise<SaveCertificatePdfOutcome> {
  if (Platform.OS === 'android') {
    try {
      const ok = await copyLocalPdfToAndroidUserFolder(localUri, filename);
      if (ok) return 'saved_downloads';
    } catch {
      /* fall through to share */
    }
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('SHARE_UNAVAILABLE');
  }
  await Sharing.shareAsync(localUri, {
    mimeType: 'application/pdf',
    dialogTitle: shareDialogTitle,
    UTI: 'com.adobe.pdf',
  });
  return 'shared';
}
