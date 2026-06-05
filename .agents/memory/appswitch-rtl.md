---
name: AppSwitch RTL fix
description: How the AppSwitch thumb direction is controlled in Pashto/Dari context
---

## Rule
`AppSwitch` must derive RTL from `useAppLanguage()` — specifically `language === 'ps' || language === 'prs'` — not from `I18nManager.isRTL`.

**Why:** `I18nManager.isRTL` reflects the OS/app-level RTL flag which can lag behind the in-app language selection. The teacher reported that the switch thumb was moving the wrong way when toggling the app language. Using the language context directly gives the correct real-time behavior.

**How to apply:** Any switch/toggle component that needs RTL-aware thumb positioning should import `useAppLanguage` and derive `rtl` from the language value, not from `I18nManager`.
