import { db } from '@/db/database';
import type { AppNotification, Appointment, Cat, Medication, MedicationLog, MedicationSchedule, Vaccination } from '@/db/types';
import { addDays, toISODate } from '@/lib/dates';
import { nowIso, uuid } from '@/lib/utils';
import { buildDoseSlots } from './medications';
import { dueVaccinations } from './vaccinations';

export interface DueReminder {
  key: string;
  kind: AppNotification['kind'];
  catId: string;
  refId: string;
  title: string;
  body: string;
  dueAt: string;
}

/** How long after a scheduled dose time a reminder is still shown. */
export const DOSE_REMINDER_WINDOW_MIN = 120;

/**
 * Computes the reminders that should be visible right now. Reminders are
 * prompts only — a dose counts as given only when the owner records it.
 */
export function computeDueReminders(
  data: {
    cats: Cat[];
    medications: Medication[];
    schedules: MedicationSchedule[];
    logs: MedicationLog[];
    appointments: Appointment[];
    vaccinations: Vaccination[];
  },
  now = new Date(),
): DueReminder[] {
  const name = (catId: string) => data.cats.find((c) => c.id === catId)?.name ?? 'Your cat';
  const out: DueReminder[] = [];

  const enabledMeds = data.medications.filter((m) => data.schedules.find((s) => s.medicationId === m.id)?.remindersEnabled);
  for (const day of [toISODate(addDays(now, -1)), toISODate(now)]) {
    for (const slot of buildDoseSlots(day, enabledMeds, data.schedules, data.logs)) {
      if (slot.status !== 'not_recorded') continue;
      const due = new Date(slot.scheduledFor).getTime();
      const diffMin = (now.getTime() - due) / 60_000;
      if (diffMin >= 0 && diffMin <= DOSE_REMINDER_WINDOW_MIN) {
        out.push({
          key: `medication:${slot.medication.id}:${slot.scheduledFor}`,
          kind: 'medication',
          catId: slot.medication.catId,
          refId: slot.medication.id,
          title: `${name(slot.medication.catId)}: ${slot.medication.name} reminder`,
          body: `Scheduled for ${slot.time} · ${slot.medication.dosage}. Not yet recorded as given.`,
          dueAt: slot.scheduledFor,
        });
      }
    }
  }

  for (const a of data.appointments) {
    if (a.status !== 'scheduled' || a.reminderMinutes == null) continue;
    const at = new Date(a.dateTime).getTime();
    const remindAt = at - a.reminderMinutes * 60_000;
    if (now.getTime() >= remindAt && now.getTime() < at) {
      out.push({
        key: `appointment:${a.id}:${a.reminderMinutes}`,
        kind: 'appointment',
        catId: a.catId,
        refId: a.id,
        title: `${name(a.catId)}: upcoming appointment`,
        body: `${a.title}${a.clinic ? ` at ${a.clinic}` : ''}`,
        dueAt: new Date(remindAt).toISOString(),
      });
    }
  }

  for (const { v, status } of dueVaccinations(data.vaccinations, now)) {
    if (status !== 'overdue' && status !== 'due-soon') continue;
    out.push({
      key: `vaccination:${v.id}:${v.nextDueDate}:${status}`,
      kind: 'vaccination',
      catId: v.catId,
      refId: v.id,
      title: `${name(v.catId)}: ${v.vaccine} ${status === 'overdue' ? 'overdue' : 'due soon'}`,
      body: `Next dose date confirmed by your vet: ${v.nextDueDate}`,
      dueAt: v.nextDueDate! + 'T09:00:00',
    });
  }
  return out;
}

/** Returns the reminders that have not been shown yet and records them as shown. */
export async function claimNewReminders(due: DueReminder[]): Promise<DueReminder[]> {
  if (!due.length) return [];
  return db.transaction('rw', db.notifications, async () => {
    const fresh: DueReminder[] = [];
    for (const r of due) {
      const seen = await db.notifications.where('key').equals(r.key).first();
      if (seen) continue;
      await db.notifications.add({
        id: uuid(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        kind: r.kind,
        key: r.key,
        catId: r.catId,
        refId: r.refId,
        title: r.title,
        body: r.body,
        dueAt: r.dueAt,
        dismissed: false,
      });
      fresh.push(r);
    }
    return fresh;
  });
}

export async function loadReminderData() {
  const [cats, medications, schedules, logs, appointments, vaccinations] = await Promise.all([
    db.cats.toArray(),
    db.medications.where('status').equals('active').toArray(),
    db.medicationSchedules.toArray(),
    db.medicationLogs.where('scheduledFor').above(addDays(new Date(), -2).toISOString()).toArray(),
    db.appointments.where('status').equals('scheduled').toArray(),
    db.vaccinations.toArray(),
  ]);
  return { cats, medications, schedules, logs, appointments, vaccinations };
}
