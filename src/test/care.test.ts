import { describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import {
  addDiet,
  addQuickLog,
  addRoutine,
  addStock,
  currentDiets,
  markRoutineDone,
  needsRefill,
  quickLogDailyCounts,
  routineStatus,
  stockDaysLeft,
  undoLastQuickLog,
  weightGoalDelta,
} from '@/services/care';
import { clearDose, createMedication, recordDose, slotIso } from '@/services/medications';
import { computeDueReminders, loadReminderData } from '@/services/reminders';
import { addDays, toISODate } from '@/lib/dates';
import { makeCat } from './helpers';

describe('food & diet', () => {
  it('records a food change by ending the current food the day before', async () => {
    const cat = await makeCat();
    await addDiet({ catId: cat.id, foodName: 'Old food', type: 'dry', startDate: '2025-01-01' });
    await addDiet({ catId: cat.id, foodName: 'New food', type: 'wet', startDate: '2025-03-10', reasonForChange: 'Vet advice' }, { replaceCurrent: true });
    const diets = await db.diets.toArray();
    const old = diets.find((d) => d.foodName === 'Old food')!;
    expect(old.endDate).toBe('2025-03-09');
    expect(old.reasonForChange).toBe('Vet advice');
    expect(currentDiets(diets, '2025-04-01').map((d) => d.foodName)).toEqual(['New food']);
    expect(currentDiets(diets, '2025-02-01').map((d) => d.foodName)).toEqual(['Old food']);
  });
});

describe('litter & water counters', () => {
  it('counts per day and supports undo', async () => {
    const cat = await makeCat();
    await addQuickLog(cat.id, 'pee');
    await addQuickLog(cat.id, 'pee');
    await addQuickLog(cat.id, 'poop');
    await addQuickLog(cat.id, 'pee', addDays(new Date(), -1).toISOString());
    let week = quickLogDailyCounts(await db.quickLogs.toArray(), 7);
    expect(week).toHaveLength(7);
    expect(week[6]!.counts).toMatchObject({ pee: 2, poop: 1, water: 0 });
    expect(week[5]!.counts.pee).toBe(1);
    expect(await undoLastQuickLog(cat.id, 'pee')).toBe(true);
    week = quickLogDailyCounts(await db.quickLogs.toArray(), 7);
    expect(week[6]!.counts.pee).toBe(1);
    expect(await undoLastQuickLog(cat.id, 'water')).toBe(false);
  });
});

describe('care routines', () => {
  it('computes next due date and status, and marks done', async () => {
    const cat = await makeCat();
    const now = new Date(2025, 5, 15);
    const r = await addRoutine({ catId: cat.id, kind: 'nails', title: 'Nail trim', intervalDays: 14, startDate: '2025-06-01', doneDates: ['2025-05-25'], remindersEnabled: true });
    expect(routineStatus(r, now)).toMatchObject({ nextDue: '2025-06-08', state: 'overdue' });
    await markRoutineDone(r.id, '2025-06-15');
    const updated = (await db.routines.get(r.id))!;
    expect(updated.doneDates[0]).toBe('2025-06-15');
    expect(routineStatus(updated, now)).toMatchObject({ nextDue: '2025-06-29', state: 'ok' });
    const fresh = await addRoutine({ catId: cat.id, kind: 'flea', title: 'Flea', intervalDays: 30, startDate: '2025-06-15', remindersEnabled: true });
    expect(routineStatus(fresh, now).state).toBe('due');
  });

  it('creates a reminder for overdue routines', async () => {
    const cat = await makeCat();
    await addRoutine({ catId: cat.id, kind: 'deworm', title: 'Deworming', intervalDays: 90, startDate: toISODate(addDays(new Date(), -3)), remindersEnabled: true });
    const due = computeDueReminders(await loadReminderData());
    expect(due.some((x) => x.kind === 'routine')).toBe(true);
  });
});

describe('medicine stock', () => {
  it('decreases stock when a dose is given and restores it when undone', async () => {
    const cat = await makeCat();
    const med = await createMedication(
      { catId: cat.id, name: 'Pill', dosage: '1 tab', route: 'oral', frequency: 'Twice daily', startDate: '2025-01-01', status: 'active', documentIds: [], stockCount: 12, refillWarningDays: 5 },
      { times: ['08:00', '20:00'], remindersEnabled: true },
    );
    const slot = slotIso('2025-02-01', '08:00');
    await recordDose(med, slot, 'given');
    expect((await db.medications.get(med.id))!.stockCount).toBe(11);
    await recordDose(med, slot, 'given'); // re-recording does not double count
    expect((await db.medications.get(med.id))!.stockCount).toBe(11);
    await recordDose(med, slot, 'skipped');
    expect((await db.medications.get(med.id))!.stockCount).toBe(12);
    await recordDose(med, slot, 'given');
    await clearDose(med.id, slot);
    expect((await db.medications.get(med.id))!.stockCount).toBe(12);

    const schedules = await db.medicationSchedules.toArray();
    let m = (await db.medications.get(med.id))!;
    expect(stockDaysLeft(m, schedules)).toBe(6);
    expect(needsRefill(m, schedules)).toBe(false);
    await addStock(med.id, -4);
    m = (await db.medications.get(med.id))!;
    expect(stockDaysLeft(m, schedules)).toBe(4);
    expect(needsRefill(m, schedules)).toBe(true);
    const due = computeDueReminders(await loadReminderData());
    expect(due.some((x) => x.kind === 'refill' && x.refId === med.id)).toBe(true);
  });
});

describe('weight goal', () => {
  it('reports distance from the target', () => {
    expect(weightGoalDelta(5.0, 4.5)).toBeCloseTo(0.5);
    expect(weightGoalDelta(undefined, 4.5)).toBeUndefined();
  });
});
