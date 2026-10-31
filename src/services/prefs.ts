import { db } from '@/db/database';
import type { Preferences } from '@/db/types';
import { nowIso } from '@/lib/utils';
import { safeWrite } from './errors';

export const DEFAULT_PREFS: Preferences = {
  id: 'prefs',
  selectedCatId: null,
  weightUnit: 'kg',
  volumeUnit: 'ml',
  remindersEnabled: true,
  updatedAt: new Date(0).toISOString(),
};

export async function getPrefs(): Promise<Preferences> {
  const p = await db.preferences.get('prefs');
  return { ...DEFAULT_PREFS, ...p };
}

export async function updatePrefs(patch: Partial<Omit<Preferences, 'id'>>): Promise<void> {
  await safeWrite(async () => {
    const current = await getPrefs();
    await db.preferences.put({ ...current, ...patch, id: 'prefs', updatedAt: nowIso() });
  });
}
