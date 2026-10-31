import { describe, expect, it } from 'vitest';
import { PawpassDB } from '@/db/database';
import { LATEST_DB_VERSION, migrations } from '@/db/migrations';

describe('database migrations', () => {
  it('declares strictly increasing versions', () => {
    const versions = migrations.map((m) => m.version);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(new Set(versions).size).toBe(versions.length);
    expect(LATEST_DB_VERSION).toBe(versions.at(-1));
  });

  it('upgrades a version-1 database without losing or overwriting data', async () => {
    const name = 'pawpass-migration-test';
    const v1 = new PawpassDB(name, 1);
    await v1.open();
    expect(v1.verno).toBe(1);
    await v1.cats.add({ id: 'c1', name: 'Old cat', sex: 'female', neuterStatus: 'unknown', createdAt: '2023-01-01', updatedAt: '2023-01-01' });
    // A v1 row that predates the documentIds field, and one that already has documents.
    await v1.medicalRecords.add({ id: 'r1', catId: 'c1', category: 'other', title: 'Legacy', date: '2023-01-01', source: 'owner', createdAt: '2023-01-01', updatedAt: '2023-01-01' } as never);
    await v1.medicalRecords.add({ id: 'r2', catId: 'c1', category: 'other', title: 'Has docs', date: '2023-01-02', source: 'owner', documentIds: ['d1'], createdAt: '2023-01-01', updatedAt: '2023-01-01' });
    v1.close();

    const latest = new PawpassDB(name);
    await latest.open();
    expect(latest.verno).toBe(LATEST_DB_VERSION);
    expect((await latest.cats.get('c1'))?.name).toBe('Old cat');
    expect((await latest.medicalRecords.get('r1'))?.documentIds).toEqual([]);
    expect((await latest.medicalRecords.get('r2'))?.documentIds).toEqual(['d1']);
    // New compound index works.
    expect(await latest.medicalRecords.where('[catId+date]').between(['c1', '2023-01-01'], ['c1', '2023-12-31'], true, true).count()).toBe(2);
    await latest.delete();
  });
});
