import { useAppAppearance } from '@/contexts/app-appearance-context';

/** Web: same persisted appearance as native (static render uses provider initial state). */
export function useColorScheme() {
  return useAppAppearance().colorScheme;
}
