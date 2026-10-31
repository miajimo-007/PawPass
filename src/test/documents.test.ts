import { describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { addDocument, deleteDocument } from '@/services/documents';
import { createRecord } from '@/services/records';
import { makeCat } from './helpers';

const pdfBytes = new TextEncoder().encode('%PDF-1.4\n% fake test pdf\n');

describe('document storage', () => {
  it('stores uploaded files as Blobs that survive closing and reopening the database', async () => {
    const cat = await makeCat();
    const file = Object.assign(new Blob([pdfBytes], { type: 'application/pdf' }), { name: 'lab-results.pdf' });
    const doc = await addDocument(file, { catId: cat.id, title: 'Lab results', category: 'lab', date: '2025-01-10' });
    expect(doc.size).toBe(pdfBytes.length);

    // Simulate a page refresh / browser restart: close and reopen the IndexedDB connection.
    db.close();
    await db.open();
    const stored = await db.documents.get(doc.id);
    expect(stored?.fileName).toBe('lab-results.pdf');
    expect(stored?.mimeType).toBe('application/pdf');
    expect(new Uint8Array(await stored!.blob.arrayBuffer())).toEqual(pdfBytes);
  });

  it('rejects unsupported or oversized files', async () => {
    const cat = await makeCat();
    const exe = Object.assign(new Blob(['MZ'], { type: 'application/x-msdownload' }), { name: 'virus.exe' });
    await expect(addDocument(exe, { catId: cat.id, title: 'x', category: 'other', date: '2025-01-01' })).rejects.toThrow(/PDF, image/);
    expect(await db.documents.count()).toBe(0);
  });

  it('unlinks a deleted document from records without deleting the records', async () => {
    const cat = await makeCat();
    const file = Object.assign(new Blob([pdfBytes], { type: 'application/pdf' }), { name: 'a.pdf' });
    const doc = await addDocument(file, { catId: cat.id, title: 'A', category: 'report', date: '2025-01-10' });
    const rec = await createRecord({ catId: cat.id, category: 'lab', title: 'Panel', date: '2025-01-10', source: 'veterinarian', documentIds: [doc.id] });
    await deleteDocument(doc.id);
    expect(await db.documents.count()).toBe(0);
    expect((await db.medicalRecords.get(rec.id))?.documentIds).toEqual([]);
  });
});
