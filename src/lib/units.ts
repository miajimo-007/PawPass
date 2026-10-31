import type { MeasurementType, VolumeUnit, WeightUnit } from '@/db/types';

export const KG_PER_LB = 0.45359237;
export const ML_PER_FLOZ = 29.5735295625;

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}
export function displayToKg(v: number, unit: WeightUnit): number {
  return unit === 'kg' ? v : v * KG_PER_LB;
}
export function mlToDisplay(ml: number, unit: VolumeUnit): number {
  return unit === 'ml' ? ml : ml / ML_PER_FLOZ;
}
export function displayToMl(v: number, unit: VolumeUnit): number {
  return unit === 'ml' ? v : v * ML_PER_FLOZ;
}

export interface UnitPrefs {
  weightUnit: WeightUnit;
  volumeUnit: VolumeUnit;
}

export function unitLabel(type: MeasurementType, p: UnitPrefs): string {
  if (type === 'weight') return p.weightUnit;
  if (type === 'water') return p.volumeUnit === 'ml' ? 'ml' : 'fl oz';
  if (type === 'bcs') return '/ 9';
  return 'min';
}

export function toDisplay(type: MeasurementType, canonical: number, p: UnitPrefs): number {
  if (type === 'weight') return kgToDisplay(canonical, p.weightUnit);
  if (type === 'water') return mlToDisplay(canonical, p.volumeUnit);
  return canonical;
}

export function fromDisplay(type: MeasurementType, v: number, p: UnitPrefs): number {
  if (type === 'weight') return displayToKg(v, p.weightUnit);
  if (type === 'water') return displayToMl(v, p.volumeUnit);
  return v;
}

export function formatMeasurement(type: MeasurementType, canonical: number, p: UnitPrefs): string {
  const v = toDisplay(type, canonical, p);
  if (type === 'bcs') return `${v.toFixed(0)} / 9`;
  const digits = type === 'weight' ? 2 : type === 'water' && p.volumeUnit === 'floz' ? 1 : 0;
  return `${v.toFixed(digits)} ${unitLabel(type, p)}`;
}
