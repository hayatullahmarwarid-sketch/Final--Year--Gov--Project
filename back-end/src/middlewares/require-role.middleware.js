/**
 * Back-compat barrel so older imports (`require-role.middleware.js`) keep working.
 * New code should import directly from `./authorize.middleware.js`.
 */
export { authorize, isRbacBypassed, FRONTEND_ROLE_TO_ROLE_KEY } from './authorize.middleware.js';
