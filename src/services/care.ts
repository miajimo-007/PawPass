import { db } from '@/db/database';
import type { Diet, Medication, MedicationSchedule, QuickLog, QuickLogKind, Routine } from '@/db/types';
import { addDays, daysBetween, parseISODate, toISODate } from '@/lib/dates';
import { FOOD_TYPES, QUICK_LOG_LABELS, ROUTINE_KINDS } from '@/lib/labels';
import { nowIso } from '@/lib/utils';
import { audit, clean, stamp } from './base';
import { NotFoundError, safeWrite } from './errors';

// ---- Diet --------------------------------------------------------------------------------------

export type DietInput = Omit<Diet, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>;

/**
 * Adds a food. When `replaceCurrent` is set, every current food of this cat is
 * ended the day before the new one starts (a "food change"), in one transaction.
 */
export async function addDiet(input: DietInput, opts: { replaceCurrent?: boolean; isDemo?: boolean } = {}): Promise<Diet> {
  return safeWrite(() =>
    db.transaction('rw', [db.diets, db.auditEvents], async () => {
      if (opts.replaceCurrent) {
        const end = toISODate(addDays(parseISODate(input.startDate), -1));
        const current = (await db.diets.where('catId').equals(input.catId).toArray()).filter((d) => !d.endDate);
        for (const d of current) {
          await db.diets.update(d.id, { endDate: end < d.startDate ? d.startDate : end, reasonForChange: input.reasonForChange, updatedAt: nowIso() });
        }
      }
      const row = stamp(clean(input), opts) as Diet;
      await db.diets.add(row);
      await audit('create', 'diet', `${opts.replaceCurrent ? 'Changed food to' : 'Added food'}: ${row.foodName} (${FOOD_TYPES[row.type].toLowerCase()})`, row.id, row.catId);
      return row;
    }),
  );
}

export async function updateDiet(id: string, input: DietInput) {
  await safeWrite(async () => {
    const existing = await db.diets.get(id);
    if (!existing) throw new NotFoundError('This food');
    await db.diets.put(clean({ ...input, id, createdAt: existing.createdAt, updatedAt: nowIso(), isDemo: existing.isDemo }) as Diet);
  });
}

export async function endDiet(id: string, endDate = toISODate(new Date())) {
  await safeWrite(() => db.diets.update(id, { endDate, updatedAt: nowIso() }));
}

export async function deleteDiet(id: string) {
  const row = await db.diets.get(id);
  if (!row) return;
  await db.diets.delete(id);
  await audit('delete', 'diet', `Deleted food: ${row.foodName}`, id, row.catId);
}

export function currentDiets(diets: Diet[], today = toISODate(new Date())): Diet[] {
  return diets.filter((d) => d.startDate <= today && (!d.endDate || d.endDate >= today)).sort((a, b) => b.startDate.localeCompare(a.startDate));
}

// ---- Quick logs (litter box & water) -------------------------------------------------------------

export async function addQuickLog(catId: string, kind: QuickLogKind, at = nowIso(), opts: { isDemo?: boolean } = {}): Promise<QuickLog> {
  return safeWrite(async () => {
    const row = stamp({ catId, kind, at }, opts) as QuickLog;
    await db.quickLogs.add(row);
    return row;
  });
}

/** Removes the most recent entry of a kind for today (undo a mis-tap). */
export async function undoLastQuickLog(catId: string, kind: QuickLogKind): Promise<boolean> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const rows = (await db.quickLogs.where('[catId+at]').between([catId, start.toISOString()], [catId, '￿']).toArray()).filter((r) => r.kind === kind);
  const last = rows.sort((a, b) => b.at.localeCompare(a.at))[0];
  if (!last) return false;
  await db.quickLogs.delete(last.id);
  return true;
}

/** Counts per kind for each of the last `days` local days, oldest first. */
export function quickLogDailyCounts(logs: QuickLog[], days = 7, now = new Date()): { date: string; counts: Record<QuickLogKind, number> }[] {
  const out: { date: string; counts: Record<QuickLogKind, number> }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = toISODate(addDays(now, -i));
    const counts = Object.fromEntries((Object.keys(QUICK_LOG_LABELS) as QuickLogKind[]).map((k) => [k, 0])) as Record<QuickLogKind, number>;
    for (const l of logs) if (toISODate(new Date(l.at)) === date) counts[l.kind]++;
    out.push({ date, counts });
  }
  return out;
}

// ---- Care routines -----------------------------------------------------------------------------

export type RoutineInput = Omit<Routine, 'id' | 'createdAt' | 'updatedAt' | 'isDemo' | 'doneDates'> & { doneDates?: string[] };

export async function addRoutine(input: RoutineInput, opts: { isDemo?: boolean } = {}): Promise<Routine> {
  return safeWrite(async () => {
    const row = stamp(clean({ ...input, doneDates: input.doneDates ?? [] }), opts) as Routine;
    await db.routines.add(row);
    await audit('create', 'routine', `Added care routine: ${row.title}`, row.id, row.catId);
    return row;
  });
}

export async function updateRoutine(id: string, input: RoutineInput) {
  await safeWrite(async () => {
    const existing = await db.routines.get(id);
    if (!existing) throw new NotFoundError('This routine');
    await db.routines.put(
      clean({ ...input, doneDates: input.doneDates ?? existing.doneDates, id, createdAt: existing.createdAt, updatedAt: nowIso(), isDemo: existing.isDemo }) as Routine,
    );
  });
}

export async function markRoutineDone(id: string, date = toISODate(new Date())) {
  await safeWrite(() =>
    db.transaction('rw', [db.routines, db.auditEvents], async () => {
      const r = await db.routines.get(id);
      if (!r) throw new NotFoundError('This routine');
      const doneDates = [...new Set([date, ...r.doneDates])].sort((a, b) => b.localeCompare(a)).slice(0, 100);
      await db.routines.update(id, { doneDates, updatedAt: nowIso() });
      await audit('update', 'routine', `${r.title} done`, id, r.catId);
    }),
  );
}

export async function undoRoutineDone(id: string, date: string) {
  const r = await db.routines.get(id);
  if (!r) return;
  await db.routines.update(id, { doneDates: r.doneDates.filter((d) => d !== date), updatedAt: nowIso() });
}

export async function deleteRoutine(id: string) {
  const r = await db.routines.get(id);
  if (!r) return;
  await db.routines.delete(id);
  await audit('delete', 'routine', `Deleted care routine: ${r.title}`, id, r.catId);
}

export type RoutineState = 'overdue' | 'due' | 'soon' | 'ok';

export function routineNextDue(r: Routine): string {
  const last = r.doneDates[0];
  return last ? toISODate(addDays(parseISODate(last), r.intervalDays)) : r.startDate;
}

export function routineStatus(r: Routine, now = new Date()): { nextDue: string; days: number; state: RoutineState } {
  const nextDue = routineNextDue(r);
  const days = daysBetween(now, parseISODate(nextDue));
  const state: RoutineState = days < 0 ? 'overdue' : days === 0 ? 'due' : days <= Math.min(3, Math.ceil(r.intervalDays / 4)) ? 'soon' : 'ok';
  return { nextDue, days, state };
}

export function routineLabel(r: Pick<Routine, 'kind' | 'title'>): string {
  return r.title || ROUTINE_KINDS[r.kind].label;
}

// ---- Medication stock ---------------------------------------------------------------------------

/** Doses per day for stock forecasting: the number of scheduled reminder times (if any). */
export function dosesPerDay(med: Medication, schedules: MedicationSchedule[]): number {
  return schedules.find((s) => s.medicationId === med.id)?.times.length ?? 0;
}

/** Approximate days of medication left, or undefined when it cannot be estimated. */
export function stockDaysLeft(med: Medication, schedules: MedicationSchedule[]): number | undefined {
  if (med.stockCount == null) return undefined;
  const perDay = dosesPerDay(med, schedules);
  if (!perDay) return undefined;
  return Math.floor(med.stockCount / perDay);
}

export function needsRefill(med: Medication, schedules: MedicationSchedule[]): boolean {
  if (med.status !== 'active' || med.stockCount == null) return false;
  const left = stockDaysLeft(med, schedules);
  const threshold = med.refillWarningDays ?? 5;
  return left !== undefined ? left <= threshold : med.stockCount <= 0;
}

export async function addStock(medicationId: string, amount: number) {
  await safeWrite(() =>
    db.transaction('rw', [db.medications, db.auditEvents], async () => {
      const m = await db.medications.get(medicationId);
      if (!m) throw new NotFoundError('This medication');
      const stockCount = Math.max(0, (m.stockCount ?? 0) + amount);
      await db.medications.update(medicationId, { stockCount, updatedAt: nowIso() });
      await audit('update', 'medication', `${m.name}: stock ${amount >= 0 ? '+' : ''}${amount} (now ${stockCount})`, m.id, m.catId);
    }),
  );
}

// ---- Weight goal --------------------------------------------------------------------------------

/** Difference from the target weight in kg (positive = above target). */
export function weightGoalDelta(latestKg: number | undefined, targetKg: number | undefined): number | undefined {
  if (latestKg == null || targetKg == null) return undefined;
  return latestKg - targetKg;
}
