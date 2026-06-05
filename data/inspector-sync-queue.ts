export type InspectorSyncQueueItem = {
  id: string;
  taskId: string;
  type: string;
  status: 'pending' | 'failed' | 'syncing';
  timestamp: string;
  size: string;
  items: string[];
  error?: string;
  progress?: number;
};

/**
 * Local queue is built at runtime (failed draft/submit, future offline outbox) and
 * persisted via `InspectorSyncQueueProvider` — not seeded with demo rows.
 */
export const INSPECTOR_SYNC_QUEUE_ITEMS: InspectorSyncQueueItem[] = [];
