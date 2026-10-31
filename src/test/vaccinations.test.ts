import { describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { createVaccination, dueVaccinations, vaccinationDueStatus } from '@/services/vaccinations';
import { makeCat } from './helpers';

const now = new Date(2025, 5, 15); // 15 June 2025, local time

describe('vaccination tracking', () => {
  it('classifies overdue, due-soon, upcoming and missing due dates', async () => {
    const cat = await makeCat();
    await createVaccination({ catId: cat.id, vaccine: 'Rabies', dateGiven: '2024-05-01', nextDueDate: '2025-06-01', documentIds: [] });
    await createVaccination({ catId: cat.id, vaccine: 'FVRCP', dateGiven: '2024-07-01', nextDueDate: '2025-07-01', documentIds: [] });
    await createVaccination({ catId: cat.id, vaccine: 'FeLV', dateGiven: '2025-01-01', nextDueDate: '2026-01-01', documentIds: [] });
    await createVaccination({ catId: cat.id, vaccine: 'Other', dateGiven: '2025-01-01', documentIds: [] });
    const all = await db.vaccinations.toArray();
    const by = (n: string) => vaccinationDueStatus(all.find((v) => v.vaccine === n)!, all, now);
    expect(by('Rabies')).toBe('overdue');
    expect(by('FVRCP')).toBe('due-soon');
    expect(by('FeLV')).toBe('upcoming');
    expect(by('Other')).toBe('none');
    expect(dueVaccinations(all, now).map((x) => x.v.vaccine)).toEqual(['Rabies', 'FVRCP', 'FeLV']);
  });

  it('treats an older dose as superseded by a newer dose of the same vaccine', async () => {
    const cat = await makeCat();
    await createVaccination({ catId: cat.id, vaccine: 'Rabies', dateGiven: '2024-05-01', nextDueDate: '2025-06-01', documentIds: [] });
    await createVaccination({ catId: cat.id, vaccine: 'rabies ', dateGiven: '2025-06-05', nextDueDate: '2028-06-05', documentIds: [] });
    const all = await db.vaccinations.toArray();
    expect(dueVaccinations(all, now)).toHaveLength(1);
    expect(dueVaccinations(all, now)[0]!.status).toBe('upcoming');
  });
});
