import { describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { buildDoseSlots, clearDose, createMedication, deleteMedication, recordDose, setMedicationStatus, slotIso } from '@/services/medications';
import { makeCat } from './helpers';

const day = '2025-02-10';

describe('medication tracking', () => {
  it('stores schedule, records doses as given/skipped and reports unrecorded slots', async () => {
    const cat = await makeCat();
    const med = await createMedication(
      { catId: cat.id, name: 'Methimazole', dosage: '2.5 mg', route: 'oral', frequency: 'Twice daily', startDate: '2025-02-01', status: 'active', documentIds: [] },
      { times: ['20:00', '08:00'], remindersEnabled: true },
    );
    const sched = await db.medicationSchedules.where('medicationId').equals(med.id).first();
    expect(sched?.times).toEqual(['08:00', '20:00']);

    await recordDose(med, slotIso(day, '08:00'), 'given');
    let slots = buildDoseSlots(day, [med], [sched!], await db.medicationLogs.toArray());
    expect(slots.map((s) => s.status)).toEqual(['given', 'not_recorded']);

    // Re-recording the same slot replaces it instead of duplicating.
    await recordDose(med, slotIso(day, '08:00'), 'skipped');
    expect(await db.medicationLogs.count()).toBe(1);
    slots = buildDoseSlots(day, [med], [sched!], await db.medicationLogs.toArray());
    expect(slots[0]!.status).toBe('skipped');

    await clearDose(med.id, slotIso(day, '08:00'));
    expect(await db.medicationLogs.count()).toBe(0);
  });

  it('does not produce slots outside the course dates or for stopped medications', async () => {
    const cat = await makeCat();
    const med = await createMedication(
      { catId: cat.id, name: 'Antibiotic', dosage: '1 ml', route: 'oral', frequency: 'Daily', startDate: '2025-02-05', endDate: '2025-02-08', status: 'active', documentIds: [] },
      { times: ['09:00'], remindersEnabled: true },
    );
    const sched = (await db.medicationSchedules.toArray())[0]!;
    expect(buildDoseSlots('2025-02-04', [med], [sched], [])).toHaveLength(0);
    expect(buildDoseSlots('2025-02-06', [med], [sched], [])).toHaveLength(1);
    expect(buildDoseSlots('2025-02-09', [med], [sched], [])).toHaveLength(0);
    await setMedicationStatus(med.id, 'stopped');
    const stopped = (await db.medications.get(med.id))!;
    expect(buildDoseSlots('2025-02-06', [stopped], [sched], [])).toHaveLength(0);
  });

  it('deletes a medication together with its schedule and dose log', async () => {
    const cat = await makeCat();
    const med = await createMedication(
      { catId: cat.id, name: 'X', dosage: '1', route: 'oral', frequency: 'Daily', startDate: '2025-01-01', status: 'active', documentIds: [] },
      { times: ['08:00'], remindersEnabled: true },
    );
    await recordDose(med, slotIso(day, '08:00'), 'given');
    await deleteMedication(med.id);
    expect(await db.medications.count()).toBe(0);
    expect(await db.medicationSchedules.count()).toBe(0);
    expect(await db.medicationLogs.count()).toBe(0);
  });
});
