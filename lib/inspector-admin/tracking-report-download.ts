import * as FileSystem from 'expo-file-system/legacy';
 
import { getApiBaseUrl } from '@/constants/api';
import { showToast } from '@/lib/adapters/toast';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';
import { savePdfFileToDeviceStorage } from '@/lib/dept-upload/reports-file-save';
 
function safeBasename(name: string): string {
  const t = name.replace(/[^a-z0-9._-]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return t.length > 0 ? t.slice(0, 120) : 'report';
}
 
export async function downloadNationalImplementationMatrixPdf(args?: {
  startDate?: string;
  endDate?: string;
  incidentThreshold?: number;
}): Promise<{ ok: true; filename: string } | { ok: false; message: string }> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.' };
  const token = await getJwtAccessToken();
  if (!token) return { ok: false, message: 'Not signed in with API credentials.' };
 
  const params = new URLSearchParams();
  if (args?.startDate) params.set('startDate', args.startDate);
  if (args?.endDate) params.set('endDate', args.endDate);
  if (typeof args?.incidentThreshold === 'number') params.set('incidentThreshold', String(args.incidentThreshold));
 
  const qs = params.toString();
  const url = `${base}/api/v1/inspector-admin/tracking/export-pdf${qs ? `?${qs}` : ''}`;
  const filename = safeBasename(`national-implementation-matrix-${new Date().toISOString().slice(0, 10)}.pdf`);
 
  try {
    const tmpDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? null;
    if (!tmpDir) return { ok: false, message: 'No writable directory available.' };
    const tmpUri = `${tmpDir}${filename}`;
 
    const dl = await FileSystem.downloadAsync(url, tmpUri, {
      headers: {
        Accept: 'application/pdf',
        Authorization: `Bearer ${token}`,
      },
    });
 
    await savePdfFileToDeviceStorage({ localUri: dl.uri, filename });
    showToast('Downloaded to device storage.', 'success');
    return { ok: true, filename };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Export failed';
    showToast('Export failed.', 'error');
    return { ok: false, message: msg };
  }
}
 
