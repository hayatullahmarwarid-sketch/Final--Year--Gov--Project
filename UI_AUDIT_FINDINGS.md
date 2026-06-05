# Sharia Decrees — Mobile UI audit findings

This document records a structured UI/UX audit of `app/**/*.tsx`, `components/**/*.tsx`, and shared UI constants. It groups issues by category, notes **what was fixed in the remediation pass** (April 2026), and lists **remaining work** so follow-up can continue without scope drift.

---

## Executive summary

| Area | Finding | Status |
|------|---------|--------|
| Design tokens | Colors, spacing, typography, and shadows were split across `constants/brand.ts`, `constants/form.ts`, Expo default `constants/theme.ts`, and inline hex/radius values in screens. | **Partially fixed:** canonical `@/lib/theme` added; `constants/brand.ts`, `constants/form.ts`, and `constants/theme.ts` re-export or align with it. |
| Touch feedback | Many `Pressable`s rely on default behavior (no iOS opacity / Android ripple). | **Partially fixed:** `AppPressable` introduced; applied on **Login** and **DashboardShell** drawer/header/backdrop. Remaining: ~35+ screens still use raw `Pressable`. |
| Hit targets | Several text-only links and icon buttons used `hitSlop` as low as `8` or none. | **Partially fixed:** `AppPressable` enforces minimum `12` slop; login “Forgot” wrapped with padding. Remaining: audit icon-only rows across admin flows. |
| Typography | Tab labels used `fontSize: 10` (below readable 11–12pt guidance). | **Fixed** in `app/(tabs)/_layout.tsx` via `typography.caption` (12pt) + semibold weight. |
| Safe area | Many screens correctly use `SafeAreaView` from `react-native-safe-area-context`; some stacks rely on parent shells only. | **Unchanged** (no navigation structure change). **Remaining:** verify each leaf screen under non-tab stacks (e.g. some `inspector-admin/*`) for bottom inset on devices with home indicator. |
| Keyboard | Forms like login, register, forgot-password, verify OTP already use `KeyboardAvoidingView`. Many list-heavy admin screens omit it (often OK if no keyboard). | **Documented**; no structural change unless a screen mixes keyboard + obscured CTA. |
| Accessibility | Widespread `maxFontSizeMultiplier` caps (1.05–1.35) limit Dynamic Type / system scaling. Many interactive nodes lack `accessibilityHint`. | **Partially fixed:** relaxed caps on **Login**; added hints on refactored controls. **Remaining:** remove or raise caps app-wide; add hints to primary actions. |
| Loading / empty | Mixed patterns: some lists show `ActivityIndicator`, others blank until data. | **Documented**; **Remaining:** standardize on one skeleton/spinner component from tokens. |
| Modals | `DashboardShell` uses RN `Modal` + absolute drawer sheet (acceptable native modal). `react-native-modal` is already a dependency for other flows. | **Documented**; optional follow-up: migrate drawer to a sheet library for gesture parity. |
| Images | `expo-image` is in dependencies; not all cards use it consistently. | **Remaining:** replace `Image` where caching/placeholder matters per checklist. |

---

## 1. Layout

| Issue | Examples / notes | Status |
|-------|------------------|--------|
| Inconsistent horizontal gutters on auth | `login.tsx` used literal `18`, `22`, `432`. | **Fixed:** `layout.authEdgeCompact`, `layout.authEdgeDefault`, `layout.authFormMaxWidth` in `@/lib/theme`. |
| Tab bar top border / shadow literals | `(tabs)/_layout.tsx` used `#F3F4F6`, manual iOS shadow only. | **Fixed:** `palette.neutral100`, `shadowTabBar()` (adds Android `elevation`). |
| Drawer width `Math.min(320, …)` | `DashboardShell.tsx`. | **Fixed:** `Math.min(spacing['3xl'] * 8, …)` (= 320) for token traceability. |
| Public tab auth gate | Centered `ActivityIndicator` only — acceptable; could add label (already has `accessibilityLabel`). | **Unchanged** |

---

## 2. Touch & feedback

| Issue | Examples / notes | Status |
|-------|------------------|--------|
| Login primary CTA, links, back, remember row | Raw `Pressable`, minimal pressed styling. | **Fixed:** `AppPressable` + Android ripple variant. |
| Drawer rows & sign out | Had `pressed && opacity` inline. | **Fixed:** `AppPressable` (iOS opacity via hook; ripple on Android). |
| Tab bar buttons | `PlatformPressable` only + haptics. | **Fixed:** `android_ripple` added in `components/haptic-tab.tsx`. |
| Remaining `Pressable`-heavy screens | `app/register.tsx`, `app/verify-phone.tsx`, `app/system-admin/users.tsx`, `app/dept-upload/**/*.tsx`, `app/inspector-admin/**/*.tsx`, etc. | **Remaining** |

---

## 3. Spacing & sizing

| Issue | Examples / notes | Status |
|-------|------------------|--------|
| Scattered magic numbers in `StyleSheet` | Nearly all pre-refactor screens. | **Pattern established:** `spacing`, `radius`, `sizes`, `layout` in `@/lib/theme`. **Login**, **DashboardShell**, **tabs layout** migrated. |
| Checkbox / avatar dimensions on login | `22`, `80`, `40`. | **Fixed:** `sizes.checkbox`, `sizes.avatarLg` with derived radius. |

---

## 4. Typography

| Issue | Examples / notes | Status |
|-------|------------------|--------|
| Expo template link color (`#0a7ea4`) in `ThemedText` | Misaligned with brand. | **Fixed:** link style uses `palette.primary`. Title/subtitle/body map to `typography.*`. |
| Tab label 10pt | `(tabs)/_layout.tsx`. | **Fixed:** 12pt caption scale. |
| `maxFontSizeMultiplier` caps | Many TSX files (see grep in repo). | **Partially fixed** (login). **Remaining:** review caps for Pashto/RTL and accessibility policy. |

---

## 5. Platform inconsistencies

| Issue | Examples / notes | Status |
|-------|------------------|--------|
| Tab bar shadow only on iOS | Previous `(tabs)/_layout.tsx`. | **Fixed:** `shadowTabBar()` adds Android elevation. |
| Header shadow in dashboard | Inline Platform.select. | **Fixed:** `shadowHeader()` from tokens. |
| Drawer elevation | None on sheet edge. | **Fixed:** `shadowDrawer()` on drawer container. |

---

## 6. Web-style remnants

| Issue | Examples / notes | Status |
|-------|------------------|--------|
| Default Expo tint (`#0a7ea4`) | `constants/theme.ts` before audit. | **Fixed:** primary green / neutrals. |
| Hover-specific code | Not prevalent in RN tree. | **N/A** |

---

## 7. Accessibility

| Issue | Examples / notes | Status |
|-------|------------------|--------|
| Color-only error on login | Red text only. | **Unchanged** copy; color from `semantic.errorText` (token). Optional: add icon row (global form error still text-only). |
| `accessibilityViewIsModal` on menu | Drawer `Modal`. | **Fixed** in `DashboardShell`. |
| Reduce motion | No consideration for press opacity. | **Fixed:** `useReducedMotion` + `AppPressable` skips iOS opacity when reduced motion is on. |

---

## 8. Empty & loading states

| Issue | Examples / notes | Status |
|-------|------------------|--------|
| Blank list states | Varies by screen (some have empty copy). | **Remaining:** add consistent `EmptyState` primitive using `typography` + `spacing`. |
| Loading | Mix of spinners / nothing. | **Remaining:** single `LoadingView` / skeleton wrapper. |

---

## 9. New primitives (remediation deliverables)

| File | Role |
|------|------|
| `lib/theme.ts` | Palette, `Brand`, `FormColors`, semantic colors, `spacing`, `radius`, `typography`, `sizes`, `layout`, shadows, `androidRipple`. |
| `hooks/use-reduced-motion.ts` | System reduce-motion for interaction polish. |
| `components/ui/AppPressable.tsx` | Minimum hit slop, iOS pressed opacity (respects reduce motion), Android ripple. |
| `components/ui/FormInput.tsx` | Unified label, shell, valid/error states, muted surface, inline error with icon. |

---

## 10. Files touched in this pass (visual layer only)

- `lib/theme.ts` (new)
- `hooks/use-reduced-motion.ts` (new)
- `components/ui/AppPressable.tsx` (new)
- `components/ui/FormInput.tsx` (new)
- `constants/theme.ts`, `constants/brand.ts`, `constants/form.ts` (re-export / brand alignment)
- `components/themed-text.tsx`
- `components/dashboard/DashboardShell.tsx`
- `components/haptic-tab.tsx`
- `app/(tabs)/_layout.tsx`
- `app/login.tsx`

---

## 11. Recommended next passes (no logic / API / navigation changes)

1. Migrate **register**, **verify-phone**, **verify-otp**, **change-password**, **forgot-password/** to `FormInput` + `AppPressable` + `@/lib/theme` spacing (same pattern as login).
2. Sweep `app/inspector-admin/*.tsx` and `app/system-admin/*.tsx` for `Pressable` → `AppPressable` where navigation is not gesture-competing.
3. Introduce `EmptyState` + `ScreenScroll` (SafeArea + KeyboardAvoiding + `ScrollView`) wrappers to avoid repeating layout boilerplate.
4. Gradually remove `maxFontSizeMultiplier` caps or standardize to a single high ceiling (e.g. 1.5) for RTL/Pashto readability tests.
5. Prefer `expo-image` in `DecreeCard` / `DecreeBrowseCard` with placeholder + blurhash where applicable.

---

*This audit is a living document: extend the tables as additional screens are tokenized.*
