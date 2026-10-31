import { db } from '@/db/database';
import type { Appointment, MedicalRecord, Medication, RecordCategory, Vaccination } from '@/db/types';
import { RECORD_CATEGORIES } from '@/lib/labels';
import { nowIso } from '@/lib/utils';
import { audit, clean, stamp } from './base';
import { rememberClinic } from './clinics';
import { NotFoundError, safeWrite } from './errors';

export type RecordInput = Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>;

export async function createRecord(input: RecordInput, opts: { isDemo?: boolean } = {}): Promise<MedicalRecord> {
  return safeWrite(() =>
    db.transaction('rw', [db.medicalRecords, db.clinics, db.auditEvents], async () => {
      const row = stamp(clean({ ...input, documentIds: input.documentIds ?? [] }), opts) as MedicalRecord;
      await db.medicalRecords.add(row);
      await rememberClinic(input.clinic, {}, opts.isDemo);
      await audit('create', 'medicalRecord', `Added ${RECORD_CATEGORIES[row.category].toLowerCase()}: ${row.title}`, row.id, row.catId);
      return row;
    }),
  );
}

export async function updateRecord(id: string, input: RecordInput): Promise<void> {
  await safeWrite(() =>
    db.transaction('rw', [db.medicalRecords, db.clinics, db.auditEvents], async () => {
      const existing = await db.medicalRecords.get(id);
      if (!existing) throw new NotFoundError('This record');
      const next = clean({ ...input, id, createdAt: existing.createdAt, updatedAt: nowIso(), isDemo: existing.isDemo }) as MedicalRecord;
      next.documentIds = input.documentIds ?? [];
      if (existing.appointmentId && !next.appointmentId) next.appointmentId = existing.appointmentId;
      await db.medicalRecords.put(next);
      await rememberClinic(input.clinic);
      await audit('update', 'medicalRecord', `Updated record: ${next.title}`, id, next.catId);
    }),
  );
}

export async function deleteRecord(id: string): Promise<void> {
  await db.transaction('rw', [db.medicalRecords, db.appointments, db.diagnoses, db.auditEvents], async () => {
    const existing = await db.medicalRecords.get(id);
    if (!existing) return;
    await db.medicalRecords.delete(id);
    // Unlink (never delete) related appointments/conditions.
    await db.appointments.where('catId').equals(existing.catId).modify((a: Appointment) => {
      if (a.linkedRecordId === id) delete a.linkedRecordId;
    });
    await db.diagnoses.where('catId').equals(existing.catId).modify((d) => {
      if (d.recordId === id) delete d.recordId;
    });
    await audit('delete', 'medicalRecord', `Deleted record: ${existing.title}`, id, existing.catId);
  });
}

// ---- Timeline -----------------------------------------------------------------

export type TimelineKind = 'record' | 'vaccination' | 'medication';

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  category: RecordCategory;
  date: string;
  title: string;
  subtitle?: string;
  source: 'owner' | 'veterinarian';
  catId: string;
  ref: MedicalRecord | Vaccination | Medication;
}

/** Builds a combined, reverse-chronological medical timeline for one cat (or all cats). */
export function buildTimeline(
  records: MedicalRecord[],
  vaccinations: Vaccination[],
  medications: Medication[],
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...records.map<TimelineItem>((r) => ({
      id: r.id,
      kind: 'record',
      category: r.category,
      date: r.date,
      title: r.title,
      subtitle: [r.clinic, r.veterinarian].filter(Boolean).join(' · ') || undefined,
      source: r.source,
      catId: r.catId,
      ref: r,
    })),
    ...vaccinations.map<TimelineItem>((v) => ({
      id: v.id,
      kind: 'vaccination',
      category: 'vaccination',
      date: v.dateGiven,
      title: v.vaccine,
      subtitle: [v.clinic, v.veterinarian].filter(Boolean).join(' · ') || undefined,
      source: v.clinic || v.veterinarian ? 'veterinarian' : 'owner',
      catId: v.catId,
      ref: v,
    })),
    ...medications.map<TimelineItem>((m) => ({
      id: m.id,
      kind: 'medication',
      category: 'medication',
      date: m.startDate,
      title: `Started ${m.name}`,
      subtitle: `${m.dosage} · ${m.frequency}`,
      source: m.prescribedBy ? 'veterinarian' : 'owner',
      catId: m.catId,
      ref: m,
    })),
  ];
  return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.ref.createdAt.localeCompare(a.ref.createdAt)));
}

export interface TimelineFilter {
  query?: string;
  categories?: RecordCategory[];
  from?: string;
  to?: string;
  source?: 'owner' | 'veterinarian' | 'all';
}

export function filterTimeline(items: TimelineItem[], f: TimelineFilter): TimelineItem[] {
  const q = f.query?.trim().toLowerCase();
  return items.filter((i) => {
    if (f.categories?.length && !f.categories.includes(i.category)) return false;
    if (f.from && i.date < f.from) return false;
    if (f.to && i.date > f.to) return false;
    if (f.source && f.source !== 'all' && i.source !== f.source) return false;
    if (q) {
      const r = i.ref as unknown as Record<string, unknown>;
      const hay = [i.title, i.subtitle, r.description, r.findings, r.treatment, r.notes, r.instructions, r.condition, r.batchNumber]
        .filter((x) => typeof x === 'string')
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
