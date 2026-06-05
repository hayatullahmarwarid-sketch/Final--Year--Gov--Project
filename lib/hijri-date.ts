/**
 * Hijri (Islamic Lunar) and Shamsi (Solar/Jalali) date conversion utilities.
 * No external dependencies — pure arithmetic algorithms.
 */

export type CalendarType = 'gregorian' | 'hijri' | 'shamsi';

export type HijriDate = { year: number; month: number; day: number };
export type ShamsiDate = { year: number; month: number; day: number };

const HIJRI_MONTHS_PS = [
  'محرم','صفر','ربيع الأول','ربيع الثاني','جمادى الأولى','جمادى الثانية',
  'رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة',
];
const HIJRI_MONTHS_FA = [
  'محرم','صفر','ربیع‌الاول','ربیع‌الثانی','جمادی‌الاول','جمادی‌الثانی',
  'رجب','شعبان','رمضان','شوال','ذیقعده','ذیحجه',
];

const SHAMSI_MONTHS_PS = [
  'وری','غوایی','غبرګولی','چنګاښ','زمری','وږی',
  'تله','لړم','لیندۍ','مرغومی','سلواغه','کب',
];
const SHAMSI_MONTHS_FA = [
  'حمل','ثور','جوزا','سرطان','اسد','سنبله',
  'میزان','عقرب','قوس','جدی','دلو','حوت',
];

// ── Gregorian ↔ Hijri ─────────────────────────────────────────────────────────

export function gregorianToHijri(date: Date): HijriDate {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  const jd =
    Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
    Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) +
    d - 32075;

  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const hMonth = Math.floor((24 * l) / 709);
  const hDay = l - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;

  return { year: hYear, month: hMonth, day: hDay };
}

export function hijriToGregorian(year: number, month: number, day: number): Date {
  const jd =
    Math.floor((11 * year + 3) / 30) +
    354 * year +
    30 * month -
    Math.floor((month - 1) / 2) +
    day +
    1948440 -
    385;

  let l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const gDay = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const gMonth = j + 2 - 12 * l;
  const gYear = 100 * (n - 49) + i + l;

  return new Date(gYear, gMonth - 1, gDay);
}

// ── Gregorian ↔ Shamsi (Jalali) ───────────────────────────────────────────────

export function gregorianToShamsi(date: Date): ShamsiDate {
  const gy = date.getFullYear() - 1600;
  const gm = date.getMonth();
  const gd = date.getDate() - 1;
  const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const gMonthDays = [31, 28 + (leap(gy + 1600) ? 1 : 0), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  let gDayNo =
    365 * gy +
    Math.floor((gy + 3) / 4) -
    Math.floor((gy + 99) / 100) +
    Math.floor((gy + 399) / 400);
  for (let i = 0; i < gm; i++) gDayNo += gMonthDays[i];
  gDayNo += gd;

  let jDayNo = gDayNo - 79;
  const jNp = Math.floor(jDayNo / 12053);
  jDayNo %= 12053;

  let jy = 979 + 33 * jNp + 4 * Math.floor(jDayNo / 1461);
  jDayNo %= 1461;

  if (jDayNo >= 366) {
    jy += Math.floor((jDayNo - 1) / 365);
    jDayNo = (jDayNo - 1) % 365;
  }

  const jMonthDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  let jm = 0;
  for (let i = 0; i < 11; i++) {
    if (jDayNo >= jMonthDays[i]) {
      jDayNo -= jMonthDays[i];
      jm++;
    } else break;
  }

  return { year: jy, month: jm + 1, day: jDayNo + 1 };
}

export function shamsiToGregorian(year: number, month: number, day: number): Date {
  const jy = year - 979;
  const jm = month - 1;
  const jd = day - 1;
  const jMonthDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

  let jDayNo =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4);
  for (let i = 0; i < jm; i++) jDayNo += jMonthDays[i];
  jDayNo += jd;

  const gDayNo = jDayNo + 79;

  let gy = 1600 + 400 * Math.floor(gDayNo / 146097);
  let remaining = gDayNo % 146097;
  let leap = true;

  if (remaining >= 36525) {
    remaining--;
    gy += 100 * Math.floor(remaining / 36524);
    remaining %= 36524;
    if (remaining >= 365) remaining++;
    else leap = false;
  }

  gy += 4 * Math.floor(remaining / 1461);
  remaining %= 1461;

  if (remaining >= 366) {
    leap = false;
    remaining--;
    gy += Math.floor(remaining / 365);
    remaining %= 365;
  }

  const gMonthDays = [31, 28 + (leap ? 1 : 0), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (let i = 0; i < 12; i++) {
    if (remaining < gMonthDays[i]) {
      gm = i + 1;
      break;
    }
    remaining -= gMonthDays[i];
  }

  return new Date(gy, gm - 1, remaining + 1);
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

/** How many days in a given Hijri month (approximation). */
export function hijriDaysInMonth(year: number, month: number): number {
  return month % 2 === 1 || (month === 12 && (11 * year + 14) % 30 < 11) ? 30 : 29;
}

/** How many days in a given Shamsi month. */
export function shamsiDaysInMonth(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return 29;
}

export function getMonthNames(calendar: CalendarType, locale: 'ps' | 'prs' | 'en'): string[] {
  if (calendar === 'hijri') return locale === 'prs' ? HIJRI_MONTHS_FA : HIJRI_MONTHS_PS;
  if (calendar === 'shamsi') return locale === 'prs' ? SHAMSI_MONTHS_FA : SHAMSI_MONTHS_PS;
  return ['January','February','March','April','May','June','July','August','September','October','November','December'];
}

/** Format a Gregorian date as a localised string in the user's preferred calendar. */
export function formatDateInCalendar(
  date: Date | string | null | undefined,
  calendar: CalendarType,
  locale: 'ps' | 'prs' | 'en',
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : '—';

  if (calendar === 'hijri') {
    const h = gregorianToHijri(d);
    const months = locale === 'prs' ? HIJRI_MONTHS_FA : HIJRI_MONTHS_PS;
    return `${h.day} ${months[h.month - 1]} ${h.year}`;
  }
  if (calendar === 'shamsi') {
    const s = gregorianToShamsi(d);
    const months = locale === 'prs' ? SHAMSI_MONTHS_FA : SHAMSI_MONTHS_PS;
    return `${s.day} ${months[s.month - 1]} ${s.year}`;
  }
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Return the ISO-style string for the calendar's equivalent of a Gregorian date.
 * e.g. Hijri 1445-09-15, Shamsi 1402-06-23
 */
export function toCalendarIso(date: Date | string | null | undefined, calendar: CalendarType): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  if (calendar === 'hijri') {
    const h = gregorianToHijri(d);
    return `${h.year}-${pad(h.month)}-${pad(h.day)}`;
  }
  if (calendar === 'shamsi') {
    const s = gregorianToShamsi(d);
    return `${s.year}-${pad(s.month)}-${pad(s.day)}`;
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Parse a calendar-specific ISO string back to a Gregorian Date.
 * Accepts "YYYY-MM-DD" for any calendar.
 */
export function parseCalendarIso(str: string, calendar: CalendarType): Date | null {
  const parts = str.trim().split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  const [y, m, d] = parts;
  try {
    if (calendar === 'hijri') return hijriToGregorian(y, m, d);
    if (calendar === 'shamsi') return shamsiToGregorian(y, m, d);
    const g = new Date(y, m - 1, d);
    return isNaN(g.getTime()) ? null : g;
  } catch {
    return null;
  }
}
