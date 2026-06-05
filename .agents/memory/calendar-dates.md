---
name: Calendar date system
description: Hijri/Shamsi date conversion and user-choosable calendar preference
---

## Rule
All date displays in the app should respect the user's calendar preference (stored in `CalendarTypeContext`).

**Key files:**
- `lib/hijri-date.ts` — pure TS conversion utilities (gregorianToHijri, gregorianToShamsi, shamsiToGregorian, hijriToGregorian, formatDateInCalendar, toCalendarIso, parseCalendarIso)
- `contexts/calendar-type-context.tsx` — persisted user preference, defaults to `'shamsi'`
- `components/ui/IslamicDatePicker.tsx` — modal spinner-style picker + `DatePickerField` pressable field

**Why:** Teacher requested Hijri/Shamsi dates instead of Gregorian. The `shamsi` (Solar Hijri / Jalali) calendar was chosen as default since the app is used in Afghanistan.

**How to apply:** Use `useCalendarType()` hook to get the active calendar type, then pass to `formatDateInCalendar(date, calendarType, locale)`. For date inputs, use `DatePickerField` from `IslamicDatePicker.tsx` — it handles conversion back to ISO Gregorian for storage.

**CalendarTypeProvider** must wrap inside `AppLanguageProvider` in `app/_layout.tsx`.
