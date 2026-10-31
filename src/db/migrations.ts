import type { Transaction } from 'dexie';

/**
 * Versioned schema migrations.
 *
 * Rules (enforced by review and by src/test/migrations.test.ts):
 *  1. Never edit a migration that has shipped. Add a new version instead.
 *  2. Migrations are additive: new tables, new indexes, back-filled defaults.
 *  3. An upgrade function must never delete or overwrite user-entered values.
 *
 * Dexie keeps every declared version, so a device on any older version is
 * upgraded step by step to the latest one.
 */
export interface Migration {
  version: number;
  description: string;
  stores: Record<string, string | null>;
  upgrade?: (tx: Transaction) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial PAWPASS schema',
    stores: {
      cats: 'id, name, createdAt',
      medicalRecords: 'id, catId, category, date, source',
      diagnoses: 'id, catId, status',
      allergies: 'id, catId',
      medications: 'id, catId, status, startDate',
      medicationSchedules: 'id, medicationId, catId',
      medicationLogs: 'id, medicationId, catId, scheduledFor',
      vaccinations: 'id, catId, dateGiven, nextDueDate',
      appointments: 'id, catId, dateTime, status',
      clinics: 'id, name',
      measurements: 'id, catId, type, measuredAt',
      symptomLogs: 'id, catId, category, observedAt',
      documents: 'id, catId, category, date',
      notifications: 'id, &key, kind, dueAt',
      preferences: 'id',
      auditEvents: 'id, at, entity',
    },
  },
  {
    version: 2,
    description: 'Compound indexes for per-cat timelines; back-fill documentIds arrays',
    stores: {
      medicalRecords: 'id, catId, category, date, source, [catId+date]',
      medicationLogs: 'id, medicationId, catId, scheduledFor, [medicationId+scheduledFor]',
      measurements: 'id, catId, type, measuredAt, [catId+type]',
    },
    upgrade: async (tx) => {
      // Only fills in missing defaults — existing values are left untouched.
      for (const table of ['medicalRecords', 'medications', 'vaccinations']) {
        await tx
          .table(table)
          .toCollection()
          .modify((row: { documentIds?: unknown }) => {
            if (!Array.isArray(row.documentIds)) row.documentIds = [];
          });
      }
    },
  },
  {
    version: 3,
    description: 'Diet history, litter/water quick logs and care routines',
    stores: {
      diets: 'id, catId, startDate',
      quickLogs: 'id, catId, kind, at, [catId+at]',
      routines: 'id, catId, kind',
    },
  },
];

export const LATEST_DB_VERSION = migrations[migrations.length - 1].version;
