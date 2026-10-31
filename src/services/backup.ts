import { z } from 'zod';
import { CAT_SCOPED_TABLES, DATA_TABLES, db, type DataTableName } from '@/db/database';
import { LATEST_DB_VERSION } from '@/db/migrations';
import { nowIso } from '@/lib/utils';
import { audit } from './base';
import { safeWrite } from './errors';
import { updatePrefs } from './prefs';

export const BACKUP_FORMAT = 'pawpass-backup';
export const BACKUP_FORMAT_VERSION = 1;

export type ExportScope = 'full' | 'cats' | 'records' | 'medications' | 'vaccinations' | 'appointments' | 'measurements' | 'documents';

export const EXPORT_SCOPES: Record<ExportScope, { label: string; tables: DataTableName[] }> = {
  full: { label: 'Complete backup', tables: [...DATA_TABLES] },
  cats: { label: 'Cat profiles', tables: ['cats', 'allergies', 'diagnoses', 'clinics'] },
  records: { label: 'Medical records', tables: ['medicalRecords'] },
  medications: { label: 'Medications', tables: ['medications', 'medicationSchedules', 'medicationLogs'] },
  vaccinations: { label: 'Vaccinations', tables: ['vaccinations'] },
  appointments: { label: 'Appointments', tables: ['appointments'] },
  measurements: { label: 'Health measurements', tables: ['measurements', 'symptomLogs'] },
  documents: { label: 'Documents', tables: ['documents'] },
};

interface EncodedBlob {
  __blob: true;
  type: string;
  data: string; // base64
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  schemaVersion: number;
  exportedAt: string;
  scope: ExportScope;
  app: { name: 'PAWPASS'; version: string };
  tables: Partial<Record<DataTableName, Record<string, unknown>[]>>;
}

// ---- Blob <-> base64 -----------------------------------------------------------

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

function isBlobLike(v: unknown): v is Blob {
  return typeof Blob !== 'undefined' && v instanceof Blob;
}

function isEncodedBlob(v: unknown): v is EncodedBlob {
  return !!v && typeof v === 'object' && (v as EncodedBlob).__blob === true && typeof (v as EncodedBlob).data === 'string';
}

async function encodeRow(row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = isBlobLike(v) ? ({ __blob: true, type: v.type, data: await blobToBase64(v) } satisfies EncodedBlob) : v;
  }
  return out;
}

function decodeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k] = isEncodedBlob(v) ? base64ToBlob(v.data, v.type) : v;
  return out;
}

// ---- Export --------------------------------------------------------------------

export async function createBackup(scope: ExportScope = 'full', opts: { catId?: string } = {}): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {};
  for (const name of EXPORT_SCOPES[scope].tables) {
    let rows = (await db.table(name).toArray()) as Record<string, unknown>[];
    if (opts.catId) {
      rows = rows.filter((r) => (name === 'cats' ? r.id === opts.catId : name === 'clinics' ? true : r.catId === opts.catId));
    }
    tables[name] = await Promise.all(rows.map(encodeRow));
  }
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: LATEST_DB_VERSION,
    exportedAt: nowIso(),
    scope,
    app: { name: 'PAWPASS', version: __APP_VERSION__ },
    tables,
  };
}

export function backupFileName(scope: ExportScope, date = new Date()): string {
  const d = date.toISOString().slice(0, 10);
  return scope === 'full' ? `pawpass-backup-${d}.json` : `pawpass-${scope}-${d}.json`;
}

export async function exportBackupBlob(scope: ExportScope = 'full', opts: { catId?: string } = {}): Promise<{ blob: Blob; fileName: string; counts: Record<string, number> }> {
  const backup = await createBackup(scope, opts);
  const counts = Object.fromEntries(Object.entries(backup.tables).map(([k, v]) => [k, v?.length ?? 0]));
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  if (scope === 'full' && !opts.catId) await updatePrefs({ lastBackupAt: backup.exportedAt });
  await audit('export', 'backup', `Exported ${EXPORT_SCOPES[scope].label.toLowerCase()}`);
  return { blob, fileName: backupFileName(scope), counts };
}

// ---- Validation ------------------------------------------------------------------

const rowSchema = z.object({ id: z.string().min(1), createdAt: z.string().min(1) }).passthrough();
const catScopedRowSchema = rowSchema.extend({ catId: z.string().min(1) });

const requiredFields: Partial<Record<DataTableName, string[]>> = {
  cats: ['name'],
  medicalRecords: ['category', 'title', 'date'],
  diagnoses: ['name'],
  allergies: ['allergen'],
  medications: ['name', 'dosage', 'startDate'],
  medicationSchedules: ['medicationId'],
  medicationLogs: ['medicationId', 'scheduledFor', 'status'],
  vaccinations: ['vaccine', 'dateGiven'],
  appointments: ['title', 'dateTime'],
  clinics: ['name'],
  measurements: ['type', 'value', 'measuredAt'],
  symptomLogs: ['category', 'observedAt'],
  documents: ['title', 'blob', 'mimeType'],
};

const envelopeSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.number().int().positive(),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  scope: z.string(),
  tables: z.record(z.array(z.unknown())),
});

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

export function parseBackup(text: string): BackupFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BackupValidationError('This file is not valid JSON. Choose a backup exported from PAWPASS.');
  }
  const parsed = envelopeSchema.safeParse(json);
  if (!parsed.success) throw new BackupValidationError('This file is not a PAWPASS backup.');
  if (parsed.data.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupValidationError('This backup was created by a newer version of PAWPASS. Update the app and try again.');
  }
  const unknownTables = Object.keys(parsed.data.tables).filter((t) => !(DATA_TABLES as readonly string[]).includes(t));
  if (unknownTables.length === Object.keys(parsed.data.tables).length && unknownTables.length > 0) {
    throw new BackupValidationError('This backup does not contain any PAWPASS data.');
  }
  return json as BackupFile;
}

function validateRow(table: DataTableName, row: unknown): string | null {
  const schema = (CAT_SCOPED_TABLES as string[]).includes(table) ? catScopedRowSchema : rowSchema;
  const res = schema.safeParse(row);
  if (!res.success) return 'missing id, creation date or cat reference';
  const r = row as Record<string, unknown>;
  for (const f of requiredFields[table] ?? []) {
    if (r[f] === undefined || r[f] === null || r[f] === '') return `missing ${f}`;
  }
  if (table === 'documents' && !isEncodedBlob(r.blob)) return 'missing file contents';
  return null;
}

// ---- Preview & import -----------------------------------------------------------------

export interface TablePreview {
  table: DataTableName;
  total: number;
  new: number;
  duplicates: number;
  invalid: number;
  issues: string[];
}

export interface BackupPreview {
  exportedAt: string;
  scope: string;
  schemaVersion: number;
  tables: TablePreview[];
  catNames: string[];
  possibleDuplicateCats: string[];
  totals: { total: number; new: number; duplicates: number; invalid: number };
}

async function catIdsAvailable(backup: BackupFile): Promise<Set<string>> {
  const ids = new Set<string>((await db.cats.toCollection().primaryKeys()) as string[]);
  for (const c of backup.tables.cats ?? []) if (typeof c.id === 'string') ids.add(c.id);
  return ids;
}

export async function previewBackup(backup: BackupFile): Promise<BackupPreview> {
  const tables: TablePreview[] = [];
  const catIds = await catIdsAvailable(backup);
  for (const name of DATA_TABLES) {
    const rows = backup.tables[name];
    if (!rows) continue;
    const existing = new Set((await db.table(name).toCollection().primaryKeys()) as string[]);
    const p: TablePreview = { table: name, total: rows.length, new: 0, duplicates: 0, invalid: 0, issues: [] };
    for (const row of rows) {
      const problem = validateRow(name, row) ?? (row.catId && !catIds.has(row.catId as string) ? 'belongs to a cat not in this backup or on this device' : null);
      if (problem) {
        p.invalid++;
        if (p.issues.length < 3) p.issues.push(problem);
      } else if (existing.has(row.id as string)) p.duplicates++;
      else p.new++;
    }
    tables.push(p);
  }
  const existingCats = await db.cats.toArray();
  const backupCats = (backup.tables.cats ?? []) as { id: string; name: string; birthDate?: string }[];
  const possibleDuplicateCats = backupCats
    .filter((c) => !existingCats.some((e) => e.id === c.id) && existingCats.some((e) => e.name.trim().toLowerCase() === String(c.name).trim().toLowerCase()))
    .map((c) => c.name);
  const totals = tables.reduce(
    (acc, t) => ({ total: acc.total + t.total, new: acc.new + t.new, duplicates: acc.duplicates + t.duplicates, invalid: acc.invalid + t.invalid }),
    { total: 0, new: 0, duplicates: 0, invalid: 0 },
  );
  return {
    exportedAt: backup.exportedAt,
    scope: backup.scope,
    schemaVersion: backup.schemaVersion,
    tables,
    catNames: backupCats.map((c) => c.name),
    possibleDuplicateCats,
    totals,
  };
}

export type DuplicateStrategy = 'skip' | 'replace';

export interface ImportReport {
  tables: { table: DataTableName; imported: number; replaced: number; skipped: number; failed: number }[];
  imported: number;
  replaced: number;
  skipped: number;
  failed: number;
}

/**
 * Imports a validated backup in a single transaction: either everything valid
 * is imported or nothing is (e.g. if storage runs out). Original identifiers and
 * timestamps are preserved. Existing records are never deleted.
 */
export async function importBackup(backup: BackupFile, strategy: DuplicateStrategy = 'skip'): Promise<ImportReport> {
  const catIds = await catIdsAvailable(backup);
  const report: ImportReport = { tables: [], imported: 0, replaced: 0, skipped: 0, failed: 0 };
  const tableObjs = [...DATA_TABLES.map((t) => db.table(t)), db.auditEvents];
  await safeWrite(() =>
    db.transaction('rw', tableObjs, async () => {
      for (const name of DATA_TABLES) {
        const rows = backup.tables[name];
        if (!rows) continue;
        const t = { table: name, imported: 0, replaced: 0, skipped: 0, failed: 0 };
        const existing = new Set((await db.table(name).toCollection().primaryKeys()) as string[]);
        const toWrite: Record<string, unknown>[] = [];
        for (const row of rows) {
          const invalid = validateRow(name, row) ?? (row.catId && !catIds.has(row.catId as string) ? 'orphan' : null);
          if (invalid) {
            t.failed++;
            continue;
          }
          const isDup = existing.has(row.id as string);
          if (isDup && strategy === 'skip') {
            t.skipped++;
            continue;
          }
          toWrite.push(decodeRow(row));
          if (isDup) t.replaced++;
          else t.imported++;
        }
        if (toWrite.length) await db.table(name).bulkPut(toWrite);
        report.tables.push(t);
        report.imported += t.imported;
        report.replaced += t.replaced;
        report.skipped += t.skipped;
        report.failed += t.failed;
      }
      await audit(
        'import',
        'backup',
        `Imported backup from ${backup.exportedAt.slice(0, 10)}: ${report.imported} new, ${report.replaced} replaced, ${report.skipped} skipped, ${report.failed} failed`,
      );
    }),
  );
  return report;
}
