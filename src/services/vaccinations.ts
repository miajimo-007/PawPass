import { db } from '@/db/database';
import type { Vaccination } from '@/db/types';
import { daysBetween, parseISODate } from '@/lib/dates';
import { nowIso } from '@/lib/utils';
import { audit, clean, stamp } from './base';
import { rememberClinic } from './clinics';
import { NotFoundError, safeWrite } from './errors';

export type VaccinationInput = Omit<Vaccination, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>;

export async function createVaccination(input: VaccinationInput, opts: { isDemo?: boolean } = {}): Promise<Vaccination> {
  return safeWrite(() =>
    db.transaction('rw', [db.vaccinations, db.clinics, db.auditEvents], async () => {
      const row = stamp(clean({ ...input, documentIds: input.documentIds ?? [] }), opts) as Vaccination;
      await db.vaccinations.add(row);
      await rememberClinic(input.clinic, {}, opts.isDemo);
      await audit('create', 'vaccination', `Recorded vaccination: ${row.vaccine}`, row.id, row.catId);
      return row;
    }),
  );
}

export async function updateVaccination(id: string, input: VaccinationInput) {
  await safeWrite(() =>
    db.transaction('rw', [db.vaccinations, db.clinics, db.auditEvents], async () => {
      const existing = await db.vaccinations.get(id);
      if (!existing) throw new NotFoundError('This vaccination');
      const next = clean({ ...input, id, createdAt: existing.createdAt, updatedAt: nowIso(), isDemo: existing.isDemo }) as Vaccination;
      next.documentIds = input.documentIds ?? [];
      await db.vaccinations.put(next);
      await rememberClinic(input.clinic);
      await audit('update', 'vaccination', `Updated vaccination: ${next.vaccine}`, id, next.catId);
    }),
  );
}

export async function deleteVaccination(id: string) {
  const row = await db.vaccinations.get(id);
  if (!row) return;
  await db.vaccinations.delete(id);
  await audit('delete', 'vaccination', `Deleted vaccination: ${row.vaccine}`, id, row.catId);
}

export type DueStatus = 'overdue' | 'due-soon' | 'upcoming' | 'none';

/**
 * Status of a vaccination's next due date. Only uses dates the owner entered
 * as confirmed by the veterinarian — PAWPASS never invents a schedule.
 * A vaccine is considered superseded when a later dose of the same vaccine exists.
 */
export function vaccinationDueStatus(v: Vaccination, all: Vaccination[], now = new Date()): DueStatus {
  if (!v.nextDueDate) return 'none';
  const superseded = all.some(
    (o) => o.id !== v.id && o.catId === v.catId && o.vaccine.trim().toLowerCase() === v.vaccine.trim().toLowerCase() && o.dateGiven > v.dateGiven,
  );
  if (superseded) return 'none';
  const days = daysBetween(now, parseISODate(v.nextDueDate));
  if (days < 0) return 'overdue';
  if (days <= 30) return 'due-soon';
  return 'upcoming';
}

/** Vaccinations with a confirmed next due date that has not been superseded, soonest first. */
export function dueVaccinations(all: Vaccination[], now = new Date()) {
  return all
    .map((v) => ({ v, status: vaccinationDueStatus(v, all, now) }))
    .filter((x) => x.status !== 'none')
    .sort((a, b) => a.v.nextDueDate!.localeCompare(b.v.nextDueDate!));
}
