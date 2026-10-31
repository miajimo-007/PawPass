import { db } from '@/db/database';
import type { DocumentCategory, DocumentFile } from '@/db/types';
import { validateUpload } from '@/validation/schemas';
import { nowIso } from '@/lib/utils';
import { audit, clean, stamp } from './base';
import { NotFoundError, safeWrite } from './errors';

export interface DocumentMeta {
  catId: string;
  title: string;
  category: DocumentCategory;
  date: string;
  notes?: string;
}

/** Stores an uploaded file as a Blob inside IndexedDB. */
export async function addDocument(file: Blob & { name?: string }, meta: DocumentMeta, opts: { isDemo?: boolean } = {}): Promise<DocumentFile> {
  const fileName = file.name ?? meta.title;
  const problem = validateUpload({ type: file.type, size: file.size, name: fileName });
  if (problem) throw new Error(problem);
  return safeWrite(async () => {
    // Copy into a plain Blob so the browser stores the bytes (not a File handle).
    const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'application/octet-stream' });
    const row = stamp(
      clean({ ...meta, fileName, mimeType: blob.type, size: blob.size, blob }),
      opts,
    ) as DocumentFile;
    await db.documents.add(row);
    await audit('create', 'document', `Uploaded document: ${row.title}`, row.id, row.catId);
    return row;
  });
}

export async function updateDocument(id: string, meta: DocumentMeta) {
  await safeWrite(async () => {
    const existing = await db.documents.get(id);
    if (!existing) throw new NotFoundError('This document');
    await db.documents.update(id, { ...meta, notes: meta.notes || undefined, updatedAt: nowIso() });
    await audit('update', 'document', `Updated document: ${meta.title}`, id, meta.catId);
  });
}

/** Deletes a document and removes it from every record that referenced it. */
export async function deleteDocument(id: string) {
  await db.transaction('rw', [db.documents, db.medicalRecords, db.medications, db.vaccinations, db.symptomLogs, db.expenses, db.auditEvents], async () => {
    const doc = await db.documents.get(id);
    if (!doc) return;
    const unlink = (row: { documentIds?: string[] }) => {
      if (row.documentIds?.includes(id)) row.documentIds = row.documentIds.filter((d) => d !== id);
    };
    await db.medicalRecords.where('catId').equals(doc.catId).modify(unlink);
    await db.medications.where('catId').equals(doc.catId).modify(unlink);
    await db.vaccinations.where('catId').equals(doc.catId).modify(unlink);
    await db.expenses.where('catId').equals(doc.catId).modify(unlink);
    await db.symptomLogs.where('catId').equals(doc.catId).modify((row: { mediaIds?: string[] }) => {
      if (row.mediaIds?.includes(id)) row.mediaIds = row.mediaIds.filter((d) => d !== id);
    });
    await db.documents.delete(id);
    await audit('delete', 'document', `Deleted document: ${doc.title}`, id, doc.catId);
  });
}

export function isImage(mime: string) {
  return mime.startsWith('image/') && !/heic|heif/.test(mime);
}

export function isVideo(mime: string) {
  return mime.startsWith('video/');
}

export function isPdf(mime: string) {
  return mime === 'application/pdf';
}

/** Triggers a browser download of a stored document. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
