import { describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { BackupValidationError, createBackup, exportBackupBlob, importBackup, parseBackup, previewBackup } from '@/services/backup';
import { addDocument } from '@/services/documents';
import { createRecord } from '@/services/records';
import { createMedication, recordDose, slotIso } from '@/services/medications';
import { addMeasurement } from '@/services/health';
import { clearAllData } from '@/services/dataManagement';
import { getPrefs } from '@/services/prefs';
import { makeCat } from './helpers';

async function seed() {
  const cat = await makeCat('Luna', { allergies: ['Chicken'] });
  const photo = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' });
  await db.cats.update(cat.id, { photo });
  const doc = await addDocument(Object.assign(new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), { name: 'x.pdf' }), {
    catId: cat.id,
    title: 'X-ray report',
    category: 'imaging',
    date: '2024-02-02',
  });
  const rec = await createRecord({ catId: cat.id, category: 'imaging', title: 'Chest X-ray', date: '2024-02-02', source: 'veterinarian', documentIds: [doc.id] });
  const med = await createMedication(
    { catId: cat.id, name: 'Med', dosage: '1', route: 'oral', frequency: 'Daily', startDate: '2024-01-01', status: 'active', documentIds: [] },
    { times: ['08:00'], remindersEnabled: true },
  );
  await recordDose(med, slotIso('2024-01-02', '08:00'), 'given');
  await addMeasurement({ catId: cat.id, type: 'weight', value: 4.1, measuredAt: '2024-01-05T10:00:00.000Z' });
  return { cat, doc, rec };
}

describe('JSON backup and restore', () => {
  it('exports a complete backup and restores it with original ids, dates and files', async () => {
    const { cat, doc, rec } = await seed();
    const originalRec = await db.medicalRecords.get(rec.id);
    const { blob, counts } = await exportBackupBlob('full');
    expect(counts.cats).toBe(1);
    expect(counts.documents).toBe(1);
    expect((await getPrefs()).lastBackupAt).toBeTruthy();
    const text = await blob.text();
    expect(text).toContain('"format":"pawpass-backup"');

    await clearAllData();
    expect(await db.cats.count()).toBe(0);

    const backup = parseBackup(text);
    const preview = await previewBackup(backup);
    expect(preview.catNames).toEqual(['Luna']);
    expect(preview.totals.duplicates).toBe(0);
    expect(preview.totals.invalid).toBe(0);

    const report = await importBackup(backup);
    expect(report.failed).toBe(0);
    expect(report.imported).toBe(preview.totals.new);

    const restoredRec = await db.medicalRecords.get(rec.id);
    expect(restoredRec).toEqual(originalRec);
    const restoredDoc = await db.documents.get(doc.id);
    expect(await restoredDoc!.blob.text()).toBe('%PDF-1.4 test');
    const restoredCat = await db.cats.get(cat.id);
    expect(new Uint8Array(await restoredCat!.photo!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(restoredCat!.createdAt).toBe(cat.createdAt);
    expect(await db.medicationLogs.count()).toBe(1);
  });

  it('detects duplicates and either skips them or replaces them', async () => {
    const { rec } = await seed();
    const backup = parseBackup(JSON.stringify(await createBackup('full')));
    await db.medicalRecords.update(rec.id, { title: 'Edited locally' });

    const preview = await previewBackup(backup);
    expect(preview.totals.new).toBe(0);
    expect(preview.totals.duplicates).toBe(preview.totals.total);

    const skip = await importBackup(backup, 'skip');
    expect(skip.imported).toBe(0);
    expect(skip.skipped).toBe(preview.totals.total);
    expect((await db.medicalRecords.get(rec.id))?.title).toBe('Edited locally');

    const replace = await importBackup(backup, 'replace');
    expect(replace.replaced).toBe(preview.totals.total);
    expect((await db.medicalRecords.get(rec.id))?.title).toBe('Chest X-ray');
  });

  it('never deletes existing records when importing', async () => {
    const other = await makeCat('Already here');
    const { cat } = await seed();
    const backup = parseBackup(JSON.stringify(await createBackup('full', { catId: cat.id })));
    expect(backup.tables.cats).toHaveLength(1);
    await importBackup(backup, 'replace');
    expect(await db.cats.get(other.id)).toBeTruthy();
  });

  it('rejects files that are not PAWPASS backups', () => {
    expect(() => parseBackup('not json')).toThrow(BackupValidationError);
    expect(() => parseBackup('{"hello":1}')).toThrow(/not a PAWPASS backup/);
    expect(() =>
      parseBackup(JSON.stringify({ format: 'pawpass-backup', formatVersion: 99, schemaVersion: 2, exportedAt: 'x', scope: 'full', tables: {} })),
    ).toThrow(/newer version/);
  });

  it('reports invalid and orphaned rows as failed without importing them', async () => {
    const backup = parseBackup(
      JSON.stringify({
        format: 'pawpass-backup',
        formatVersion: 1,
        schemaVersion: 2,
        exportedAt: '2025-01-01T00:00:00.000Z',
        scope: 'full',
        tables: {
          cats: [{ id: 'c1', createdAt: '2025-01-01', updatedAt: '2025-01-01', name: 'Valid', sex: 'male', neuterStatus: 'unknown' }, { id: 'c2' }],
          medicalRecords: [
            { id: 'r1', createdAt: '2025-01-01', catId: 'c1', category: 'other', title: 'ok', date: '2025-01-01', source: 'owner', documentIds: [] },
            { id: 'r2', createdAt: '2025-01-01', catId: 'missing-cat', category: 'other', title: 'orphan', date: '2025-01-01', source: 'owner', documentIds: [] },
            { id: 'r3', createdAt: '2025-01-01', catId: 'c1', category: 'other', date: '2025-01-01' },
          ],
        },
      }),
    );
    const preview = await previewBackup(backup);
    expect(preview.totals).toMatchObject({ new: 2, invalid: 3 });
    const report = await importBackup(backup);
    expect(report).toMatchObject({ imported: 2, failed: 3 });
    expect(await db.medicalRecords.count()).toBe(1);
  });
});
