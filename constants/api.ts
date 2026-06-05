import { Platform } from 'react-native';

/**
 * Base URL for the Sharia Decrees API (no trailing slash).
 * Set `EXPO_PUBLIC_API_BASE_URL` in `.env` (e.g. `http://192.168.1.5:4000` for a physical device).
 * Android emulator defaults to `10.0.2.2` (host loopback); iOS simulator / web use `127.0.0.1`.
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (!__DEV__) return '';
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  return 'http://127.0.0.1:4000';
}

/**
 * Turns a path-style file URL from the API (e.g. `/uploads/...` from disk storage) into an
 * absolute URL using the same base as other API calls. Required on native: a relative `/...` URL
 * is not resolved against the API host and can hit the wrong origin (e.g. Metro) or fail.
 */
export function resolveApiAssetUrl(href: string): string {
  const s = String(href ?? '').trim();
  if (!s) return s;
  if (/^https?:\/\//i.test(s)) return s;
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is not set. Add the API base to your .env (e.g. http://YOUR_LAN_IP:4000 for a real device) so file URLs hit the backend, not a wrong host that returns HTML.',
    );
  }
  if (s.startsWith('/')) return `${base}${s}`;
  return `${base}/${s.replace(/^\/+/, '')}`;
}
