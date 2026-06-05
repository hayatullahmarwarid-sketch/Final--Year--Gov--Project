import { useFocusEffect } from 'expo-router';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { getApiBaseUrl } from '@/constants/api';
import {
  getInspectorTaskStats,
  type InspectorTask,
  type InspectorTaskStats,
} from '@/data/inspector-tasks';
import { getInspectorsDashboard } from '@/lib/api/inspectors';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';
import i18n from '@/lib/i18n/init';

export type InspectorActivityItem = {
  id: string;
  kind: string;
  title: string;
  time: string;
};

function isTaskStatus(v: string): v is InspectorTask['status'] {
  return (
    v === 'assigned' ||
    v === 'in-progress' ||
    v === 'overdue' ||
    v === 'draft' ||
    v === 'completed' ||
    v === 'returned'
  );
}

function isTaskPriority(v: string): v is InspectorTask['priority'] {
  return v === 'high' || v === 'medium' || v === 'low';
}

function mapApiAssignmentToTask(row: Record<string, unknown>): InspectorTask {
  const ts = String(row.taskStatus ?? 'assigned');
  const status: InspectorTask['status'] = isTaskStatus(ts) ? ts : 'assigned';
  const pl = String(row.priorityLevel ?? 'medium');
  const priority: InspectorTask['priority'] = isTaskPriority(pl) ? pl : 'medium';
  const hints = Array.isArray(row.requirementHints) ? (row.requirementHints as string[]) : [];
  const requirements = hints.length > 0 ? hints : [];
  const scopeRaw = String(row.inspectionScope ?? 'single-decree');
  const inspectionScope: InspectorTask['inspectionScope'] =
    scopeRaw === 'category' ? 'category' : 'single-decree';
  const categoryName = String(row.categoryName ?? 'General');
  const decreeTitle = String(row.decreeTitle ?? '');
  const displayTarget =
    typeof row.displayTarget === 'string' && row.displayTarget.trim().length > 0
      ? String(row.displayTarget)
      : `${categoryName} · ${decreeTitle}`;
  const locationLabel =
    String(row.location ?? row.region ?? row.locationName ?? '').trim() || 'Location not set';

  return {
    id: String(row.id ?? ''),
    title: String(row.taskTitle ?? row.decreeTitle ?? 'Inspection'),
    decreeTitle: displayTarget,
    inspectionScope,
    categoryName,
    decreeNumber: String(row.decreeNumber ?? ''),
    region: locationLabel,
    deadline: String(row.deadline ?? ''),
    status,
    priority,
    instructions: String(row.instructions ?? ''),
    requirements,
    returnReason: row.returnReason ? String(row.returnReason) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
  };
}

type InspectorWorkspaceValue = {
  tasks: InspectorTask[];
  stats: InspectorTaskStats;
  recentActivity: InspectorActivityItem[];
  dashboardActivePreviews: InspectorTask[];
  loading: boolean;
  error: string | null;
  usesLiveApi: boolean;
  refresh: () => Promise<void>;
};

const InspectorWorkspaceContext = createContext<InspectorWorkspaceValue | null>(null);

export function InspectorWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<InspectorTask[]>([]);
  const [recentActivity, setRecentActivity] = useState<InspectorActivityItem[]>([]);
  const [dashboardActivePreviews, setDashboardActivePreviews] = useState<InspectorTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usesLiveApi, setUsesLiveApi] = useState(false);

  const stats = useMemo(() => getInspectorTaskStats(tasks), [tasks]);

  const load = useCallback(async () => {
    const base = getApiBaseUrl();
    const token = await getJwtAccessToken();
    if (!base || !token) {
      setUsesLiveApi(false);
      setTasks([]);
      setRecentActivity([]);
      setDashboardActivePreviews([]);
      setError(!base ? i18n.t('inspectorConfigureApiBase') : i18n.t('inspectorSignInJwt'));
      setLoading(false);
      return;
    }

    setUsesLiveApi(true);
    setLoading(true);
    setError(null);

    const dash = await getInspectorsDashboard();
    if (!dash.ok) {
      setError(dash.message);
      setTasks([]);
      setRecentActivity([]);
      setDashboardActivePreviews([]);
      setLoading(false);
      return;
    }

    const payload = dash.data as Record<string, unknown>;
    const rawList = Array.isArray(payload.assignments) ? (payload.assignments as Record<string, unknown>[]) : [];
    const mapped = rawList.map(mapApiAssignmentToTask);
    setTasks(mapped);

    const act = Array.isArray(payload.recentActivity) ? (payload.recentActivity as Record<string, unknown>[]) : [];
    setRecentActivity(
      act.map((a) => ({
        id: String(a.id ?? ''),
        kind: String(a.kind ?? ''),
        title: String(a.title ?? ''),
        time: String(a.time ?? ''),
      })),
    );

    const previews = Array.isArray(payload.activeTaskPreviews)
      ? (payload.activeTaskPreviews as Record<string, unknown>[])
      : [];
    setDashboardActivePreviews(previews.map(mapApiAssignmentToTask));

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const value = useMemo<InspectorWorkspaceValue>(
    () => ({
      tasks,
      stats,
      recentActivity,
      dashboardActivePreviews,
      loading,
      error,
      usesLiveApi,
      refresh: load,
    }),
    [tasks, stats, recentActivity, dashboardActivePreviews, loading, error, usesLiveApi, load],
  );

  return <InspectorWorkspaceContext.Provider value={value}>{children}</InspectorWorkspaceContext.Provider>;
}

export function useInspectorWorkspace(): InspectorWorkspaceValue {
  const ctx = useContext(InspectorWorkspaceContext);
  if (!ctx) {
    throw new Error('useInspectorWorkspace must be used within InspectorWorkspaceProvider');
  }
  return ctx;
}
