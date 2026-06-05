/** @type {ReadonlyArray<{ method: string, path: string }>} */
export const INSPECTORS_ROUTE_MAP = Object.freeze([
  { method: 'GET', path: '/_meta' },
  { method: 'GET', path: '/dashboard' },
  { method: 'GET', path: '/assignments' },
  { method: 'GET', path: '/assignments/:id' },
  { method: 'POST', path: '/assignments/:id/save-draft' },
  { method: 'POST', path: '/assignments/:id/submit' },
  { method: 'POST', path: '/assignments/:id/evidence' },
  { method: 'GET', path: '/sync-status' },
  { method: 'GET', path: '/profile' },
]);
