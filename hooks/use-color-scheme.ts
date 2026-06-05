import { useAppAppearance } from '@/contexts/app-appearance-context';

/** Resolved app light/dark appearance (persisted user choice, not raw OS setting). */
export function useColorScheme() {
  return useAppAppearance().colorScheme;
}
