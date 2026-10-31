import { DATA_TABLES, db } from '@/db/database';
import { audit } from './base';

/** Permanently deletes every PAWPASS record on this device. Requires explicit confirmation in the UI. */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [...DATA_TABLES.map((t) => db.table(t)), db.notifications, db.preferences, db.auditEvents], async () => {
    for (const t of DATA_TABLES) await db.table(t).clear();
    await db.notifications.clear();
    await db.preferences.clear();
    await db.auditEvents.clear();
    await audit('clear', 'database', 'All local data was cleared by the user');
  });
}

export async function countAll(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of DATA_TABLES) out[t] = await db.table(t).count();
  return out;
}

/** Rough size of stored documents and photos (bytes). */
export async function estimateBlobBytes(): Promise<number> {
  let total = 0;
  await db.documents.each((d) => {
    total += d.size ?? 0;
  });
  await db.cats.each((c) => {
    total += c.photo?.size ?? 0;
  });
  return total;
}
