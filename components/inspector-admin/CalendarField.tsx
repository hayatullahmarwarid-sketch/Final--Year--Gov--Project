import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppPressable } from '@/components/ui/AppPressable';
import { useAppTranslation } from '@/hooks/use-app-translation';
import {
  Brand,
  FormColors,
  palette,
  radius,
  shadowCard,
  spacing,
  touchTarget,
} from '@/lib/theme';

type Props = {
  /** YMD string `yyyy-mm-dd` or empty. */
  value: string;
  onChange: (ymd: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toDisplay(d: Date | null): string {
  if (!d) return '';
  return toYmd(d);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const dow = first.getDay(); // 0 = Sun
  const start = new Date(first);
  start.setDate(1 - dow);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export function CalendarField({ value, onChange, placeholder, accessibilityLabel }: Props) {
  const { t } = useAppTranslation();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const selected = parseYmd(value);

  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<Date>(() => {
    const base = selected ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const cells = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const shortDays = [
    t('calendarSundayShort'),
    t('calendarMondayShort'),
    t('calendarTuesdayShort'),
    t('calendarWednesdayShort'),
    t('calendarThursdayShort'),
    t('calendarFridayShort'),
    t('calendarSaturdayShort'),
  ];

  const resolvedPlaceholder = placeholder ?? t('assignmentDatePlaceholder');
  const displayText = toDisplay(selected) || resolvedPlaceholder;
  const isPlaceholder = !selected;

  const goPrev = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const pickToday = () => {
    onChange(toYmd(today));
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setOpen(false);
  };
  const clearDate = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <View>
      <AppPressable
        onPress={() => setOpen((v) => !v)}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={accessibilityLabel ?? resolvedPlaceholder}>
        <Text
          style={[styles.triggerText, isPlaceholder && styles.placeholderText]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}>
          {displayText}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={FormColors.subtitle} />
      </AppPressable>

      {open ? (
        <View style={[styles.panel, shadowCard()]}>
          <View style={styles.panelHeader}>
            <Text style={styles.monthLabel} maxFontSizeMultiplier={1.15}>
              {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
            </Text>
            <View style={styles.navBtns}>
              <AppPressable
                onPress={goPrev}
                style={styles.navBtn}
                accessibilityRole="button"
                accessibilityLabel={t('calendarPrevMonth')}>
                <Ionicons name="arrow-up" size={16} color={FormColors.title} />
              </AppPressable>
              <AppPressable
                onPress={goNext}
                style={styles.navBtn}
                accessibilityRole="button"
                accessibilityLabel={t('calendarNextMonth')}>
                <Ionicons name="arrow-down" size={16} color={FormColors.title} />
              </AppPressable>
            </View>
          </View>

          <View style={styles.weekdayRow}>
            {shortDays.map((d, i) => (
              <Text key={`${d}-${i}`} style={styles.weekdayCell} maxFontSizeMultiplier={1.15}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = sameDay(d, today);
              const isSelected = selected ? sameDay(d, selected) : false;
              return (
                <AppPressable
                  key={i}
                  onPress={() => {
                    onChange(toYmd(d));
                    setOpen(false);
                  }}
                  style={[styles.cell, isSelected && styles.cellSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={toYmd(d)}>
                  <Text
                    style={[
                      styles.cellText,
                      !inMonth && styles.cellTextMuted,
                      isToday && !isSelected && styles.cellTextToday,
                      isSelected && styles.cellTextSelected,
                    ]}
                    maxFontSizeMultiplier={1.1}>
                    {d.getDate()}
                  </Text>
                </AppPressable>
              );
            })}
          </View>

          <View style={styles.panelFooter}>
            <AppPressable
              onPress={clearDate}
              style={styles.footerBtn}
              accessibilityRole="button"
              accessibilityLabel={t('calendarClear')}>
              <Text style={styles.footerLink} maxFontSizeMultiplier={1.15}>
                {t('calendarClear')}
              </Text>
            </AppPressable>
            <AppPressable
              onPress={pickToday}
              style={styles.footerBtn}
              accessibilityRole="button"
              accessibilityLabel={t('calendarToday')}>
              <Text style={styles.footerLink} maxFontSizeMultiplier={1.15}>
                {t('calendarToday')}
              </Text>
            </AppPressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const CELL_BLUE = '#0088FF';

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: palette.neutral100,
    borderRadius: radius.md,
    minHeight: touchTarget.min,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: FormColors.title,
  },
  placeholderText: {
    color: palette.neutral400,
    fontWeight: '500',
  },
  panel: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: FormColors.title,
  },
  navBtns: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.neutral100,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
  weekdayCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: FormColors.subtitle,
    letterSpacing: 0.5,
    paddingVertical: spacing.xxs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xxs,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  cellSelected: {
    backgroundColor: CELL_BLUE,
    borderWidth: 2,
    borderColor: Brand.gold,
  },
  cellText: {
    fontSize: 13,
    fontWeight: '600',
    color: FormColors.title,
  },
  cellTextMuted: {
    color: palette.neutral400,
  },
  cellTextToday: {
    color: CELL_BLUE,
    fontWeight: '800',
  },
  cellTextSelected: {
    color: palette.white,
    fontWeight: '800',
  },
  panelFooter: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.neutral200,
  },
  footerBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: CELL_BLUE,
    letterSpacing: 0.2,
  },
});
