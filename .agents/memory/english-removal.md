---
name: English language removal
description: English removed as user-selectable language; backward compat preserved
---

## Rule
`APP_LANGUAGES` array has only `ps` and `prs`. The `AppLanguageId` type still includes `'en'` for reading old stored values.

**Why:** Teacher requested only Pashto + Dari in the language picker. Existing users who had 'en' stored won't crash — `isAppLanguageId` still accepts 'en', so their stored value is honoured.

**How to apply:** Never add `en` back to the `APP_LANGUAGES` array. If a new screen checks `APP_LANGUAGES.find(...)` it will correctly not show English. `readDeviceLanguage()` now returns `'prs'` for Farsi/Dari devices and `'ps'` for everything else (including English devices).
