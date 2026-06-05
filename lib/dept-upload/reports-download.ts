import * as Print from 'expo-print';

import { getDecreeUploadDashboard, type DecreeUploadDashboardDto } from '@/lib/api/decree-upload';
import { getDeptUploadSettings, postAllocateAnalyticsReportReference } from '@/lib/api/dept-upload-settings';
import { showToast } from '@/lib/adapters/toast';
import {
  buildDeptUploadMetricsCsv,
  buildDeptUploadMetricsExcelHtml,
  buildDeptUploadReportPdfHtml,
  type DeptReportBranding,
} from '@/lib/dept-upload/reports-export';
import { savePdfFileToDeviceStorage, saveTextFileToDeviceStorage } from '@/lib/dept-upload/reports-file-save';
import { getEmbeddedNotoNaskhFontFaceCss } from '@/lib/pdf/embedded-noto-font';
import { loadGovPdfBrandingDataUris } from '@/lib/pdf/pdf-branding-assets';

export type DeptUploadReportFormat = 'pdf' | 'csv' | 'excel';

function suffixFor(format: DeptUploadReportFormat): { ext: string; mime: string } {
  if (format === 'pdf') return { ext: '.pdf', mime: 'application/pdf' };
  if (format === 'csv') return { ext: '.csv', mime: 'text/csv;charset=utf-8' };
  // Excel-compatible HTML file (opens in Excel)
  return { ext: '.xls', mime: 'application/vnd.ms-excel' };
}

export async function downloadDeptUploadAnalyticsReport(
  format: DeptUploadReportFormat,
  options?: { generatedBy?: string | null },
): Promise<{ ok: true; dashboard: DecreeUploadDashboardDto } | { ok: false; message: string }> {
  const [dash, settings, refAlloc] = await Promise.all([
    getDecreeUploadDashboard(),
    getDeptUploadSettings(),
    postAllocateAnalyticsReportReference(),
  ]);
  if (!dash.ok) return { ok: false, message: dash.message };
  if (!settings.ok) return { ok: false, message: settings.message };
  if (!refAlloc.ok) return { ok: false, message: refAlloc.message };

  const data = dash.data;
  const branding: DeptReportBranding = {
    deptName: settings.data.department.deptName,
    deptCode: settings.data.department.deptCode,
    reportReference: refAlloc.data.reference,
    generatedBy: options?.generatedBy ?? null,
  };
  const safeBase = branding.reportReference.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
  const { ext, mime } = suffixFor(format);
  const filename = `${safeBase || 'dept-report'}${ext}`;

  try {
    if (format === 'pdf') {
      const [fontFaceCss, logos] = await Promise.all([
        getEmbeddedNotoNaskhFontFaceCss(),
        loadGovPdfBrandingDataUris(),
      ]);
      const html = buildDeptUploadReportPdfHtml(data, branding, {
        fontFaceCss,
        leftLogoDataUri: logos.leftLogoDataUri,
        rightLogoDataUri: logos.rightLogoDataUri,
      });
      const { uri } = await Print.printToFileAsync({ html });
      await savePdfFileToDeviceStorage({ localUri: uri, filename });
    } else if (format === 'csv') {
      const csv = buildDeptUploadMetricsCsv(data, branding);
      await saveTextFileToDeviceStorage({ content: csv, filename, mimeType: mime });
    } else {
      const html = buildDeptUploadMetricsExcelHtml(data, branding);
      await saveTextFileToDeviceStorage({ content: html, filename, mimeType: mime });
    }

    showToast('Downloaded to device storage.', 'success');
    return { ok: true, dashboard: data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Export failed';
    showToast('Export failed.', 'error');
    return { ok: false, message: msg };
  }
}

