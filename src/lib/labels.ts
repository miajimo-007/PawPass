import type {
  AllergySeverity,
  AppointmentStatus,
  ConditionStatus,
  DocumentCategory,
  ClaimStatus,
  ExpenseCategory,
  FoodType,
  QuickLogKind,
  RoutineKind,
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
  bcs: 'Body condition',
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
  video: 'Video',
  vaccination: 'Vaccination certificate',
  other: 'Other',
};

export const FOOD_TYPES: Record<FoodType, string> = {
  dry: 'Dry food',
  wet: 'Wet food',
  raw: 'Raw',
  homemade: 'Home-made',
  prescription: 'Prescription diet',
  treat: 'Treats',
  other: 'Other',
};

export const QUICK_LOG_LABELS: Record<QuickLogKind, string> = {
  pee: 'Pee',
  poop: 'Poop',
  water: 'Water refill',
  litter: 'Litter cleaned',
};

export const ROUTINE_KINDS: Record<RoutineKind, { label: string; days: number }> = {
  nails: { label: 'Nail trim', days: 14 },
  brushing: { label: 'Brushing', days: 7 },
  teeth: { label: 'Tooth brushing', days: 1 },
  bath: { label: 'Bath', days: 90 },
  flea: { label: 'Flea / tick treatment', days: 30 },
  deworm: { label: 'Deworming', days: 90 },
  litter: { label: 'Full litter change', days: 14 },
  other: { label: 'Other', days: 30 },
};

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  vet: 'Vet visit',
  medication: 'Medication',
  food: 'Food',
  insurance: 'Insurance premium',
  grooming: 'Grooming',
  supplies: 'Supplies & litter',
  boarding: 'Boarding / sitter',
  other: 'Other',
};

export const CLAIM_STATUS: Record<ClaimStatus, string> = {
  none: 'No claim',
  'to-submit': 'To submit',
  submitted: 'Claim submitted',
  paid: 'Claim paid',
  rejected: 'Claim rejected',
};

export function options<T extends string>(map: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}
