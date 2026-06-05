import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@sharia_inspector_offline_submit_v1';

export type LocalOfflineSubmit = {
  offlineId: string;
  assignmentId: string;
  answers: Record<string, unknown>[];
  submittedAt: string;
};

export async function loadLocalOfflineSubmits(): Promise<LocalOfflineSubmit[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is LocalOfflineSubmit =>
        x &&
        typeof x === 'object' &&
        typeof (x as LocalOfflineSubmit).offlineId === 'string' &&
        typeof (x as LocalOfflineSubmit).assignmentId === 'string' &&
        Array.isArray((x as LocalOfflineSubmit).answers),
    );
  } catch {
    return [];
  }
}

export async function appendLocalOfflineSubmit(row: LocalOfflineSubmit): Promise<void> {
  const cur = await loadLocalOfflineSubmits();
  cur.push(row);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
}

export async function setLocalOfflineSubmits(rows: LocalOfflineSubmit[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export async function removeLocalOfflineSubmitsByIds(offlineIds: string[]): Promise<void> {
  const drop = new Set(offlineIds);
  const next = (await loadLocalOfflineSubmits()).filter((r) => !drop.has(r.offlineId));
  await setLocalOfflineSubmits(next);
}
