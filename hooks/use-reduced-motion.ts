import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Reflects system "Reduce motion" — use to skip non-essential opacity/scale feedback.
 */
export function useReducedMotion(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (!cancelled) setEnabled(!!v);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      setEnabled(!!v);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return enabled;
}
