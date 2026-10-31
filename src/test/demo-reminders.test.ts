import { describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { hasDemoData, removeDemoData, resetDemoData, seedDemoData } from '@/services/demo';
import { createRecord } from '@/services/records';
import { createMedication, recordDose, slotIso } from '@/services/medications';
import { createAppointment } from '@/services/appointments';
import { claimNewReminders, computeDueReminders, loadReminderData } from '@/services/reminders';
import { toISODate } from '@/lib/dates';
import { makeCat } from './helpers';

describe('demo mode', () => {
  it('seeds Luna, Milo and Oliver as labelled fictional data through the real database', async () => {
    await seedDemoData();
    const cats = await db.cats.toArray();
    expect(cats.map((c) => c.name).sort()).toEqual(['Luna', 'Milo', 'Oliver']);
    expect(cats.every((c) => c.isDemo)).toBe(true);
    expect(await db.medicalRecords.count()).toBeGreaterThan(3);
    expect(await db.medications.count()).toBeGreaterThan(0);
    expect(await db.vaccinations.count()).toBeGreaterThan(0);
    expect(await db.appointments.count()).toBeGreaterThan(0);
    expect(await db.measurements.count()).toBeGreaterThan(10);
    expect((await db.medicationLogs.toArray()).every((l) => l.isDemo)).toBe(true);
    expect(await hasDemoData()).toBe(true);
  });

  it('resets and removes demo data without touching user records', async () => {
    const mine = await makeCat('My real cat');
    await createRecord({ catId: mine.id, category: 'other', title: 'Mine', date: '2025-01-01', source: 'owner', documentIds: [] });
    await seedDemoData();
    const demoCount = await db.cats.count();
    expect(demoCount).toBe(4);
    await resetDemoData();
    expect(await db.cats.count()).toBe(4);
    await removeDemoData();
    expect((await db.cats.toArray()).map((c) => c.name)).toEqual(['My real cat']);
    expect(await db.medicalRecords.count()).toBe(1);
    expect(await db.clinics.filter((c) => !!c.isDemo).count()).toBe(0);
  });
});

describe('reminders', () => {
  it('reminds about unrecorded doses only within the window, and never twice', async () => {
    const cat = await makeCat();
    const med = await createMedication(
      { catId: cat.id, name: 'Pill', dosage: '1', route: 'oral', frequency: 'Daily', startDate: '2020-01-01', status: 'active', documentIds: [] },
      { times: ['08:00', '20:00'], remindersEnabled: true },
    );
    const today = toISODate(new Date());
    const at = (h: number, m = 0) => {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };
    let data = await loadReminderData();
    expect(computeDueReminders(data, at(7, 59)).filter((r) => r.kind === 'medication' && r.dueAt.startsWith(new Date(slotIso(today, '08:00')).toISOString()))).toHaveLength(0);
    const due = computeDueReminders(data, at(8, 30)).filter((r) => r.refId === med.id && r.dueAt === slotIso(today, '08:00'));
    expect(due).toHaveLength(1);
    expect(await claimNewReminders(due)).toHaveLength(1);
    expect(await claimNewReminders(due)).toHaveLength(0);

    // Recording the dose clears the reminder.
    await recordDose(med, slotIso(today, '08:00'), 'given');
    data = await loadReminderData();
    expect(computeDueReminders(data, at(8, 30)).filter((r) => r.dueAt === slotIso(today, '08:00'))).toHaveLength(0);
  });

  it('reminds before a scheduled appointment', async () => {
    const cat = await makeCat();
    const when = new Date(Date.now() + 30 * 60_000).toISOString();
    await createAppointment({ catId: cat.id, title: 'Vet', dateTime: when, status: 'scheduled', reminderMinutes: 60 });
    const due = computeDueReminders(await loadReminderData());
    expect(due.some((r) => r.kind === 'appointment')).toBe(true);
  });
});
