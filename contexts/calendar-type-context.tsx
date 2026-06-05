import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { CalendarType } from '@/lib/hijri-date';

const CALENDAR_TYPE_KEY = 'user-calendar-type';

type CalendarTypeContextValue = {
  calendarType: CalendarType;
  setCalendarType: (t: CalendarType) => void;
};

const CalendarTypeContext = createContext<CalendarTypeContextValue | null>(null);

export function CalendarTypeProvider({ children }: { children: React.ReactNode }) {
  const [calendarType, setCalendarTypeState] = useState<CalendarType>('shamsi');

  useEffect(() => {
    void AsyncStorage.getItem(CALENDAR_TYPE_KEY).then((v) => {
      if (v === 'gregorian' || v === 'hijri' || v === 'shamsi') {
        setCalendarTypeState(v);
      }
    });
  }, []);

  const setCalendarType = useCallback((t: CalendarType) => {
    setCalendarTypeState(t);
    void AsyncStorage.setItem(CALENDAR_TYPE_KEY, t);
  }, []);

  const value = useMemo(() => ({ calendarType, setCalendarType }), [calendarType, setCalendarType]);
  return <CalendarTypeContext.Provider value={value}>{children}</CalendarTypeContext.Provider>;
}

export function useCalendarType() {
  const ctx = useContext(CalendarTypeContext);
  if (!ctx) return { calendarType: 'shamsi' as CalendarType, setCalendarType: (_t: CalendarType) => {} };
  return ctx;
}
