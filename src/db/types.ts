/**
 * PAWPASS data model.
 *
 * Every entity has a UUID `id`, ISO timestamps `createdAt`/`updatedAt` and an
 * optional `isDemo` flag that marks fictional sample data. Dates without a time
 * component are stored as `YYYY-MM-DD` strings; moments in time as full ISO
 * strings. Measurements are stored in canonical units (kg, ml) and converted
 * for display according to user preferences.
 *
 * See docs/DATA_MODEL.md for the relationship diagram.
 */

export type ID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // full ISO 8601

export interface BaseEntity {
  id: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  isDemo?: boolean;
}

export type Sex = 'female' | 'male' | 'unknown';
export type NeuterStatus = 'neutered' | 'intact' | 'unknown';

export interface Cat extends BaseEntity {
  name: string;
  photo?: Blob | null;
  photoType?: string;
  birthDate?: ISODate;
  birthDateEstimated?: boolean;
  breed?: string;
  sex: Sex;
  color?: string;
  /** Weight entered on the profile (kg). The weight history lives in `measurements`. */
  weightKg?: number;
  microchip?: string;
  neuterStatus: NeuterStatus;
  primaryVet?: string;
  primaryClinic?: string;
  notes?: string;
  archived?: boolean;
  /** Feeding routine for sitters, e.g. "40 g wet food at 7am and 7pm". */
  feedingNotes?: string;
  /** Care tips for a sitter: hiding spots, litter, temperament. */
  sitterNotes?: string;
  /** Target weight in kg, ideally agreed with the veterinarian. */
  targetWeightKg?: number;
  targetWeightSetBy?: 'veterinarian' | 'owner';
}

export type RecordCategory =
  | 'consultation'
  | 'diagnosis'
  | 'lab'
  | 'imaging'
  | 'surgery'
  | 'hospitalization'
  | 'vaccination'
  | 'medication'
  | 'allergy'
  | 'observation'
  | 'preventive'
  | 'other';

export type RecordSource = 'owner' | 'veterinarian';

export interface MedicalRecord extends BaseEntity {
  catId: ID;
  category: RecordCategory;
  title: string;
  date: ISODate;
  endDate?: ISODate;
  source: RecordSource;
  clinic?: string;
  veterinarian?: string;
  description?: string;
  findings?: string;
  treatment?: string;
  notes?: string;
  documentIds: ID[];
  appointmentId?: ID;
}

export type ConditionStatus = 'active' | 'managed' | 'resolved';

export interface Diagnosis extends BaseEntity {
  catId: ID;
  name: string;
  status: ConditionStatus;
  diagnosedOn?: ISODate;
  notes?: string;
  recordId?: ID;
}

export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'unknown';

export interface Allergy extends BaseEntity {
  catId: ID;
  allergen: string;
  reaction?: string;
  severity: AllergySeverity;
  notes?: string;
}

export type MedicationRoute = 'oral' | 'topical' | 'injection' | 'ophthalmic' | 'otic' | 'inhaled' | 'transdermal' | 'other';
export type MedicationStatus = 'active' | 'completed' | 'stopped';

export interface Medication extends BaseEntity {
  catId: ID;
  name: string;
  /** Free text exactly as prescribed, e.g. "2.5 mg (½ tablet)". PAWPASS never calculates doses. */
  dosage: string;
  route: MedicationRoute;
  /** Free text exactly as prescribed, e.g. "Every 12 hours". */
  frequency: string;
  startDate: ISODate;
  endDate?: ISODate;
  prescribedBy?: string;
  instructions?: string;
  condition?: string;
  status: MedicationStatus;
  documentIds: ID[];
  /** Doses (tablets, ml, applications…) currently in stock. Decreases when a dose is recorded as given. */
  stockCount?: number;
  /** Warn when the stock will run out within this many days. */
  refillWarningDays?: number;
}

/** Times of day at which the owner wants a dose reminder. */
export interface MedicationSchedule extends BaseEntity {
  medicationId: ID;
  catId: ID;
  times: string[]; // "HH:mm"
  remindersEnabled: boolean;
}

export type DoseStatus = 'given' | 'skipped';

export interface MedicationLog extends BaseEntity {
  medicationId: ID;
  catId: ID;
  /** The scheduled moment this entry refers to (or the actual time for unscheduled doses). */
  scheduledFor: ISODateTime;
  status: DoseStatus;
  recordedAt: ISODateTime;
  note?: string;
}

export interface Vaccination extends BaseEntity {
  catId: ID;
  vaccine: string;
  dateGiven: ISODate;
  clinic?: string;
  veterinarian?: string;
  batchNumber?: string;
  /** Only filled when confirmed by the veterinarian. PAWPASS never invents schedules. */
  nextDueDate?: ISODate;
  notes?: string;
  documentIds: ID[];
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Appointment extends BaseEntity {
  catId: ID;
  title: string;
  dateTime: ISODateTime;
  clinic?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  veterinarian?: string;
  preparationNotes?: string;
  /** Minutes before the appointment to show a reminder; null = no reminder. */
  reminderMinutes?: number | null;
  status: AppointmentStatus;
  linkedRecordId?: ID;
}

export interface Clinic extends BaseEntity {
  name: string;
  address?: string;
  phone?: string;
}

/** bcs = body condition score on the 1–9 veterinary scale. */
export type MeasurementType = 'weight' | 'water' | 'activity' | 'bcs';

export interface Measurement extends BaseEntity {
  catId: ID;
  type: MeasurementType;
  /** Canonical units: weight → kg, water → ml, activity → minutes. */
  value: number;
  measuredAt: ISODateTime;
  note?: string;
}

export type SymptomCategory =
  | 'appetite'
  | 'water'
  | 'activity'
  | 'vomiting'
  | 'stool'
  | 'urination'
  | 'behavior'
  | 'symptom';

export type SymptomSeverity = 'none' | 'mild' | 'moderate' | 'severe';

export interface SymptomLog extends BaseEntity {
  catId: ID;
  category: SymptomCategory;
  /** Short owner description, e.g. "Ate less than half of breakfast". */
  description: string;
  severity: SymptomSeverity;
  /** Optional qualitative level, e.g. "decreased", "normal", "increased". */
  level?: 'decreased' | 'normal' | 'increased';
  observedAt: ISODateTime;
  notes?: string;
}

export type DocumentCategory = 'report' | 'lab' | 'prescription' | 'imaging' | 'invoice' | 'photo' | 'vaccination' | 'other';

export interface DocumentFile extends BaseEntity {
  catId: ID;
  title: string;
  category: DocumentCategory;
  date: ISODate;
  fileName: string;
  mimeType: string;
  size: number;
  blob: Blob;
  notes?: string;
}

export type FoodType = 'dry' | 'wet' | 'raw' | 'homemade' | 'prescription' | 'treat' | 'other';

/** A food the cat eats (or ate). Changing food = ending one diet and starting another. */
export interface Diet extends BaseEntity {
  catId: ID;
  foodName: string;
  brand?: string;
  type: FoodType;
  /** Free text, e.g. "40 g twice a day". */
  portion?: string;
  startDate: ISODate;
  endDate?: ISODate;
  reasonForChange?: string;
  notes?: string;
}

export type QuickLogKind = 'pee' | 'poop' | 'water' | 'litter';

/** One-tap counters for litter box and water bowl. */
export interface QuickLog extends BaseEntity {
  catId: ID;
  kind: QuickLogKind;
  at: ISODateTime;
  note?: string;
}

export type RoutineKind = 'nails' | 'brushing' | 'teeth' | 'bath' | 'flea' | 'deworm' | 'litter' | 'other';

/** A repeating care task: nail trims, flea/tick and deworming treatments, litter change… */
export interface Routine extends BaseEntity {
  catId: ID;
  kind: RoutineKind;
  title: string;
  intervalDays: number;
  /** Dates (YYYY-MM-DD) when the task was done, newest first. */
  doneDates: ISODate[];
  /** First due date when never done yet. */
  startDate: ISODate;
  remindersEnabled: boolean;
  product?: string;
  notes?: string;
}

export type NotificationKind = 'medication' | 'appointment' | 'vaccination' | 'storage' | 'routine' | 'refill';

/** A reminder that has been shown to the user (prevents duplicate alerts). */
export interface AppNotification extends BaseEntity {
  kind: NotificationKind;
  key: string; // unique key, e.g. "medication:<id>:<scheduled iso>"
  catId?: ID;
  refId?: ID;
  title: string;
  body?: string;
  dueAt: ISODateTime;
  dismissed: boolean;
}

export type WeightUnit = 'kg' | 'lb';
export type VolumeUnit = 'ml' | 'floz';

export interface Preferences {
  id: 'prefs';
  ownerName?: string;
  selectedCatId?: ID | null;
  weightUnit: WeightUnit;
  volumeUnit: VolumeUnit;
  remindersEnabled: boolean;
  lastBackupAt?: ISODateTime;
  /** Owner contact details used on the sitter card and lost-cat poster. */
  ownerPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  onboardingDismissed?: boolean;
  /** Appearance: light, dark or follow the device. */
  themeMode?: 'light' | 'dark' | 'system';
  /** Accent preset id (see src/lib/theme.ts) or 'custom'. */
  accentId?: string;
  /** Custom accent colour as #RRGGBB when accentId is 'custom'. */
  customAccent?: string;
  updatedAt: ISODateTime;
}

export type AuditAction = 'create' | 'update' | 'delete' | 'import' | 'export' | 'clear' | 'demo';

export interface AuditEvent {
  id: ID;
  at: ISODateTime;
  action: AuditAction;
  entity: string;
  entityId?: ID;
  catId?: ID;
  summary: string;
}
