/**
 * Fisher–Yates shuffle (in-place copy).
 * @template T
 * @param {T[]} items
 * @param {() => number} [random]
 * @returns {T[]}
 */
export function shuffleArray(items, random = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}
