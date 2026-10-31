import Dexie, { type Table } from 'dexie';
import { migrations } from './migrations';
import type {
  Allergy,
  AppNotification,
  Appointment,
  AuditEvent,
  Cat,
  Clinic,
  Diet,
  QuickLog,
  Routine,
  Diagnosis,
  DocumentFile,
  Measurement,
  MedicalRecord,
  Medication,
  MedicationLog,
  MedicationSchedule,
  Preferences,
  SymptomLog,
  Vaccination,
} from './types';

export const DB_NAME = 'pawpass';

export class PawpassDB extends Dexie {
  cats!: Table<Cat, string>;
  medicalRecords!: Table<MedicalRecord, string>;
  diagnoses!: Table<Diagnosis, string>;
  allergies!: Table<Allergy, string>;
  medications!: Table<Medication, string>;
  medicationSchedules!: Table<MedicationSchedule, string>;
  medicationLogs!: Table<MedicationLog, string>;
  vaccinations!: Table<Vaccination, string>;
  appointments!: Table<Appointment, string>;
  clinics!: Table<Clinic, string>;
  measurements!: Table<Measurement, string>;
  symptomLogs!: Table<SymptomLog, string>;
  documents!: Table<DocumentFile, string>;
  notifications!: Table<AppNotification, string>;
  preferences!: Table<Preferences, string>;
  auditEvents!: Table<AuditEvent, string>;
  diets!: Table<Diet, string>;
  quickLogs!: Table<QuickLog, string>;
  routines!: Table<Routine, string>;

  constructor(name = DB_NAME, upToVersion?: number) {
    super(name);
    for (const m of migrations) {
      if (upToVersion !== undefined && m.version > upToVersion) break;
      const v = this.version(m.version).stores(m.stores);
      if (m.upgrade) v.upgrade(m.upgrade);
    }
  }
}

/** Tables that hold user data (everything that is backed up / restored). */
export const DATA_TABLES = [
  'cats',
  'medicalRecords',
  'diagnoses',
  'allergies',
  'medications',
  'medicationSchedules',
  'medicationLogs',
  'vaccinations',
  'appointments',
  'clinics',
  'measurements',
  'symptomLogs',
  'documents',
  'diets',
  'quickLogs',
  'routines',
] as const;

export type DataTableName = (typeof DATA_TABLES)[number];

/** Tables whose rows belong to a single cat (have a catId). */
export const CAT_SCOPED_TABLES = DATA_TABLES.filter((t) => t !== 'cats' && t !== 'clinics') as Exclude<
  DataTableName,
  'cats' | 'clinics'
>[];

export let db = new PawpassDB();

/** Test helper: swap in a fresh database instance. */
export function __setDb(next: PawpassDB) {
  db = next;
}
