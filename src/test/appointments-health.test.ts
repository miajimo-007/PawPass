import { describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { cancelAppointment, completeAppointment, createAppointment, deleteAppointment, pastDueAppointments, upcomingAppointments } from '@/services/appointments';
import { addMeasurement, addSymptom, deleteMeasurement, latestOf, trendOf } from '@/services/health';
import { formatMeasurement, fromDisplay, toDisplay } from '@/lib/units';
import { formatAge, birthDateFromAge } from '@/lib/dates';
import { makeCat } from './helpers';

describe('appointments', () => {
  it('lists upcoming and past-due appointments and supports cancel/complete/delete', async () => {
    const cat = await makeCat();
    const now = new Date('2025-03-10T12:00:00Z');
    const future = await createAppointment({ catId: cat.id, title: 'Dental', dateTime: '2025-03-20T09:00:00.000Z', status: 'scheduled', reminderMinutes: 60, clinic: 'Harbour Vet', clinicPhone: '123' });
    const past = await createAppointment({ catId: cat.id, title: 'Recheck', dateTime: '2025-03-01T09:00:00.000Z', status: 'scheduled', reminderMinutes: null });
    let all = await db.appointments.toArray();
    expect(upcomingAppointments(all, now).map((a) => a.id)).toEqual([future.id]);
    expect(pastDueAppointments(all, now).map((a) => a.id)).toEqual([past.id]);
    expect((await db.clinics.toArray())[0]?.phone).toBe('123');

    await completeAppointment(past.id); // without visit record
    await cancelAppointment(future.id);
    all = await db.appointments.toArray();
    expect(all.find((a) => a.id === past.id)?.status).toBe('completed');
    expect(all.find((a) => a.id === past.id)?.linkedRecordId).toBeUndefined();
    expect(all.find((a) => a.id === future.id)?.status).toBe('cancelled');
    expect(await db.medicalRecords.count()).toBe(0);

    await deleteAppointment(future.id);
    expect(await db.appointments.count()).toBe(1);
  });
});

describe('health tracking', () => {
  it('stores canonical units, finds the latest value and the trend', async () => {
    const cat = await makeCat();
    await addMeasurement({ catId: cat.id, type: 'weight', value: 4.2, measuredAt: '2025-01-01T08:00:00.000Z' });
    await addMeasurement({ catId: cat.id, type: 'weight', value: 4.5, measuredAt: '2025-02-01T08:00:00.000Z' });
    const m = await addMeasurement({ catId: cat.id, type: 'water', value: 180, measuredAt: '2025-02-01T08:00:00.000Z' });
    await addSymptom({ catId: cat.id, category: 'vomiting', description: 'Hairball', severity: 'mild', observedAt: '2025-02-02T08:00:00.000Z' });
    const all = await db.measurements.toArray();
    expect(latestOf(all, 'weight')?.value).toBe(4.5);
    expect(trendOf(all, 'weight')?.delta).toBeCloseTo(0.3);
    expect(trendOf(all, 'water')).toBeUndefined();
    await deleteMeasurement(m.id);
    expect(await db.measurements.count()).toBe(2);
    expect(await db.symptomLogs.count()).toBe(1);
  });

  it('converts units for display and input', () => {
    const p = { weightUnit: 'lb' as const, volumeUnit: 'floz' as const };
    expect(toDisplay('weight', 1, p)).toBeCloseTo(2.2046, 3);
    expect(fromDisplay('weight', 10, p)).toBeCloseTo(4.5359, 3);
    expect(formatMeasurement('weight', 4.5, { weightUnit: 'kg', volumeUnit: 'ml' })).toBe('4.50 kg');
    expect(formatMeasurement('water', 29.5735, p)).toBe('1.0 fl oz');
  });

  it('formats ages from exact and estimated birth dates', () => {
    const now = new Date(2025, 5, 15);
    expect(formatAge('2022-03-10', false, now)).toBe('3 yrs 3 mo');
    expect(formatAge('2025-01-01', false, now)).toBe('5 mo');
    expect(formatAge(birthDateFromAge(4, 0, now), true, now)).toBe('~4 yrs');
    expect(formatAge(undefined)).toBe('Age unknown');
  });
});
