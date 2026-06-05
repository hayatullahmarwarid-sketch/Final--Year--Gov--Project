import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState } from 'react-native';

import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';
import { postPublicDecreeRecordView } from '@/lib/api/public-user';

/** Foreground time on the reader before one view is recorded (per focus session). */
const DWELL_MS = 30_000;
const TICK_MS = 1000;

/**
 * When `enabled`, accumulates time only while this screen is focused and the app is `active`.
 * After 30s, calls `POST /public/decrees/:id/view` once per visit. Leaving the screen resets the timer;
 * opening the decree again can record another view after 30s.
 */
export function useDecreeEngagementView(decreeId: string | null, enabled: boolean) {
  useFocusEffect(
    useCallback(() => {
      if (!decreeId || !enabled) {
        return () => {};
      }
      let cancelled = false;
      let accumulatedMs = 0;
      let posted = false;

      const tick = () => {
        if (cancelled || posted) return;
        if (AppState.currentState !== 'active') return;
        accumulatedMs += TICK_MS;
        if (accumulatedMs < DWELL_MS) return;
        posted = true;
        void (async () => {
          const token = await getJwtAccessToken();
          if (!token) return;
          await postPublicDecreeRecordView(decreeId);
        })();
      };

      const id = setInterval(tick, TICK_MS);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }, [decreeId, enabled]),
  );
}
