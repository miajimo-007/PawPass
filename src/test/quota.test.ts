import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/database';
import { createRecord } from '@/services/records';
import { StorageFullError, isQuotaError } from '@/services/errors';
import { importBackup, createBackup, parseBackup } from '@/services/backup';
import { makeCat } from './helpers';

function quotaError() {
  const e = new Error('The quota has been exceeded.');
  e.name = 'QuotaExceededError';
  return e;
}

afterEach(() => vi.restoreAllMocks());

describe('storage quota errors', () => {
  it('recognises quota errors including wrapped Dexie errors', () => {
    expect(isQuotaError(quotaError())).toBe(true);
    expect(isQuotaError({ name: 'AbortError', inner: quotaError() })).toBe(true);
    expect(isQuotaError(new Error('other'))).toBe(false);
  });

  it('surfaces a friendly error and keeps existing records intact', async () => {
    const cat = await makeCat();
    const existing = await createRecord({ catId: cat.id, category: 'other', title: 'Keep me', date: '2025-01-01', source: 'owner', documentIds: [] });
    vi.spyOn(db.medicalRecords, 'add').mockRejectedValueOnce(quotaError());
    await expect(
      createRecord({ catId: cat.id, category: 'other', title: 'Too big', date: '2025-01-02', source: 'owner', documentIds: [] }),
    ).rejects.toBeInstanceOf(StorageFullError);
    expect(await db.medicalRecords.count()).toBe(1);
    expect((await db.medicalRecords.get(existing.id))?.title).toBe('Keep me');
  });

  it('rolls back a whole import if storage runs out part-way', async () => {
    const cat = await makeCat('Original');
    const backup = parseBackup(JSON.stringify(await createBackup('full')));
    // Make the backup "new" by changing ids, then fail on the second table write.
    backup.tables.cats = backup.tables.cats!.map((c) => ({ ...c, id: 'new-cat', name: 'Imported' }));
    backup.tables.allergies = [{ id: 'a1', createdAt: '2025-01-01', catId: 'new-cat', allergen: 'Dust', severity: 'mild' }];
    // Inside a transaction Dexie uses transaction-bound table objects, so patch the shared prototype
    // and fail only the write to the allergies table.
    const proto = Object.getPrototypeOf(db.allergies) as { bulkPut: (...args: unknown[]) => Promise<unknown> };
    const originalBulkPut = proto.bulkPut;
    vi.spyOn(proto, 'bulkPut').mockImplementation(function (this: { name: string }, ...args: unknown[]) {
      if (this.name === 'allergies') return Promise.reject(quotaError());
      return originalBulkPut.apply(this, args);
    });
    await expect(importBackup(backup)).rejects.toBeInstanceOf(StorageFullError);
    expect(await db.cats.count()).toBe(1);
    expect((await db.cats.toArray())[0]!.id).toBe(cat.id);
  });
});
