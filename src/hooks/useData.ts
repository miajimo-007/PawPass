import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { getPrefs, DEFAULT_PREFS } from '@/services/prefs';
import type { Cat, Preferences } from '@/db/types';

/**
 * Reactive data hooks. `undefined` means "still loading" so pages can show skeletons;
 * empty arrays mean "loaded, nothing stored".
 */

export function usePrefs(): Preferences | undefined {
  return useLiveQuery(() => getPrefs(), [], undefined);
}

export function useCats(): Cat[] | undefined {
  return useLiveQuery(() => db.cats.orderBy('createdAt').toArray(), []);
}

/** The cat the user is looking at; falls back to the first cat. */
export function useSelectedCat(): { cat: Cat | null | undefined; cats: Cat[] | undefined; prefs: Preferences } {
  const prefs = usePrefs();
  const cats = useCats();
  if (!prefs || !cats) return { cat: undefined, cats, prefs: prefs ?? DEFAULT_PREFS };
  const cat = cats.find((c) => c.id === prefs.selectedCatId) ?? cats[0] ?? null;
  return { cat, cats, prefs };
}

export function useCatData(catId: string | undefined) {
  return useLiveQuery(async () => {
    if (!catId) return null;
    const since = new Date(Date.now() - 35 * 86_400_000).toISOString();
    const [records, medications, schedules, vaccinations, appointments, measurements, symptoms, allergies, diagnoses, documents, diets, quickLogs, routines] = await Promise.all([
      db.medicalRecords.where('catId').equals(catId).toArray(),
      db.medications.where('catId').equals(catId).toArray(),
      db.medicationSchedules.where('catId').equals(catId).toArray(),
      db.vaccinations.where('catId').equals(catId).toArray(),
      db.appointments.where('catId').equals(catId).toArray(),
      db.measurements.where('catId').equals(catId).toArray(),
      db.symptomLogs.where('catId').equals(catId).toArray(),
      db.allergies.where('catId').equals(catId).toArray(),
      db.diagnoses.where('catId').equals(catId).toArray(),
      // Metadata only for lists; the blob stays in IndexedDB until opened.
      db.documents.where('catId').equals(catId).toArray(),
      db.diets.where('catId').equals(catId).toArray(),
      db.quickLogs.where('[catId+at]').between([catId, since], [catId, '\uffff']).toArray(),
      db.routines.where('catId').equals(catId).toArray(),
    ]);
    return { records, medications, schedules, vaccinations, appointments, measurements, symptoms, allergies, diagnoses, documents, diets, quickLogs, routines };
  }, [catId]);
}

export type CatData = NonNullable<ReturnType<typeof useCatData>>;

export function useMedicationLogs(catId: string | undefined, sinceIso: string) {
  return useLiveQuery(
    async () => (catId ? (await db.medicationLogs.where('catId').equals(catId).toArray()).filter((l) => l.scheduledFor >= sinceIso) : []),
    [catId, sinceIso],
  );
}

export function useClinicNames(): string[] {
  return useLiveQuery(async () => (await db.clinics.toArray()).map((c) => c.name).sort(), [], []) ?? [];
}
