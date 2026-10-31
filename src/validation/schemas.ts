import { z } from 'zod';

/**
 * Reusable validation rules. Shared by forms (via React Hook Form) and by the
 * service layer, so the same rules can be ported to a native app later.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date');
const optionalIsoDate = z.union([isoDate, z.literal('')]).optional();
const optionalText = (max = 2000) => z.string().trim().max(max, `Keep this under ${max} characters`).optional();
const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max, `Keep this under ${max} characters`);

const notFuture = (v: string | undefined) => !v || v <= new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

export const catFormSchema = z
  .object({
    name: requiredText('Name', 60),
    ageMode: z.enum(['dob', 'estimate']),
    birthDate: optionalIsoDate,
    estimatedYears: z.string().optional(),
    breed: optionalText(80),
    sex: z.enum(['female', 'male', 'unknown']),
    color: optionalText(80),
    weight: z.string().optional(),
    microchip: z
      .string()
      .trim()
      .max(40)
      .regex(/^[0-9A-Za-z\s-]*$/, 'Use digits and letters only')
      .optional(),
    neuterStatus: z.enum(['neutered', 'intact', 'unknown']),
    allergies: optionalText(1000),
    conditions: optionalText(1000),
    primaryVet: optionalText(120),
    primaryClinic: optionalText(120),
    notes: optionalText(4000),
    feedingNotes: optionalText(2000),
    sitterNotes: optionalText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.ageMode === 'dob' && v.birthDate && !notFuture(v.birthDate)) {
      ctx.addIssue({ code: 'custom', path: ['birthDate'], message: 'Birth date cannot be in the future' });
    }
    if (v.ageMode === 'estimate' && v.estimatedYears) {
      const n = Number(v.estimatedYears);
      if (!Number.isFinite(n) || n < 0 || n > 35) {
        ctx.addIssue({ code: 'custom', path: ['estimatedYears'], message: 'Enter an age between 0 and 35 years' });
      }
    }
    if (v.weight) {
      const n = Number(v.weight);
      if (!Number.isFinite(n) || n <= 0 || n > 40) {
        ctx.addIssue({ code: 'custom', path: ['weight'], message: 'Enter a realistic weight' });
      }
    }
  });
export type CatFormValues = z.infer<typeof catFormSchema>;

export const recordFormSchema = z.object({
  catId: z.string().min(1, 'Choose a cat'),
  category: z.enum([
    'consultation',
    'diagnosis',
    'lab',
    'imaging',
    'surgery',
    'hospitalization',
    'vaccination',
    'medication',
    'allergy',
    'observation',
    'preventive',
    'other',
  ]),
  title: requiredText('Title', 160),
  date: isoDate,
  endDate: optionalIsoDate,
  source: z.enum(['owner', 'veterinarian']),
  clinic: optionalText(120),
  veterinarian: optionalText(120),
  description: optionalText(4000),
  findings: optionalText(4000),
  treatment: optionalText(4000),
  notes: optionalText(4000),
  documentIds: z.array(z.string()),
});
export type RecordFormValues = z.infer<typeof recordFormSchema>;

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');

export const medicationFormSchema = z
  .object({
    catId: z.string().min(1, 'Choose a cat'),
    name: requiredText('Medication name', 120),
    dosage: requiredText('Prescribed dosage', 120),
    route: z.enum(['oral', 'topical', 'injection', 'ophthalmic', 'otic', 'inhaled', 'transdermal', 'other']),
    frequency: requiredText('Frequency', 120),
    startDate: isoDate,
    endDate: optionalIsoDate,
    prescribedBy: optionalText(120),
    instructions: optionalText(2000),
    condition: optionalText(160),
    status: z.enum(['active', 'completed', 'stopped']),
    reminderTimes: z.array(timeOfDay).max(8),
    remindersEnabled: z.boolean(),
    documentIds: z.array(z.string()),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { path: ['endDate'], message: 'End date is before start date' });
export type MedicationFormValues = z.infer<typeof medicationFormSchema>;

export const vaccinationFormSchema = z
  .object({
    catId: z.string().min(1, 'Choose a cat'),
    vaccine: requiredText('Vaccine name', 120),
    dateGiven: isoDate,
    clinic: optionalText(120),
    veterinarian: optionalText(120),
    batchNumber: optionalText(60),
    nextDueDate: optionalIsoDate,
    notes: optionalText(2000),
    documentIds: z.array(z.string()),
  })
  .refine((v) => !v.nextDueDate || v.nextDueDate > v.dateGiven, {
    path: ['nextDueDate'],
    message: 'Next due date must be after the date given',
  });
export type VaccinationFormValues = z.infer<typeof vaccinationFormSchema>;

export const appointmentFormSchema = z.object({
  catId: z.string().min(1, 'Choose a cat'),
  title: requiredText('Reason for visit', 160),
  dateTime: z.string().min(1, 'Choose a date and time'),
  clinic: optionalText(120),
  clinicAddress: optionalText(240),
  clinicPhone: optionalText(40),
  veterinarian: optionalText(120),
  preparationNotes: optionalText(2000),
  reminderMinutes: z.string(),
  status: z.enum(['scheduled', 'completed', 'cancelled']),
});
export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export const measurementFormSchema = z
  .object({
    catId: z.string().min(1, 'Choose a cat'),
    type: z.enum(['weight', 'water', 'activity']),
    value: z.string().min(1, 'Enter a value'),
    measuredAt: z.string().min(1, 'Choose when this was measured'),
    note: optionalText(500),
  })
  .superRefine((v, ctx) => {
    const n = Number(v.value);
    if (!Number.isFinite(n) || n <= 0) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Enter a positive number' });
  });
export type MeasurementFormValues = z.infer<typeof measurementFormSchema>;

export const symptomFormSchema = z.object({
  catId: z.string().min(1, 'Choose a cat'),
  category: z.enum(['appetite', 'water', 'activity', 'vomiting', 'stool', 'urination', 'behavior', 'symptom']),
  description: requiredText('Description', 240),
  severity: z.enum(['none', 'mild', 'moderate', 'severe']),
  level: z.enum(['', 'decreased', 'normal', 'increased']).optional(),
  observedAt: z.string().min(1, 'Choose when this was observed'),
  notes: optionalText(2000),
});
export type SymptomFormValues = z.infer<typeof symptomFormSchema>;

export const documentFormSchema = z.object({
  catId: z.string().min(1, 'Choose a cat'),
  title: requiredText('Title', 160),
  category: z.enum(['report', 'lab', 'prescription', 'imaging', 'invoice', 'photo', 'vaccination', 'other']),
  date: isoDate,
  notes: optionalText(2000),
});
export type DocumentFormValues = z.infer<typeof documentFormSchema>;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'text/plain',
];
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export function validateUpload(file: { type: string; size: number; name: string }): string | null {
  const typeOk = ALLOWED_DOCUMENT_TYPES.includes(file.type) || /\.(pdf|jpe?g|png|webp|heic|heif|gif|txt)$/i.test(file.name);
  if (!typeOk) return 'Use a PDF, image (JPEG, PNG, WebP, HEIC) or text file.';
  if (file.size > MAX_DOCUMENT_BYTES) return 'Files must be 25 MB or smaller.';
  if (file.size === 0) return 'This file is empty.';
  return null;
}

/** Splits a free-text list ("Chicken, Penicillin\nPollen") into trimmed unique items. */
export function splitList(text?: string): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => {
      const k = s.toLowerCase();
      if (!s || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}
