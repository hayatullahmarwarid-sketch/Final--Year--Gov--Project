import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  computeRoleTotals,
  getSystemAdminState,
  systemAdminActions,
  type AdminNotification,
  type AuditLogEntry,
  type SystemAdminOverviewSnapshot,
} from '@/data/system-admin-store';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';
import {
  getSystemSummary,
  listAllAuditLogs,
  listAllStaff,
  listSystemAdminNotificationsPage,
  type SystemAdminInboxNotification,
} from '@/lib/api/system-admin';
import i18n from '@/lib/i18n/init';
import { auditRowToEntry, roleBreakdownToTotals, staffMemberToStaffUser } from '@/lib/system-admin-mapper';

type SystemAdminRemoteContextValue = {
  refreshRemote: () => Promise<void>;
  remoteBusy: boolean;
  lastRemoteError: string | null;
  publicUserCountFromApi: number | null;
  apiConnected: boolean;
};

const SystemAdminRemoteContext = createContext<SystemAdminRemoteContextValue | null>(null);

function inboxToAdminNotification(n: SystemAdminInboxNotification): AdminNotification {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt ?? new Date().toISOString(),
    read: n.readStatus === 'read',
  };
}

function overviewFromSummary(
  data: import('@/lib/api/system-admin').SystemSummary,
): SystemAdminOverviewSnapshot {
  const buckets = data.auditActivityBuckets ?? [];
  const h = data.health;
  return {
    generatedAt: data.generatedAt ?? null,
    healthApi: h?.api ?? null,
    healthDb: h?.database ?? null,
    healthStatus: h?.status ?? null,
    healthSummary: null,
    publishedDecreeCount: typeof data.totals?.publishedDecrees === 'number' ? data.totals.publishedDecrees : null,
    auditEvents24h: typeof data.totals?.auditEvents24h === 'number' ? data.totals.auditEvents24h : null,
    auditSecurityEvents24h:
      typeof data.totals?.auditSecurityEvents24h === 'number' ? data.totals.auditSecurityEvents24h : null,
    totalUsersCount: typeof data.totals?.totalUsers === 'number' ? data.totals.totalUsers : null,
    totalUsersTrendPct7d: typeof data.trends?.totalUsersPct7d === 'number' ? data.trends.totalUsersPct7d : null,
    securityEventsTrendPct24h:
      typeof data.trends?.securityEventsPct24h === 'number' ? data.trends.securityEventsPct24h : null,
    auditActivityBuckets: buckets.length ? buckets : null,
    healthUptimeSeconds: typeof h?.uptimeSeconds === 'number' ? h.uptimeSeconds : null,
    healthDatabaseLatencyMs: typeof h?.databaseLatencyMs === 'number' ? h.databaseLatencyMs : null,
    healthHttpErrorRatePct: typeof h?.httpErrorRatePct === 'number' ? h.httpErrorRatePct : null,
  };
}

export function SystemAdminRemoteProvider({ children }: { children: React.ReactNode }) {
  const [remoteBusy, setRemoteBusy] = useState(false);
  const [lastRemoteError, setLastRemoteError] = useState<string | null>(null);
  const [publicUserCountFromApi, setPublicUserCountFromApi] = useState<number | null>(null);
  const [apiConnected, setApiConnected] = useState(false);

  const refreshRemote = useCallback(async () => {
    const token = await getJwtAccessToken();
    if (!token) {
      setLastRemoteError(null);
      setPublicUserCountFromApi(null);
      setApiConnected(false);
      return;
    }
    setRemoteBusy(true);
    setLastRemoteError(null);
    try {
      const [staffR, logsR, summaryR, notifR] = await Promise.all([
        listAllStaff(25),
        listAllAuditLogs(500),
        getSystemSummary(),
        listSystemAdminNotificationsPage({ page: 1, limit: 50 }),
      ]);

      const errors: string[] = [];
      if (!staffR.ok) errors.push(i18n.t('systemAdminErrDirectory', { message: staffR.message }));
      if (!logsR.ok) errors.push(i18n.t('systemAdminErrAudit', { message: logsR.message }));
      if (!summaryR.ok) errors.push(i18n.t('systemAdminErrSummary', { message: summaryR.message }));
      if (!notifR.ok) errors.push(i18n.t('systemAdminErrNotifications', { message: notifR.message }));

      const coreOk = staffR.ok || logsR.ok || summaryR.ok;
      if (!coreOk) {
        setLastRemoteError(errors.length ? errors.join(' · ') : i18n.t('systemAdminApiUnreachable'));
        setPublicUserCountFromApi(null);
        setApiConnected(false);
        return;
      }

      const payload: Parameters<typeof systemAdminActions.hydrateRemoteDirectory>[0] = {};
      const prevStaff = getSystemAdminState().staffUsers;

      if (staffR.ok) {
        payload.staffUsers = staffR.items.map(staffMemberToStaffUser);
      }

      if (logsR.ok) {
        payload.auditLogs = logsR.items.map(auditRowToEntry).filter(Boolean) as AuditLogEntry[];
      }

      if (summaryR.ok) {
        payload.overview = overviewFromSummary(summaryR.data);
        if (summaryR.data.staffRoleBreakdown?.length) {
          payload.roleTotals = roleBreakdownToTotals(summaryR.data.staffRoleBreakdown);
        }
      }

      const staffForTotals = payload.staffUsers ?? prevStaff;
      if (!payload.roleTotals && staffR.ok) {
        payload.roleTotals = computeRoleTotals(staffForTotals);
      }

      if (notifR.ok) {
        payload.notifications = notifR.result.items.map(inboxToAdminNotification);
        payload.notificationsFromRemote = true;
      }

      systemAdminActions.hydrateRemoteDirectory(payload);

      if (summaryR.ok && typeof summaryR.data.totals?.publicUsers === 'number') {
        setPublicUserCountFromApi(summaryR.data.totals.publicUsers);
      } else {
        setPublicUserCountFromApi(null);
      }

      setApiConnected(true);
      setLastRemoteError(errors.length ? errors.join(' · ') : null);
    } catch (e) {
      setLastRemoteError(e instanceof Error ? e.message : String(e));
      setApiConnected(false);
    } finally {
      setRemoteBusy(false);
    }
  }, []);

  useEffect(() => {
    void refreshRemote();
  }, [refreshRemote]);

  const value = useMemo<SystemAdminRemoteContextValue>(
    () => ({
      refreshRemote,
      remoteBusy,
      lastRemoteError,
      publicUserCountFromApi,
      apiConnected,
    }),
    [refreshRemote, remoteBusy, lastRemoteError, publicUserCountFromApi, apiConnected],
  );

  return <SystemAdminRemoteContext.Provider value={value}>{children}</SystemAdminRemoteContext.Provider>;
}

export function useSystemAdminRemote(): SystemAdminRemoteContextValue {
  const ctx = useContext(SystemAdminRemoteContext);
  if (!ctx) {
    throw new Error('useSystemAdminRemote must be used within SystemAdminRemoteProvider');
  }
  return ctx;
}
