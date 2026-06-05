import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useAuthSession } from '@/contexts/auth-session-context';
import type { InboxNotification } from '@/data/notifications-models';
import { showToast } from '@/lib/adapters/toast';
import {
  getNotificationsBadgeCount,
  listNotificationsPage,
  postNotificationMarkRead,
  postNotificationsMarkAllRead,
} from '@/lib/api/notifications';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';
import i18n from '@/lib/i18n/init';
import { apiInboxRowToInboxNotification } from '@/lib/public/notification-inbox-adapter';
import { useAppTranslation } from '@/hooks/use-app-translation';

type NotificationInboxContextValue = {
  items: InboxNotification[];
  unreadCount: number;
  inboxLoading: boolean;
  inboxError: string | null;
  refreshInbox: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

const NotificationInboxContext = createContext<NotificationInboxContextValue | null>(null);

export function NotificationInboxProvider({ children }: { children: React.ReactNode }) {
  const { hydrated: authHydrated, accountKey, role } = useAuthSession();
  const { t, number, dateMedium } = useAppTranslation();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);

  const refreshInbox = useCallback(async () => {
    if (!authHydrated || !accountKey || role !== 'public') {
      setItems([]);
      setUnreadCount(0);
      setInboxError(null);
      setInboxLoading(false);
      return;
    }
    const token = await getJwtAccessToken();
    if (!token) {
      setItems([]);
      setUnreadCount(0);
      setInboxError(null);
      setInboxLoading(false);
      return;
    }

    setInboxLoading(true);
    setInboxError(null);
    const [badgeR, listR] = await Promise.all([
      getNotificationsBadgeCount(),
      listNotificationsPage({ page: 1, limit: 50, view: 'inbox' }),
    ]);

    if (listR.ok) {
      setItems(
        listR.items.map((row) =>
          apiInboxRowToInboxNotification(row as Record<string, unknown>, { t, number, dateMedium }),
        ),
      );
      setInboxError(null);
    } else {
      setItems([]);
      setInboxError(listR.message);
    }

    if (badgeR.ok) {
      setUnreadCount(badgeR.count);
    } else if (listR.ok) {
      const unreadFromList = listR.items.filter(
        (row) => (row as Record<string, unknown>).readStatus !== 'read',
      ).length;
      setUnreadCount(unreadFromList);
    } else {
      setUnreadCount(0);
    }

    setInboxLoading(false);
  }, [authHydrated, accountKey, role, t, number, dateMedium]);

  useEffect(() => {
    void refreshInbox();
  }, [refreshInbox]);

  /** Poll while app is active so home/profile badges stay fresh without WebSockets. */
  useEffect(() => {
    const POLL_MS = 45_000;
    const tick = () => {
      if (AppState.currentState !== 'active') return;
      void refreshInbox();
    };
    const interval = setInterval(tick, POLL_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshInbox();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refreshInbox]);

  const markRead = useCallback(async (id: string) => {
    if (role !== 'public') return;
    const token = await getJwtAccessToken();
    if (!token) return;
    const r = await postNotificationMarkRead(id);
    if (!r.ok) {
      showToast(r.message, 'error');
      return;
    }
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, [role]);

  const markAllRead = useCallback(async () => {
    if (role !== 'public') return;
    const token = await getJwtAccessToken();
    if (!token) return;
    const r = await postNotificationsMarkAllRead();
    if (!r.ok) {
      showToast(r.message, 'error');
      return;
    }
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    showToast(i18n.t('notificationsAllMarkedReadToast'), 'success');
  }, [role]);

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      inboxLoading,
      inboxError,
      refreshInbox,
      markAllRead,
      markRead,
    }),
    [items, unreadCount, inboxLoading, inboxError, refreshInbox, markAllRead, markRead],
  );

  return (
    <NotificationInboxContext.Provider value={value}>{children}</NotificationInboxContext.Provider>
  );
}

export function useNotificationInbox() {
  const ctx = useContext(NotificationInboxContext);
  if (!ctx) {
    throw new Error('useNotificationInbox must be used within NotificationInboxProvider');
  }
  return ctx;
}
