import { CAT_SCOPED_TABLES, db } from '@/db/database';
import type { Allergy, AllergySeverity, Cat, ConditionStatus, Diagnosis } from '@/db/types';
import { nowIso } from '@/lib/utils';
import { audit, clean, stamp } from './base';
import { rememberClinic } from './clinics';
import { NotFoundError, safeWrite } from './errors';
import { getPrefs, updatePrefs } from './prefs';

export type CatInput = Omit<Cat, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>;

export async function createCat(
  input: CatInput,
  extras: { allergies?: string[]; conditions?: string[]; isDemo?: boolean; id?: string } = {},
): Promise<Cat> {
  return safeWrite(() =>
    db.transaction('rw', [db.cats, db.allergies, db.diagnoses, db.clinics, db.auditEvents, db.preferences], async () => {
      const cat = stamp(clean(input), { isDemo: extras.isDemo, id: extras.id }) as Cat;
      await db.cats.add(cat);
      for (const allergen of extras.allergies ?? []) {
        await db.allergies.add(stamp({ catId: cat.id, allergen, severity: 'unknown' as const }, { isDemo: extras.isDemo }));
      }
      for (const name of extras.conditions ?? []) {
        await db.diagnoses.add(stamp({ catId: cat.id, name, status: 'active' as const }, { isDemo: extras.isDemo }));
      }
      await rememberClinic(input.primaryClinic, {}, extras.isDemo);
      const prefs = await getPrefs();
      if (!prefs.selectedCatId) await updatePrefs({ selectedCatId: cat.id });
      await audit('create', 'cat', `Added ${cat.name}`, cat.id, cat.id);
      return cat;
    }),
  );
}

export async function updateCat(id: string, patch: Partial<CatInput>): Promise<void> {
  await safeWrite(() =>
    db.transaction('rw', [db.cats, db.clinics, db.auditEvents], async () => {
      const existing = await db.cats.get(id);
      if (!existing) throw new NotFoundError('This cat');
      // Explicitly cleared optional fields become undefined; required fields keep their values.
      const next: Cat = { ...existing, ...patch, updatedAt: nowIso() };
      for (const [k, v] of Object.entries(patch)) {
        if (v === '' || v === undefined) delete (next as unknown as Record<string, unknown>)[k];
      }
      await db.cats.put(next);
      await rememberClinic(patch.primaryClinic);
      await audit('update', 'cat', `Updated ${next.name}'s profile`, id, id);
    }),
  );
}

/** Deletes a cat and its entire medical history in one atomic transaction. */
export async function deleteCat(id: string): Promise<void> {
  const tables = [db.cats, db.auditEvents, db.preferences, db.notifications, ...CAT_SCOPED_TABLES.map((t) => db.table(t))];
  await db.transaction('rw', tables, async () => {
    const cat = await db.cats.get(id);
    if (!cat) throw new NotFoundError('This cat');
    for (const t of CAT_SCOPED_TABLES) {
      await db.table(t).where('catId').equals(id).delete();
    }
    await db.notifications.filter((n) => n.catId === id).delete();
    await db.cats.delete(id);
    const prefs = await getPrefs();
    if (prefs.selectedCatId === id) {
      const next = await db.cats.orderBy('createdAt').first();
      await updatePrefs({ selectedCatId: next?.id ?? null });
    }
    await audit('delete', 'cat', `Deleted ${cat.name} and all associated records`, id);
  });
}

export async function countCatData(id: string): Promise<number> {
  let total = 0;
  for (const t of CAT_SCOPED_TABLES) total += await db.table(t).where('catId').equals(id).count();
  return total;
}

// ---- Allergies ----------------------------------------------------------------

export async function addAllergy(catId: string, data: { allergen: string; reaction?: string; severity: AllergySeverity; notes?: string }) {
  return safeWrite(async () => {
    const row = stamp(clean({ catId, ...data })) as Allergy;
    await db.allergies.add(row);
    await audit('create', 'allergy', `Recorded allergy: ${data.allergen}`, row.id, catId);
    return row;
  });
}

export async function deleteAllergy(id: string) {
  const row = await db.allergies.get(id);
  if (!row) return;
  await db.allergies.delete(id);
  await audit('delete', 'allergy', `Removed allergy: ${row.allergen}`, id, row.catId);
}

// ---- Conditions (diagnoses) ---------------------------------------------------

export async function addCondition(catId: string, data: { name: string; status: ConditionStatus; diagnosedOn?: string; notes?: string }) {
  return safeWrite(async () => {
    const row = stamp(clean({ catId, ...data })) as Diagnosis;
    await db.diagnoses.add(row);
    await audit('create', 'diagnosis', `Recorded condition: ${data.name}`, row.id, catId);
    return row;
  });
}

export async function updateConditionStatus(id: string, status: ConditionStatus) {
  await safeWrite(() => db.diagnoses.update(id, { status, updatedAt: nowIso() }));
}

export async function deleteCondition(id: string) {
  const row = await db.diagnoses.get(id);
  if (!row) return;
  await db.diagnoses.delete(id);
  await audit('delete', 'diagnosis', `Removed condition: ${row.name}`, id, row.catId);
}
