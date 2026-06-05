import { isLoginEmailValid } from '@/lib/validation/login-email';

/** Public login identifier: verified email only. */
export function isPublicLoginIdentifierValid(raw: string): boolean {
  return isLoginEmailValid(raw);
}
