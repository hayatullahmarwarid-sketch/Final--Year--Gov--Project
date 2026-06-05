/**
 * Auth API surface (JWT login, session restore, registration helpers).
 */
export type { BackendAuthMeUser, BackendLoginSuccess, BackendLoginUser } from '@/lib/api/auth-jwt';
export {
  getBackendAuthMe,
  postBackendLogin,
  postBackendTokenRefresh,
} from '@/lib/api/auth-jwt';
export { postBackendRegister, type BackendRegisterSuccess, type BackendRegisterUser } from '@/lib/api/auth-public-flow';
