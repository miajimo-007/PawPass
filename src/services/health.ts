import { db } from '@/db/database';
import type { Measurement, MeasurementType, SymptomLog } from '@/db/types';
import { MEASUREMENT_LABELS, SYMPTOM_CATEGORIES } from '@/lib/labels';
import { nowIso } from '@/lib/utils';
import { audit, clean, stamp } from './base';
import { NotFoundError, safeWrite } from './errors';

export type MeasurementInput = Omit<Measurement, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>;
export type SymptomInput = Omit<SymptomLog, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>;

export async function addMeasurement(input: MeasurementInput, opts: { isDemo?: boolean; silent?: boolean } = {}): Promise<Measurement> {
  return safeWrite(async () => {
    const row = stamp(clean(input), opts) as Measurement;
    await db.measurements.add(row);
    if (!opts.silent) await audit('create', 'measurement', `Recorded ${MEASUREMENT_LABELS[row.type].toLowerCase()}`, row.id, row.catId);
    return row;
  });
}

export async function updateMeasurement(id: string, input: MeasurementInput) {
  await safeWrite(async () => {
    const existing = await db.measurements.get(id);
    if (!existing) throw new NotFoundError('This measurement');
    await db.measurements.put(clean({ ...input, id, createdAt: existing.createdAt, updatedAt: nowIso(), isDemo: existing.isDemo }) as Measurement);
  });
}

export async function deleteMeasurement(id: string) {
  const row = await db.measurements.get(id);
  if (!row) return;
  await db.measurements.delete(id);
  await audit('delete', 'measurement', `Deleted ${MEASUREMENT_LABELS[row.type].toLowerCase()} entry`, id, row.catId);
}

export async function addSymptom(input: SymptomInput, opts: { isDemo?: boolean } = {}): Promise<SymptomLog> {
  return safeWrite(async () => {
    const row = stamp(clean(input), opts) as SymptomLog;
    await db.symptomLogs.add(row);
    await audit('create', 'symptomLog', `Logged ${SYMPTOM_CATEGORIES[row.category].toLowerCase()} observation`, row.id, row.catId);
    return row;
  });
}

export async function updateSymptom(id: string, input: SymptomInput) {
  await safeWrite(async () => {
    const existing = await db.symptomLogs.get(id);
    if (!existing) throw new NotFoundError('This observation');
    await db.symptomLogs.put(clean({ ...input, id, createdAt: existing.createdAt, updatedAt: nowIso(), isDemo: existing.isDemo }) as SymptomLog);
  });
}

export async function deleteSymptom(id: string) {
  const row = await db.symptomLogs.get(id);
  if (!row) return;
  await db.symptomLogs.delete(id);
  await audit('delete', 'symptomLog', 'Deleted observation', id, row.catId);
}

export function latestOf(measurements: Measurement[], type: MeasurementType): Measurement | undefined {
  return measurements.filter((m) => m.type === type).sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
}

/** Change between the latest and the previous measurement of a type (canonical units). */
export function trendOf(measurements: Measurement[], type: MeasurementType): { delta: number; previous: Measurement } | undefined {
  const sorted = measurements.filter((m) => m.type === type).sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
  if (sorted.length < 2) return undefined;
  return { delta: sorted[0]!.value - sorted[1]!.value, previous: sorted[1]! };
}
