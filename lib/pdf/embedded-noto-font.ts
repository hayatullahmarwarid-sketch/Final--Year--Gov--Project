import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

let cachedCss: string | null = null;

/**
 * Embeds Noto Naskh Arabic as `PdfNotoNaskh` for reliable Persian/Dari/Pashto/Arabic shaping in PDF WebViews.
 */
export async function getEmbeddedNotoNaskhFontFaceCss(): Promise<string> {
  if (cachedCss !== null) return cachedCss;
  try {
    const fontModule = require('@expo-google-fonts/noto-naskh-arabic/400Regular/NotoNaskhArabic_400Regular.ttf');
    const asset = Asset.fromModule(fontModule);
    await asset.downloadAsync();
    if (!asset.localUri) {
      cachedCss = '';
      return '';
    }
    const b64 = await FileSystem.readAsStringAsync(asset.localUri, { encoding: 'base64' });
    cachedCss = `@font-face{font-family:'PdfNotoNaskh';src:url('data:font/ttf;base64,${b64}') format('truetype');font-weight:400;font-style:normal;font-display:block;}`;
    return cachedCss;
  } catch {
    cachedCss = '';
    return '';
  }
}
