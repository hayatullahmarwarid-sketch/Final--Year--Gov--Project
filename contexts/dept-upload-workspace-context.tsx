import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { RejectActivityAppend } from '@/components/dept-upload/DeptUploadRecentActivityCard';

type Ctx = {
  rejectActivityFeed: RejectActivityAppend[];
  appendRejectActivity: (entry: RejectActivityAppend) => void;
};

const DeptUploadWorkspaceContext = createContext<Ctx | null>(null);

export function DeptUploadWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [rejectActivityFeed, setRejectActivityFeed] = useState<RejectActivityAppend[]>([]);

  const appendRejectActivity = useCallback((entry: RejectActivityAppend) => {
    setRejectActivityFeed((prev) => [entry, ...prev]);
  }, []);

  const value = useMemo(
    () => ({ rejectActivityFeed, appendRejectActivity }),
    [rejectActivityFeed, appendRejectActivity],
  );

  return <DeptUploadWorkspaceContext.Provider value={value}>{children}</DeptUploadWorkspaceContext.Provider>;
}

export function useDeptUploadWorkspace(): Ctx {
  const v = useContext(DeptUploadWorkspaceContext);
  if (!v) {
    throw new Error('useDeptUploadWorkspace must be used within DeptUploadWorkspaceProvider');
  }
  return v;
}
