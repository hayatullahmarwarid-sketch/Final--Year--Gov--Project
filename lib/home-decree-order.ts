import type { Decree } from '@/data/public-decrees-catalog';

const MS_PER_DAY = 86400000;
/** Uploads newer than this window get a stronger bias toward the top of the feed. */
const PRIORITY_FRESH_DAYS = 21;
/** Extra weight for fresh decrees (decays to 0 after `PRIORITY_FRESH_DAYS`). */
const FRESHNESS_WEIGHT = 4;

/** Deterministic PRNG for repeatable order per `shuffleKey` (pull-to-refresh / search changes key). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds a new home-feed order for each `shuffleKey`: not fixed category walk order.
 * Recently uploaded decrees get a higher *expected* rank (new items tend toward the top),
 * while the key changes on refresh / remount so positions reshuffle.
 */
export function buildShuffledHomeDecrees(decrees: Decree[], shuffleKey: number): Decree[] {
  if (decrees.length <= 1) return [...decrees];
  const seed = (shuffleKey >>> 0) || 1;
  const rng = mulberry32(seed);
  const now = Date.now();
  const scored = decrees.map((d) => {
    const uploaded = new Date(d.uploadDate).getTime();
    const ageDays = Math.max(0, (now - uploaded) / MS_PER_DAY);
    const freshness = Math.max(0, (PRIORITY_FRESH_DAYS - ageDays) / PRIORITY_FRESH_DAYS) * FRESHNESS_WEIGHT;
    const score = freshness + rng();
    return { d, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.d);
}
