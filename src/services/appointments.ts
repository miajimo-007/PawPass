import { db } from '@/db/database';
import type { Appointment, MedicalRecord } from '@/db/types';
import { toISODate } from '@/lib/dates';
import { nowIso } from '@/lib/utils';
import { audit, clean, stamp } from './base';
import { rememberClinic } from './clinics';
import { NotFoundError, safeWrite } from './errors';

export type AppointmentInput = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'isDemo' | 'linkedRecordId'>;

export async function createAppointment(input: AppointmentInput, opts: { isDemo?: boolean } = {}): Promise<Appointment> {
  return safeWrite(() =>
    db.transaction('rw', [db.appointments, db.clinics, db.auditEvents], async () => {
      const row = stamp(clean(input), opts) as Appointment;
      await db.appointments.add(row);
      await rememberClinic(input.clinic, { address: input.clinicAddress, phone: input.clinicPhone }, opts.isDemo);
      await audit('create', 'appointment', `Scheduled appointment: ${row.title}`, row.id, row.catId);
      return row;
    }),
  );
}

export async function updateAppointment(id: string, input: AppointmentInput) {
  await safeWrite(() =>
    db.transaction('rw', [db.appointments, db.clinics, db.auditEvents], async () => {
      const existing = await db.appointments.get(id);
      if (!existing) throw new NotFoundError('This appointment');
      const next = clean({
        ...input,
        id,
        createdAt: existing.createdAt,
        updatedAt: nowIso(),
        isDemo: existing.isDemo,
        linkedRecordId: existing.linkedRecordId,
      }) as Appointment;
      await db.appointments.put(next);
      await rememberClinic(input.clinic, { address: input.clinicAddress, phone: input.clinicPhone });
      await audit('update', 'appointment', `Updated appointment: ${next.title}`, id, next.catId);
    }),
  );
}

export async function cancelAppointment(id: string) {
  await safeWrite(async () => {
    const a = await db.appointments.get(id);
    if (!a) throw new NotFoundError('This appointment');
    await db.appointments.update(id, { status: 'cancelled', updatedAt: nowIso() });
    await audit('update', 'appointment', `Cancelled appointment: ${a.title}`, id, a.catId);
  });
}

/**
 * Marks an appointment completed. Optionally creates a linked consultation
 * record in the same transaction so the visit appears on the medical timeline.
 */
export async function completeAppointment(
  id: string,
  visit?: { findings?: string; treatment?: string; notes?: string },
): Promise<MedicalRecord | undefined> {
  return safeWrite(() =>
    db.transaction('rw', [db.appointments, db.medicalRecords, db.auditEvents], async () => {
      const a = await db.appointments.get(id);
      if (!a) throw new NotFoundError('This appointment');
      let record: MedicalRecord | undefined;
      if (visit) {
        record = stamp(
          clean({
            catId: a.catId,
            category: 'consultation' as const,
            title: a.title,
            date: toISODate(new Date(a.dateTime)),
            source: 'owner' as const,
            clinic: a.clinic,
            veterinarian: a.veterinarian,
            findings: visit.findings,
            treatment: visit.treatment,
            notes: visit.notes,
            documentIds: [],
            appointmentId: a.id,
          }),
          { isDemo: a.isDemo },
        ) as MedicalRecord;
        await db.medicalRecords.add(record);
      }
      await db.appointments.update(id, { status: 'completed', updatedAt: nowIso(), ...(record ? { linkedRecordId: record.id } : {}) });
      await audit('update', 'appointment', `Completed appointment: ${a.title}${record ? ' (visit record created)' : ''}`, id, a.catId);
      return record;
    }),
  );
}

export async function linkAppointmentToRecord(appointmentId: string, recordId: string) {
  await db.transaction('rw', [db.appointments, db.medicalRecords], async () => {
    await db.appointments.update(appointmentId, { linkedRecordId: recordId, updatedAt: nowIso() });
    await db.medicalRecords.update(recordId, { appointmentId, updatedAt: nowIso() });
  });
}

export async function deleteAppointment(id: string) {
  await db.transaction('rw', [db.appointments, db.medicalRecords, db.notifications, db.auditEvents], async () => {
    const a = await db.appointments.get(id);
    if (!a) return;
    if (a.linkedRecordId) {
      await db.medicalRecords.where('id').equals(a.linkedRecordId).modify((r) => {
        delete r.appointmentId;
      });
    }
    await db.notifications.filter((n) => n.refId === id).delete();
    await db.appointments.delete(id);
    await audit('delete', 'appointment', `Deleted appointment: ${a.title}`, id, a.catId);
  });
}

export function upcomingAppointments(all: Appointment[], now = new Date()) {
  const nowIsoStr = now.toISOString();
  return all.filter((a) => a.status === 'scheduled' && a.dateTime >= nowIsoStr).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
}

/** Scheduled appointments whose time has passed but that were never marked completed/cancelled. */
export function pastDueAppointments(all: Appointment[], now = new Date()) {
  const nowIsoStr = now.toISOString();
  return all.filter((a) => a.status === 'scheduled' && a.dateTime < nowIsoStr);
}
