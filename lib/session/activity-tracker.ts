let lastActivityMs = Date.now();

export function bumpActivity(): void {
  lastActivityMs = Date.now();
}

export function msSinceActivity(): number {
  return Date.now() - lastActivityMs;
}
