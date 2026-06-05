import { type Href, useRouter } from 'expo-router';
import { useCallback } from 'react';

/** Expo Router–backed `navigate(path)` similar to a single-arg web router. */
export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (path: string) => {
      router.push(path as Href);
    },
    [router],
  );
}
