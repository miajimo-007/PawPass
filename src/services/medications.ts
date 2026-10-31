import { db } from '@/db/database';
import type { DoseStatus, Medication, MedicationLog, MedicationSchedule } from '@/db/types';
import { toISODate } from '@/lib/dates';
import { nowIso } from '@/lib/utils';
import { audit, clean, stamp } from './base';
import { NotFoundError, safeWrite } from './errors';

export type MedicationInput = Omit<Medication, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>;
export interface ScheduleInput {
  times: string[];
  remindersEnabled: boolean;
}

export async function createMedication(input: MedicationInput, schedule: ScheduleInput, opts: { isDemo?: boolean } = {}): Promise<Medication> {
  return safeWrite(() =>
    db.transaction('rw', [db.medications, db.medicationSchedules, db.auditEvents], async () => {
      const med = stamp(clean({ ...input, documentIds: input.documentIds ?? [] }), opts) as Medication;
      await db.medications.add(med);
      await db.medicationSchedules.add(
        stamp({ medicationId: med.id, catId: med.catId, times: [...schedule.times].sort(), remindersEnabled: schedule.remindersEnabled }, opts),
      );
      await audit('create', 'medication', `Added medication: ${med.name}`, med.id, med.catId);
      return med;
    }),
  );
}

export async function updateMedication(id: string, input: MedicationInput, schedule: ScheduleInput) {
  await safeWrite(() =>
    db.transaction('rw', [db.medications, db.medicationSchedules, db.auditEvents], async () => {
      const existing = await db.medications.get(id);
      if (!existing) throw new NotFoundError('This medication');
      const next = clean({ ...input, id, createdAt: existing.createdAt, updatedAt: nowIso(), isDemo: existing.isDemo }) as Medication;
      next.documentIds = input.documentIds ?? [];
      await db.medications.put(next);
      const sched = await db.medicationSchedules.where('medicationId').equals(id).first();
      const times = [...schedule.times].sort();
      if (sched) {
        await db.medicationSchedules.update(sched.id, { times, remindersEnabled: schedule.remindersEnabled, catId: next.catId, updatedAt: nowIso() });
      } else {
        await db.medicationSchedules.add(stamp({ medicationId: id, catId: next.catId, times, remindersEnabled: schedule.remindersEnabled }));
      }
      await audit('update', 'medication', `Updated medication: ${next.name}`, id, next.catId);
    }),
  );
}

export async function setMedicationStatus(id: string, status: Medication['status']) {
  await safeWrite(async () => {
    const med = await db.medications.get(id);
    if (!med) throw new NotFoundError('This medication');
    const patch: Partial<Medication> = { status, updatedAt: nowIso() };
    if (status !== 'active' && !med.endDate) patch.endDate = toISODate(new Date());
    await db.medications.update(id, patch);
    await audit('update', 'medication', `Marked ${med.name} as ${status}`, id, med.catId);
  });
}

export async function deleteMedication(id: string) {
  await db.transaction('rw', [db.medications, db.medicationSchedules, db.medicationLogs, db.auditEvents], async () => {
    const med = await db.medications.get(id);
    if (!med) return;
    await db.medicationLogs.where('medicationId').equals(id).delete();
    await db.medicationSchedules.where('medicationId').equals(id).delete();
    await db.medications.delete(id);
    await audit('delete', 'medication', `Deleted medication and its dose log: ${med.name}`, id, med.catId);
  });
}

/** Records a dose as given or skipped. Re-recording the same slot replaces the previous entry. */
export async function recordDose(med: Pick<Medication, 'id' | 'catId' | 'name'>, scheduledFor: string, status: DoseStatus, note?: string) {
  return safeWrite(() =>
    db.transaction('rw', [db.medicationLogs, db.auditEvents], async () => {
      const existing = await db.medicationLogs.where('[medicationId+scheduledFor]').equals([med.id, scheduledFor]).first();
      if (existing) {
        await db.medicationLogs.update(existing.id, { status, note, recordedAt: nowIso(), updatedAt: nowIso() });
      } else {
        await db.medicationLogs.add(stamp(clean({ medicationId: med.id, catId: med.catId, scheduledFor, status, recordedAt: nowIso(), note })) as MedicationLog);
      }
      await audit('update', 'medicationLog', `${med.name}: dose marked ${status}`, med.id, med.catId);
    }),
  );
}

/** Removes a dose entry, returning the slot to "not recorded". */
export async function clearDose(medicationId: string, scheduledFor: string) {
  await db.medicationLogs.where('[medicationId+scheduledFor]').equals([medicationId, scheduledFor]).delete();
}

export interface DoseSlot {
  medication: Medication;
  scheduledFor: string; // ISO
  time: string; // HH:mm
  status: DoseStatus | 'not_recorded';
  log?: MedicationLog;
}

export function isMedicationActiveOn(med: Medication, dateISO: string): boolean {
  if (med.status !== 'active') return false;
  if (med.startDate > dateISO) return false;
  if (med.endDate && med.endDate < dateISO) return false;
  return true;
}

export function slotIso(dateISO: string, time: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y!, m! - 1, d!, hh, mm).toISOString();
}

/** Builds the dose slots for a given local date from schedules and logs. Pure — easy to test. */
export function buildDoseSlots(
  dateISO: string,
  meds: Medication[],
  schedules: MedicationSchedule[],
  logs: MedicationLog[],
): DoseSlot[] {
  const slots: DoseSlot[] = [];
  for (const med of meds) {
    if (!isMedicationActiveOn(med, dateISO)) continue;
    const sched = schedules.find((s) => s.medicationId === med.id);
    for (const time of sched?.times ?? []) {
      const scheduledFor = slotIso(dateISO, time);
      const log = logs.find((l) => l.medicationId === med.id && l.scheduledFor === scheduledFor);
      slots.push({ medication: med, scheduledFor, time, status: log?.status ?? 'not_recorded', log });
    }
  }
  return slots.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}
