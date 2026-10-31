import type {
  AllergySeverity,
  AppointmentStatus,
  ConditionStatus,
  DocumentCategory,
  MeasurementType,
  MedicationRoute,
  NeuterStatus,
  RecordCategory,
  Sex,
  SymptomCategory,
  SymptomSeverity,
} from '@/db/types';

export const RECORD_CATEGORIES: Record<RecordCategory, string> = {
  consultation: 'Veterinary consultation',
  diagnosis: 'Diagnosis',
  lab: 'Laboratory result',
  imaging: 'Imaging report',
  surgery: 'Surgery',
  hospitalization: 'Hospitalization',
  vaccination: 'Vaccination',
  medication: 'Medication',
  allergy: 'Allergy',
  observation: 'Clinical observation',
  preventive: 'Preventive care',
  other: 'Other document',
};

export const SEX_LABELS: Record<Sex, string> = { female: 'Female', male: 'Male', unknown: 'Unknown' };
export const NEUTER_LABELS: Record<NeuterStatus, string> = {
  neutered: 'Neutered / spayed',
  intact: 'Intact',
  unknown: 'Unknown',
};

export const ROUTE_LABELS: Record<MedicationRoute, string> = {
  oral: 'Oral',
  topical: 'Topical',
  injection: 'Injection',
  ophthalmic: 'Eye (ophthalmic)',
  otic: 'Ear (otic)',
  inhaled: 'Inhaled',
  transdermal: 'Transdermal',
  other: 'Other',
};

export const APPOINTMENT_STATUS: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const CONDITION_STATUS: Record<ConditionStatus, string> = {
  active: 'Active',
  managed: 'Managed',
  resolved: 'Resolved',
};

export const ALLERGY_SEVERITY: Record<AllergySeverity, string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
  unknown: 'Unknown',
};

export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  weight: 'Weight',
  water: 'Water intake',
  activity: 'Active play',
};

export const SYMPTOM_CATEGORIES: Record<SymptomCategory, string> = {
  appetite: 'Appetite',
  water: 'Water intake',
  activity: 'Activity',
  vomiting: 'Vomiting',
  stool: 'Stool',
  urination: 'Urination',
  behavior: 'Behavior',
  symptom: 'Other symptom',
};

export const SEVERITY_LABELS: Record<SymptomSeverity, string> = {
  none: 'Normal / none',
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
};

export const DOCUMENT_CATEGORIES: Record<DocumentCategory, string> = {
  report: 'Medical report',
  lab: 'Laboratory result',
  prescription: 'Prescription',
  imaging: 'Imaging report',
  invoice: 'Veterinary invoice',
  photo: 'Medical photograph',
  vaccination: 'Vaccination certificate',
  other: 'Other',
};

export function options<T extends string>(map: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}
