/**
 * Pashto + Dari (Arabic script) UI font.
 *
 * Many Afghan commercial UIs (e.g. marketing screens similar to the reference you shared) use
 * **Bahij Helvetica** / **Bahij Nazanin**; those families are not shipped here due to licensing.
 *
 * **Vazirmatn** (SIL OFL) is the standard open-source choice with the same modern geometric sans
 * look, excellent Pashto/Dari coverage (پښتو، دری), and pairs cleanly with the app’s Latin UI in English.
 *
 * Internal names must match `useFonts` in `AppBootstrap` / `@expo-google-fonts/vazirmatn`.
 */
export const ArabicScriptFont = {
  thin: 'Vazirmatn_100Thin',
  extraLight: 'Vazirmatn_200ExtraLight',
  light: 'Vazirmatn_300Light',
  regular: 'Vazirmatn_400Regular',
  medium: 'Vazirmatn_500Medium',
  semibold: 'Vazirmatn_600SemiBold',
  bold: 'Vazirmatn_700Bold',
  extraBold: 'Vazirmatn_800ExtraBold',
  black: 'Vazirmatn_900Black',
} as const;
