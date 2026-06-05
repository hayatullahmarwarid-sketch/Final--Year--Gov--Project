import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { type InspectorSyncQueueItem } from '@/data/inspector-sync-queue';

const STORAGE_KEY = '@sharia_inspector_sync_queue_v1';

type Value = {
  items: InspectorSyncQueueItem[];
  setItems: React.Dispatch<React.SetStateAction<InspectorSyncQueueItem[]>>;
  /** `true` after the initial read from `AsyncStorage` (or load failure) completes. */
  hydrated: boolean;
};

const InspectorSyncQueueContext = createContext<Value | null>(null);

function parseQueue(raw: string | null): InspectorSyncQueueItem[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? (p as InspectorSyncQueueItem[]) : [];
  } catch {
    return [];
  }
}

export function InspectorSyncQueueProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InspectorSyncQueueItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (dead) return;
        setItems(parseQueue(raw));
      } finally {
        if (!dead) setHydrated(true);
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo(() => ({ items, setItems, hydrated }), [items, hydrated]);

  return <InspectorSyncQueueContext.Provider value={value}>{children}</InspectorSyncQueueContext.Provider>;
}

export function useInspectorSyncQueue(): Value {
  const ctx = useContext(InspectorSyncQueueContext);
  if (!ctx) {
    throw new Error('useInspectorSyncQueue must be used within InspectorSyncQueueProvider');
  }
  return ctx;
}
