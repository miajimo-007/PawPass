import { describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { buildTimeline, createRecord, deleteRecord, filterTimeline, updateRecord } from '@/services/records';
import { createVaccination } from '@/services/vaccinations';
import { createMedication } from '@/services/medications';
import { completeAppointment, createAppointment } from '@/services/appointments';
import { makeCat } from './helpers';

describe('medical records', () => {
  it('creates, updates and builds a chronological timeline', async () => {
    const cat = await makeCat();
    const r1 = await createRecord({ catId: cat.id, category: 'lab', title: 'Blood panel', date: '2024-03-01', source: 'veterinarian', findings: 'Normal', clinic: 'Oak Clinic', documentIds: [] });
    await createRecord({ catId: cat.id, category: 'observation', title: 'Sneezing', date: '2024-06-10', source: 'owner', documentIds: [] });
    const vac = await createVaccination({ catId: cat.id, vaccine: 'FVRCP', dateGiven: '2024-04-15', documentIds: [] });
    await createMedication(
      { catId: cat.id, name: 'Drug', dosage: '1 tab', route: 'oral', frequency: 'Daily', startDate: '2023-12-01', status: 'active', documentIds: [] },
      { times: [], remindersEnabled: false },
    );
    await updateRecord(r1.id, { ...r1, title: 'Senior blood panel' });

    const [records, vaccinations, medications] = await Promise.all([db.medicalRecords.toArray(), db.vaccinations.toArray(), db.medications.toArray()]);
    const tl = buildTimeline(records, vaccinations, medications);
    expect(tl.map((i) => i.date)).toEqual(['2024-06-10', '2024-04-15', '2024-03-01', '2023-12-01']);
    expect(tl.find((i) => i.id === r1.id)?.title).toBe('Senior blood panel');
    expect(tl.find((i) => i.id === vac.id)?.source).toBe('owner');

    expect(filterTimeline(tl, { categories: ['lab'] })).toHaveLength(1);
    expect(filterTimeline(tl, { query: 'normal' })).toHaveLength(1);
    expect(filterTimeline(tl, { from: '2024-04-01', to: '2024-12-31' })).toHaveLength(2);
    expect(filterTimeline(tl, { source: 'owner' }).every((i) => i.source === 'owner')).toBe(true);
    expect(await db.clinics.where('name').equals('Oak Clinic').count()).toBe(1);
  });

  it('unlinks (never deletes) an appointment when its visit record is deleted', async () => {
    const cat = await makeCat();
    const apt = await createAppointment({ catId: cat.id, title: 'Check-up', dateTime: new Date().toISOString(), status: 'scheduled', reminderMinutes: null });
    const rec = await completeAppointment(apt.id, { findings: 'All good' });
    expect(rec?.appointmentId).toBe(apt.id);
    expect((await db.appointments.get(apt.id))?.linkedRecordId).toBe(rec!.id);
    await deleteRecord(rec!.id);
    const after = await db.appointments.get(apt.id);
    expect(after?.status).toBe('completed');
    expect(after?.linkedRecordId).toBeUndefined();
  });
});
