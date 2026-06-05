import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuthSession } from '@/contexts/auth-session-context';
import { showToast } from '@/lib/adapters/toast';
import {
  deletePublicBookmark,
  listPublicBookmarksPage,
  postPublicBookmark,
} from '@/lib/api/public-user';
import { publicUserDataStorageKey } from '@/lib/user-scoped-storage-keys';

export type ExamAttemptRecord = {
  examId: string;
  scorePct: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  passed: boolean;
  completedAt: string;
};

export type PublicUserDataState = {
  bookmarkedDecreeIds: string[];
  /** Server bookmark document id (for `DELETE /public/bookmarks/:id`). */
  bookmarkIdByDecreeId: Record<string, string>;
  examAttempts: Record<string, ExamAttemptRecord>;
  earnedCertificateIds: string[];
};

const EMPTY: PublicUserDataState = {
  bookmarkedDecreeIds: [],
  bookmarkIdByDecreeId: {},
  examAttempts: {},
  earnedCertificateIds: [],
};

function mergeState(raw: unknown): PublicUserDataState {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  const o = raw as Record<string, unknown>;
  const bookmarks = Array.isArray(o.bookmarkedDecreeIds)
    ? o.bookmarkedDecreeIds.filter((x): x is string => typeof x === 'string')
    : [];
  let bookmarkIdByDecreeId: Record<string, string> = {};
  if (o.bookmarkIdByDecreeId && typeof o.bookmarkIdByDecreeId === 'object' && !Array.isArray(o.bookmarkIdByDecreeId)) {
    for (const [k, v] of Object.entries(o.bookmarkIdByDecreeId as Record<string, unknown>)) {
      if (typeof v === 'string') bookmarkIdByDecreeId[k] = v;
    }
  }
  const attempts: Record<string, ExamAttemptRecord> = {};
  if (o.examAttempts && typeof o.examAttempts === 'object') {
    for (const [k, v] of Object.entries(o.examAttempts as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const a = v as Record<string, unknown>;
      if (
        typeof a.scorePct === 'number' &&
        typeof a.correct === 'number' &&
        typeof a.incorrect === 'number' &&
        typeof a.unanswered === 'number' &&
        typeof a.passed === 'boolean' &&
        typeof a.completedAt === 'string'
      ) {
        attempts[k] = {
          examId: k,
          scorePct: a.scorePct,
          correct: a.correct,
          incorrect: a.incorrect,
          unanswered: a.unanswered,
          passed: a.passed,
          completedAt: a.completedAt,
        };
      }
    }
  }
  const earned = Array.isArray(o.earnedCertificateIds)
    ? o.earnedCertificateIds.filter((x): x is string => typeof x === 'string')
    : [];
  return { bookmarkedDecreeIds: bookmarks, bookmarkIdByDecreeId, examAttempts: attempts, earnedCertificateIds: earned };
}

type PublicUserDataContextValue = {
  hydrated: boolean;
  active: boolean;
  data: PublicUserDataState;
  isBookmarked: (decreeId: string) => boolean;
  toggleBookmark: (decreeId: string, next?: boolean) => void;
  recordExamAttempt: (payload: Omit<ExamAttemptRecord, 'completedAt'> & { completedAt?: string }) => void;
  addEarnedCertificates: (ids: string[]) => void;
};

const PublicUserDataContext = createContext<PublicUserDataContextValue | null>(null);

export function PublicUserDataProvider({ children }: { children: React.ReactNode }) {
  const { hydrated: authHydrated, role, accountKey } = useAuthSession();
  const [data, setData] = useState<PublicUserDataState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  const active = role === 'public' && !!accountKey;

  useEffect(() => {
    let cancelled = false;
    if (!authHydrated) return;
    if (!active || !accountKey) {
      setData(EMPTY);
      setHydrated(true);
      return;
    }
    setHydrated(false);
    (async () => {
      let next: PublicUserDataState = { ...EMPTY };
      try {
        const raw = await AsyncStorage.getItem(publicUserDataStorageKey(accountKey));
        if (cancelled) return;
        if (raw) {
          next = mergeState(JSON.parse(raw));
        }
        const bm = await listPublicBookmarksPage({ page: 1, limit: 100 });
        if (cancelled) return;
        if (bm.ok) {
          const ids: string[] = [];
          const map: Record<string, string> = {};
          for (const row of bm.items) {
            const did = typeof row.decreeId === 'string' ? row.decreeId : '';
            const bid =
              typeof row.id === 'string' ? row.id : row._id != null ? String(row._id) : '';
            if (did) {
              ids.push(did);
              if (bid) map[did] = bid;
            }
          }
          next = { ...next, bookmarkedDecreeIds: ids, bookmarkIdByDecreeId: map };
        }
        setData(next);
        try {
          await AsyncStorage.setItem(publicUserDataStorageKey(accountKey), JSON.stringify(next));
        } catch {
          /* ignore */
        }
      } catch {
        if (!cancelled) setData({ ...EMPTY });
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHydrated, active, accountKey]);

  const persist = useCallback(
    async (next: PublicUserDataState) => {
      if (!active || !accountKey) return;
      try {
        await AsyncStorage.setItem(publicUserDataStorageKey(accountKey), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [active, accountKey],
  );

  const isBookmarked = useCallback(
    (decreeId: string) => data.bookmarkedDecreeIds.includes(decreeId),
    [data.bookmarkedDecreeIds],
  );

  const toggleBookmark = useCallback(
    (decreeId: string, next?: boolean) => {
      if (!active) return;
      void (async () => {
        const prev = dataRef.current;
        const has = prev.bookmarkedDecreeIds.includes(decreeId);
        const on = next !== undefined ? next : !has;

        if (on && !has) {
          setData((p) => ({
            ...p,
            bookmarkedDecreeIds: [...p.bookmarkedDecreeIds, decreeId],
          }));
          const r = await postPublicBookmark({ decreeId });
          if (!r.ok) {
            setData((p) => ({
              ...p,
              bookmarkedDecreeIds: p.bookmarkedDecreeIds.filter((id) => id !== decreeId),
            }));
            showToast(r.message, 'error');
            return;
          }
          const row = r.data as Record<string, unknown>;
          const bid =
            typeof row.id === 'string'
              ? row.id
              : row._id != null
                ? String(row._id)
                : '';
          setData((p) => {
            const next = {
              ...p,
              bookmarkIdByDecreeId: bid
                ? { ...p.bookmarkIdByDecreeId, [decreeId]: bid }
                : { ...p.bookmarkIdByDecreeId },
            };
            void persist(next);
            return next;
          });
          return;
        }

        if (!on && has) {
          const bookmarkId = prev.bookmarkIdByDecreeId[decreeId];
          const snapshot = { ...prev };
          setData((p) => ({
            ...p,
            bookmarkedDecreeIds: p.bookmarkedDecreeIds.filter((id) => id !== decreeId),
            bookmarkIdByDecreeId: Object.fromEntries(
              Object.entries(p.bookmarkIdByDecreeId).filter(([k]) => k !== decreeId),
            ),
          }));
          if (bookmarkId) {
            const r = await deletePublicBookmark(bookmarkId);
            if (!r.ok) {
              setData((p) => {
                const next = {
                  ...p,
                  bookmarkedDecreeIds: [...p.bookmarkedDecreeIds, decreeId],
                  bookmarkIdByDecreeId: { ...p.bookmarkIdByDecreeId, [decreeId]: bookmarkId },
                };
                void persist(next);
                return next;
              });
              showToast(r.message, 'error');
              return;
            }
          }
          const after = {
            ...snapshot,
            bookmarkedDecreeIds: snapshot.bookmarkedDecreeIds.filter((id) => id !== decreeId),
            bookmarkIdByDecreeId: Object.fromEntries(
              Object.entries(snapshot.bookmarkIdByDecreeId).filter(([k]) => k !== decreeId),
            ),
          };
          await persist(after);
        }
      })();
    },
    [active, persist],
  );

  const recordExamAttempt = useCallback(
    (payload: Omit<ExamAttemptRecord, 'completedAt'> & { completedAt?: string }) => {
      if (!active) return;
      const completedAt = payload.completedAt ?? new Date().toISOString();
      const row: ExamAttemptRecord = {
        examId: payload.examId,
        scorePct: payload.scorePct,
        correct: payload.correct,
        incorrect: payload.incorrect,
        unanswered: payload.unanswered,
        passed: payload.passed,
        completedAt,
      };
      setData((prev) => {
        const examAttempts = { ...prev.examAttempts, [payload.examId]: row };
        const nextState = { ...prev, examAttempts };
        void persist(nextState);
        return nextState;
      });
    },
    [active, persist],
  );

  const addEarnedCertificates = useCallback(
    (ids: string[]) => {
      if (!active || ids.length === 0) return;
      setData((prev) => {
        const merged = new Set(prev.earnedCertificateIds);
        for (const id of ids) merged.add(id);
        const earnedCertificateIds = Array.from(merged);
        const nextState = { ...prev, earnedCertificateIds };
        void persist(nextState);
        return nextState;
      });
    },
    [active, persist],
  );

  const value = useMemo(
    () => ({
      hydrated: hydrated && authHydrated,
      active,
      data,
      isBookmarked,
      toggleBookmark,
      recordExamAttempt,
      addEarnedCertificates,
    }),
    [hydrated, authHydrated, active, data, isBookmarked, toggleBookmark, recordExamAttempt, addEarnedCertificates],
  );

  return <PublicUserDataContext.Provider value={value}>{children}</PublicUserDataContext.Provider>;
}

export function usePublicUserData() {
  const ctx = useContext(PublicUserDataContext);
  if (!ctx) {
    throw new Error('usePublicUserData must be used within PublicUserDataProvider');
  }
  return ctx;
}
