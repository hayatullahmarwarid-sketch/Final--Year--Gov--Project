import { randomUUID } from 'node:crypto';

export function newRequestId() {
  return randomUUID();
}
