import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

async function pngModuleToDataUri(mod: unknown): Promise<string | null> {
  try {
    const asset = Asset.fromModule(mod as number);
    await asset.downloadAsync();
    if (!asset.localUri) return null;
    const b64 = await FileSystem.readAsStringAsync(asset.localUri, { encoding: 'base64' });
    return `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}

export type PdfBrandingDataUris = {
  leftLogoDataUri: string | null;
  rightLogoDataUri: string | null;
};

/**
 * Bundled crests in `assets/pdf-branding/`.
 * Replace `logo-national-emblem.png` with your national emblem artwork when ready.
 */
export async function loadGovPdfBrandingDataUris(): Promise<PdfBrandingDataUris> {
  const leftMod = require('../../assets/pdf-branding/logo-ministry.png');
  const rightMod = require('../../assets/pdf-branding/logo-national-emblem.png');
  const [leftLogoDataUri, rightLogoDataUri] = await Promise.all([
    pngModuleToDataUri(leftMod),
    pngModuleToDataUri(rightMod),
  ]);
  return { leftLogoDataUri, rightLogoDataUri };
}
