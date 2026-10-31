import { describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { addAllergy, addCondition, countCatData, deleteCat, updateCat } from '@/services/cats';
import { createRecord } from '@/services/records';
import { addMeasurement } from '@/services/health';
import { getPrefs } from '@/services/prefs';
import { makeCat } from './helpers';

describe('cat profiles', () => {
  it('creates multiple cats with independent histories', async () => {
    const a = await makeCat('Luna', { allergies: ['Chicken', 'Fish'], conditions: ['Asthma'] });
    const b = await makeCat('Milo');
    expect(await db.cats.count()).toBe(2);
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await db.allergies.where('catId').equals(a.id).count()).toBe(2);
    expect(await db.diagnoses.where('catId').equals(a.id).count()).toBe(1);
    expect(await db.allergies.where('catId').equals(b.id).count()).toBe(0);
    // First cat becomes the selected cat.
    expect((await getPrefs()).selectedCatId).toBe(a.id);
  });

  it('edits a profile and clears optional fields', async () => {
    const c = await makeCat('Oliver');
    await updateCat(c.id, { breed: 'Maine Coon', color: 'Brown' });
    await updateCat(c.id, { color: '' });
    const saved = await db.cats.get(c.id);
    expect(saved?.breed).toBe('Maine Coon');
    expect(saved?.color).toBeUndefined();
    expect(saved!.updatedAt >= saved!.createdAt).toBe(true);
  });

  it('deletes a cat and its whole history atomically, leaving other cats untouched', async () => {
    const a = await makeCat('A');
    const b = await makeCat('B');
    await createRecord({ catId: a.id, category: 'consultation', title: 'Visit', date: '2024-01-01', source: 'veterinarian', documentIds: [] });
    await createRecord({ catId: b.id, category: 'consultation', title: 'Visit', date: '2024-01-01', source: 'veterinarian', documentIds: [] });
    await addMeasurement({ catId: a.id, type: 'weight', value: 4, measuredAt: new Date().toISOString() });
    await addAllergy(a.id, { allergen: 'Dust', severity: 'mild' });
    await addCondition(a.id, { name: 'CKD', status: 'managed' });
    expect(await countCatData(a.id)).toBe(4);

    await deleteCat(a.id);
    expect(await db.cats.get(a.id)).toBeUndefined();
    expect(await countCatData(a.id)).toBe(0);
    expect(await countCatData(b.id)).toBe(1);
    expect((await getPrefs()).selectedCatId).toBe(b.id);
  });
});
