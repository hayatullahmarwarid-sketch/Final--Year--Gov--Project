/**
 * A lightweight modal date-picker that supports Gregorian, Hijri, and Shamsi (Jalali) calendars.
 * The value in/out is always an ISO Gregorian string "YYYY-MM-DD".
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppLanguage } from '@/contexts/app-language-context';
import { useCalendarType } from '@/contexts/calendar-type-context';
import {
  getMonthNames,
  gregorianToHijri,
  gregorianToShamsi,
  hijriDaysInMonth,
  hijriToGregorian,
  parseCalendarIso,
  shamsiDaysInMonth,
  shamsiToGregorian,
  toCalendarIso,
  type CalendarType,
} from '@/lib/hijri-date';
import { palette } from '@/lib/theme';

const BTN_GREEN = '#166534';
const BORDER = '#E2E8F0';
const LABEL = '#1E293B';

type Props = {
  visible: boolean;
  /** ISO Gregorian "YYYY-MM-DD" or empty string */
  value: string;
  onConfirm: (isoGregorian: string) => void;
  onClose: () => void;
};

function daysInMonth(calendar: CalendarType, year: number, month: number): number {
  if (calendar === 'hijri') return hijriDaysInMonth(year, month);
  if (calendar === 'shamsi') return shamsiDaysInMonth(year, month);
  return new Date(year, month, 0).getDate();
}

function calendarFromIso(iso: string, cal: CalendarType): { year: number; month: number; day: number } {
  const parsed = parseCalendarIso(iso, 'gregorian');
  const d = parsed ?? new Date();
  if (cal === 'hijri') {
    const h = gregorianToHijri(d);
    return h;
  }
  if (cal === 'shamsi') {
    const s = gregorianToShamsi(d);
    return s;
  }
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function toGregorianIso(cal: CalendarType, year: number, month: number, day: number): string {
  let gDate: Date;
  if (cal === 'hijri') gDate = hijriToGregorian(year, month, day);
  else if (cal === 'shamsi') gDate = shamsiToGregorian(year, month, day);
  else gDate = new Date(year, month - 1, day);
  if (isNaN(gDate.getTime())) return '';
  return gDate.toISOString().slice(0, 10);
}

function calendarLabel(cal: CalendarType, locale: 'ps' | 'prs'): string {
  if (cal === 'hijri') return locale === 'prs' ? 'هجری قمری' : 'هجري لمریز';
  if (cal === 'shamsi') return locale === 'prs' ? 'هجری شمسی' : 'لمریز هجري';
  return locale === 'prs' ? 'میلادی' : 'ميلادي';
}

export function IslamicDatePicker({ visible, value, onConfirm, onClose }: Props) {
  const { calendarType } = useCalendarType();
  const { language } = useAppLanguage();
  const locale = (language === 'prs' ? 'prs' : 'ps') as 'ps' | 'prs';
  const monthNames = getMonthNames(calendarType, locale);

  const [year, setYear] = useState(1400);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);

  useEffect(() => {
    if (!visible) return;
    const init = value
      ? calendarFromIso(value, calendarType)
      : calendarFromIso(new Date().toISOString().slice(0, 10), calendarType);
    setYear(init.year);
    setMonth(init.month);
    setDay(Math.min(init.day, daysInMonth(calendarType, init.year, init.month)));
  }, [visible, value, calendarType]);

  const maxDay = daysInMonth(calendarType, year, month);
  const safeDay = Math.min(day, maxDay);

  const changeYear = (delta: number) => {
    const ny = year + delta;
    const nm = Math.min(month, 12);
    const nd = Math.min(safeDay, daysInMonth(calendarType, ny, nm));
    setYear(ny);
    setDay(nd);
  };
  const changeMonth = (delta: number) => {
    let nm = month + delta;
    let ny = year;
    if (nm < 1) { nm = 12; ny--; }
    if (nm > 12) { nm = 1; ny++; }
    const nd = Math.min(safeDay, daysInMonth(calendarType, ny, nm));
    setMonth(nm);
    setYear(ny);
    setDay(nd);
  };
  const changeDay = (delta: number) => {
    let nd = safeDay + delta;
    if (nd < 1) nd = maxDay;
    if (nd > maxDay) nd = 1;
    setDay(nd);
  };

  const confirm = () => {
    const iso = toGregorianIso(calendarType, year, month, safeDay);
    onConfirm(iso);
  };

  const rtl = locale !== 'en';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {locale === 'prs' ? 'انتخاب تاریخ' : locale === 'ps' ? 'نیټه غوره کړئ' : 'Select Date'}
            </Text>
            <Text style={styles.calLabel}>{calendarLabel(calendarType, locale)}</Text>
          </View>

          <View style={[styles.spinnerRow, rtl && styles.spinnerRowRtl]}>
            <SpinnerCol
              label={locale === 'prs' ? 'سال' : locale === 'ps' ? 'کال' : 'Year'}
              value={String(year)}
              onPrev={() => changeYear(-1)}
              onNext={() => changeYear(1)}
            />
            <SpinnerCol
              label={locale === 'prs' ? 'ماه' : locale === 'ps' ? 'میاشت' : 'Month'}
              value={monthNames[month - 1] ?? String(month)}
              onPrev={() => changeMonth(-1)}
              onNext={() => changeMonth(1)}
            />
            <SpinnerCol
              label={locale === 'prs' ? 'روز' : locale === 'ps' ? 'ورځ' : 'Day'}
              value={String(safeDay)}
              onPrev={() => changeDay(-1)}
              onNext={() => changeDay(1)}
            />
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.btnCancel} onPress={onClose}>
              <Text style={styles.btnCancelTxt}>
                {locale === 'prs' ? 'لغو' : locale === 'ps' ? 'لغوه' : 'Cancel'}
              </Text>
            </Pressable>
            <Pressable style={styles.btnConfirm} onPress={confirm}>
              <Text style={styles.btnConfirmTxt}>
                {locale === 'prs' ? 'تأیید' : locale === 'ps' ? 'تایید' : 'Confirm'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SpinnerCol({
  label,
  value,
  onPrev,
  onNext,
}: {
  label: string;
  value: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.col}>
      <Text style={styles.colLabel}>{label}</Text>
      <Pressable onPress={onNext} style={styles.arrowBtn} hitSlop={8}>
        <Ionicons name="chevron-up" size={22} color={BTN_GREEN} />
      </Pressable>
      <View style={styles.valueBox}>
        <Text style={styles.valueText} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
      <Pressable onPress={onPrev} style={styles.arrowBtn} hitSlop={8}>
        <Ionicons name="chevron-down" size={22} color={BTN_GREEN} />
      </Pressable>
    </View>
  );
}

/** Standalone pressable field that shows the current date and opens the picker. */
export function DatePickerField({
  value,
  onChange,
  placeholder,
  error,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const { calendarType } = useCalendarType();
  const { language } = useAppLanguage();
  const locale = (language === 'prs' ? 'prs' : 'ps') as 'ps' | 'prs';
  const monthNames = getMonthNames(calendarType, locale);

  let displayValue = placeholder ?? '';
  if (value) {
    try {
      const parsed = parseCalendarIso(value, 'gregorian');
      if (parsed) {
        const iso = toCalendarIso(parsed, calendarType);
        const parts = iso.split('-').map(Number);
        if (parts.length === 3) {
          const [y, m, d] = parts;
          const mName = monthNames[m - 1] ?? String(m);
          displayValue = `${d} ${mName} ${y}`;
        }
      }
    } catch {
      displayValue = value;
    }
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.fieldTrigger, error ? styles.fieldTriggerErr : null]}>
        <Ionicons name="calendar-outline" size={18} color="#64748B" />
        <Text style={[styles.fieldTriggerTxt, !value && styles.fieldTriggerPh]} numberOfLines={1}>
          {displayValue}
        </Text>
      </Pressable>
      <IslamicDatePicker
        visible={open}
        value={value}
        onConfirm={(iso) => { onChange(iso); setOpen(false); }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: LABEL,
  },
  calLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  spinnerRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24,
  },
  spinnerRowRtl: {
    flexDirection: 'row-reverse',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  colLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  arrowBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBox: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '700',
    color: LABEL,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  btnCancelTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  btnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: BTN_GREEN,
    alignItems: 'center',
  },
  btnConfirmTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.white,
  },
  fieldTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 48,
    backgroundColor: palette.white,
  },
  fieldTriggerErr: {
    borderColor: '#F87171',
    backgroundColor: '#FEF2F2',
  },
  fieldTriggerTxt: {
    flex: 1,
    fontSize: 15,
    color: LABEL,
  },
  fieldTriggerPh: {
    color: '#94A3B8',
  },
});
