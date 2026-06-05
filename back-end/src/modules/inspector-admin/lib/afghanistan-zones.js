/**
 * Afghanistan zones (8) + location parsing helpers.
 *
 * Tracking uses the *city/province token* as the primary reference point.
 * We extract the first segment from the structured template location:
 *   "Kabul city, District 4, ..." -> "kabul"
 *
 * Notes:
 * - Inputs may include "city", "province", "wilayat/ولایت", extra punctuation, or casing differences.
 * - We normalize to a conservative ASCII-ish key used for matching.
 */
 
/**
 * @typedef {'central'|'western'|'south_western'|'south_eastern'|'eastern'|'northern'|'north_eastern'|'central_highlands'} AfghanistanZoneKey
 */
 
/** @type {Array<{ key: AfghanistanZoneKey, name: string, anchor: string, provinces: string[] }>} */
export const AFGHANISTAN_ZONES = [
  {
    key: 'central',
    name: 'Central Zone',
    anchor: 'Kabul',
    provinces: ['kabul', 'kapisa', 'parwan', 'panjshir', 'wardak', 'logar'],
  },
  {
    key: 'western',
    name: 'Western Zone',
    anchor: 'Herat',
    provinces: ['herat', 'farah', 'badghis', 'ghor'],
  },
  {
    key: 'south_western',
    name: 'South-Western Zone',
    anchor: 'Kandahar',
    provinces: ['kandahar', 'helmand', 'zabul', 'uruzgan', 'nimruz', 'daykundi'],
  },
  {
    key: 'south_eastern',
    name: 'South-Eastern Zone',
    anchor: 'Gardez/Paktia',
    provinces: ['paktia', 'paktika', 'khost', 'ghazni'],
  },
  {
    key: 'eastern',
    name: 'Eastern Zone',
    anchor: 'Nangarhar',
    provinces: ['nangarhar', 'laghman', 'kunar', 'nuristan'],
  },
  {
    key: 'northern',
    name: 'Northern Zone',
    anchor: 'Balkh',
    provinces: ['balkh', 'jowzjan', 'sar_e_pol', 'faryab', 'samangan'],
  },
  {
    key: 'north_eastern',
    name: 'North-Eastern Zone',
    anchor: 'Kunduz',
    provinces: ['kunduz', 'badakhshan', 'takhar', 'baghlan'],
  },
  {
    key: 'central_highlands',
    name: 'Central Highlands',
    anchor: 'Bamyan',
    provinces: ['bamyan'],
  },
];
 
const PROVINCE_TO_ZONE = new Map(
  AFGHANISTAN_ZONES.flatMap((z) => z.provinces.map((p) => [p, z.key])),
);
 
/**
 * @param {unknown} v
 * @returns {string}
 */
export function normalizeLocationToken(v) {
  const raw = typeof v === 'string' ? v : '';
  const s = raw
    .trim()
    .toLowerCase()
    // normalize common separators
    .replace(/[|/]+/g, ' ')
    // normalize punctuation that often appears in province names
    .replace(/[’'".]/g, '')
    .replace(/[—–-]+/g, ' ')
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
 
  if (!s) return '';
 
  // Strip common suffixes/prefixes while keeping the core province/city token.
  // We intentionally keep this small and predictable (avoid over-normalizing).
  const stripped = s
    .replace(/\b(city|province|ولاية|ولایت|ولايـت|wilayat)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
 
  if (!stripped) return '';
 
  // Canonicalize a few multi-word province names to stable keys.
  // (We only include ones used in the 8-zone list.)
  if (/^sar\s*e\s*pol$/.test(stripped) || /^sar\s*-\s*e\s*-\s*pol$/.test(stripped)) return 'sar_e_pol';
  if (/^sar\s*pol$/.test(stripped)) return 'sar_e_pol';
 
  return stripped;
}
 
/**
 * Extract the primary city/province token from a structured inspection location field.
 * Expected format: "City, District, ..."
 *
 * @param {unknown} location
 * @returns {string} normalized token (e.g. "kabul", "sar_e_pol") or "".
 */
export function extractPrimaryCityToken(location) {
  const raw = typeof location === 'string' ? location.trim() : '';
  if (!raw) return '';
  const first = raw.split(',')[0] ?? '';
  return normalizeLocationToken(first);
}
 
/**
 * @param {unknown} location
 * @returns {AfghanistanZoneKey | null}
 */
export function zoneKeyFromLocation(location) {
  const token = extractPrimaryCityToken(location);
  if (!token) return null;
  return PROVINCE_TO_ZONE.get(token) ?? null;
}
 
/**
 * @param {AfghanistanZoneKey} key
 * @returns {{ key: AfghanistanZoneKey, name: string, anchor: string, provinces: string[] } | null}
 */
export function zoneByKey(key) {
  return AFGHANISTAN_ZONES.find((z) => z.key === key) ?? null;
}
 
