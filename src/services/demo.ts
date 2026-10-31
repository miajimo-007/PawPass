import { DATA_TABLES, db } from '@/db/database';
import { addDays, toISODate } from '@/lib/dates';
import { audit } from './base';
import { createAppointment } from './appointments';
import { createCat } from './cats';
import { addMeasurement, addSymptom } from './health';
import { createMedication, recordDose, slotIso } from './medications';
import { createRecord } from './records';
import { createVaccination } from './vaccinations';
import { getPrefs, updatePrefs } from './prefs';

/**
 * FICTIONAL demonstration data. Every row is flagged `isDemo: true` and stored
 * through the same services and IndexedDB tables as real data, so the demo
 * exercises the real persistence path. Demo rows can be removed without
 * touching anything the user entered.
 */

const d = (offsetDays: number) => toISODate(addDays(new Date(), offsetDays));
const at = (offsetDays: number, hh: number, mm = 0) => {
  const x = addDays(new Date(), offsetDays);
  x.setHours(hh, mm, 0, 0);
  return x.toISOString();
};

export async function hasDemoData(): Promise<boolean> {
  return (await db.cats.filter((c) => !!c.isDemo).count()) > 0;
}

export async function removeDemoData(): Promise<number> {
  let removed = 0;
  await db.transaction('rw', [...DATA_TABLES.map((t) => db.table(t)), db.notifications, db.preferences, db.auditEvents], async () => {
    const demoCatIds = new Set((await db.cats.filter((c) => !!c.isDemo).toArray()).map((c) => c.id));
    for (const t of DATA_TABLES) {
      removed += await db
        .table(t)
        .filter((r: { isDemo?: boolean; catId?: string }) => !!r.isDemo || (!!r.catId && demoCatIds.has(r.catId)))
        .delete();
    }
    await db.notifications.filter((n) => !!n.catId && demoCatIds.has(n.catId)).delete();
    const prefs = await getPrefs();
    if (prefs.selectedCatId && demoCatIds.has(prefs.selectedCatId)) {
      const next = await db.cats.orderBy('createdAt').first();
      await updatePrefs({ selectedCatId: next?.id ?? null });
    }
    await audit('demo', 'demo', `Removed ${removed} demo records`);
  });
  return removed;
}

export async function resetDemoData(): Promise<void> {
  await removeDemoData();
  await seedDemoData();
}

export async function seedDemoData(): Promise<void> {
  const demo = { isDemo: true };

  // ---- Luna --------------------------------------------------------------------------
  const luna = await createCat(
    {
      name: 'Luna',
      birthDate: d(-365 * 4 - 40),
      breed: 'British Shorthair',
      sex: 'female',
      color: 'Blue',
      weightKg: 4.6,
      microchip: '900000000000001 (sample)',
      neuterStatus: 'neutered',
      primaryVet: 'Dr. Sample Rahman',
      primaryClinic: 'Sample Oak Veterinary Clinic',
      notes: 'FICTIONAL DEMO PROFILE. Prefers quiet carriers; treats help during exams.',
    },
    { allergies: ['Chicken protein (sample)'], conditions: ['Mild dental tartar (sample)'], ...demo },
  );
  await createRecord(
    {
      catId: luna.id,
      category: 'consultation',
      title: 'Annual wellness examination',
      date: d(-62),
      source: 'veterinarian',
      clinic: 'Sample Oak Veterinary Clinic',
      veterinarian: 'Dr. Sample Rahman',
      description: 'Routine yearly check-up (fictional demo record).',
      findings: 'Bright and alert. Mild tartar on upper premolars. Body condition 5/9.',
      treatment: 'Dental diet discussed. Recheck teeth in 6 months.',
      documentIds: [],
    },
    demo,
  );
  await createRecord(
    {
      catId: luna.id,
      category: 'lab',
      title: 'Senior screening blood panel',
      date: d(-62),
      source: 'veterinarian',
      clinic: 'Sample Oak Veterinary Clinic',
      findings: 'All values reported within reference ranges by the clinic (fictional).',
      documentIds: [],
    },
    demo,
  );
  await createRecord(
    {
      catId: luna.id,
      category: 'observation',
      title: 'Sneezing for two days',
      date: d(-9),
      source: 'owner',
      description: 'Occasional sneezing, clear discharge, eating normally (fictional).',
      documentIds: [],
    },
    demo,
  );
  await createVaccination(
    { catId: luna.id, vaccine: 'FVRCP', dateGiven: d(-350), clinic: 'Sample Oak Veterinary Clinic', veterinarian: 'Dr. Sample Rahman', batchNumber: 'DEMO-1123', nextDueDate: d(15), documentIds: [] },
    demo,
  );
  await createVaccination(
    { catId: luna.id, vaccine: 'Rabies', dateGiven: d(-400), clinic: 'Sample Oak Veterinary Clinic', batchNumber: 'DEMO-8841', nextDueDate: d(-35), documentIds: [] },
    demo,
  );
  await createAppointment(
    {
      catId: luna.id,
      title: 'Vaccination visit (FVRCP booster)',
      dateTime: at(12, 10, 30),
      clinic: 'Sample Oak Veterinary Clinic',
      clinicAddress: '12 Sample Street (fictional)',
      veterinarian: 'Dr. Sample Rahman',
      preparationNotes: 'Bring vaccination card. No food 2 hours before travel if she gets carsick.',
      reminderMinutes: 1440,
      status: 'scheduled',
    },
    demo,
  );
  const lunaWeights = [4.42, 4.48, 4.5, 4.55, 4.53, 4.6];
  for (let i = 0; i < lunaWeights.length; i++) {
    await addMeasurement({ catId: luna.id, type: 'weight', value: lunaWeights[i]!, measuredAt: at(-150 + i * 30, 9) }, { ...demo, silent: true });
  }
  for (let i = 0; i < 10; i++) {
    await addMeasurement({ catId: luna.id, type: 'water', value: 160 + ((i * 37) % 60), measuredAt: at(-10 + i, 20) }, { ...demo, silent: true });
  }
  await addSymptom(
    { catId: luna.id, category: 'symptom', description: 'Sneezing, clear nasal discharge', severity: 'mild', observedAt: at(-9, 18) },
    demo,
  );
  await addSymptom(
    { catId: luna.id, category: 'appetite', description: 'Ate full portions', severity: 'none', level: 'normal', observedAt: at(-2, 19) },
    demo,
  );

  // ---- Milo --------------------------------------------------------------------------
  const milo = await createCat(
    {
      name: 'Milo',
      birthDate: d(-365 * 9),
      birthDateEstimated: true,
      breed: 'Domestic Shorthair',
      sex: 'male',
      color: 'Orange tabby',
      weightKg: 5.4,
      neuterStatus: 'neutered',
      primaryVet: 'Dr. Sample Chen',
      primaryClinic: 'Sample Harbour Animal Hospital',
      notes: 'FICTIONAL DEMO PROFILE. Adopted as an adult; age is an estimate.',
    },
    { conditions: ['Hyperthyroidism (sample)'], ...demo },
  );
  await createRecord(
    {
      catId: milo.id,
      category: 'diagnosis',
      title: 'Hyperthyroidism diagnosed',
      date: d(-120),
      source: 'veterinarian',
      clinic: 'Sample Harbour Animal Hospital',
      veterinarian: 'Dr. Sample Chen',
      findings: 'Elevated T4 reported by the clinic (fictional).',
      treatment: 'Medication prescribed by the veterinarian. Recheck bloods in 3 weeks.',
      documentIds: [],
    },
    demo,
  );
  await createRecord(
    {
      catId: milo.id,
      category: 'lab',
      title: 'T4 recheck',
      date: d(-95),
      source: 'veterinarian',
      clinic: 'Sample Harbour Animal Hospital',
      findings: 'T4 now within the clinic reference range (fictional).',
      documentIds: [],
    },
    demo,
  );
  const methimazole = await createMedication(
    {
      catId: milo.id,
      name: 'Methimazole (sample)',
      dosage: 'As prescribed — see label (sample)',
      route: 'oral',
      frequency: 'Twice daily',
      startDate: d(-120),
      prescribedBy: 'Dr. Sample Chen',
      instructions: 'Give with food. Wash hands after handling (fictional instructions).',
      condition: 'Hyperthyroidism',
      status: 'active',
      documentIds: [],
    },
    { times: ['08:00', '20:00'], remindersEnabled: true },
    demo,
  );
  for (let day = -3; day <= -1; day++) {
    await recordDose(methimazole, slotIso(d(day), '08:00'), 'given');
    await recordDose(methimazole, slotIso(d(day), '20:00'), day === -2 ? 'skipped' : 'given', day === -2 ? 'Refused pill (sample)' : undefined);
  }
  await db.medicationLogs.where('medicationId').equals(methimazole.id).modify({ isDemo: true });
  await createVaccination(
    { catId: milo.id, vaccine: 'FVRCP', dateGiven: d(-200), clinic: 'Sample Harbour Animal Hospital', batchNumber: 'DEMO-2290', nextDueDate: d(165), documentIds: [] },
    demo,
  );
  await createAppointment(
    {
      catId: milo.id,
      title: 'Thyroid recheck and blood test',
      dateTime: at(5, 16, 0),
      clinic: 'Sample Harbour Animal Hospital',
      veterinarian: 'Dr. Sample Chen',
      preparationNotes: 'Give morning dose as usual unless the vet says otherwise.',
      reminderMinutes: 120,
      status: 'scheduled',
    },
    demo,
  );
  const miloWeights = [5.9, 5.7, 5.55, 5.45, 5.4];
  for (let i = 0; i < miloWeights.length; i++) {
    await addMeasurement({ catId: milo.id, type: 'weight', value: miloWeights[i]!, measuredAt: at(-120 + i * 28, 8) }, { ...demo, silent: true });
  }
  await addSymptom(
    { catId: milo.id, category: 'vomiting', description: 'Vomited once after breakfast (hairball)', severity: 'mild', observedAt: at(-4, 9) },
    demo,
  );
  await addSymptom(
    { catId: milo.id, category: 'water', description: 'Drinking more than usual', severity: 'mild', level: 'increased', observedAt: at(-6, 21) },
    demo,
  );

  // ---- Oliver ------------------------------------------------------------------------
  const oliver = await createCat(
    {
      name: 'Oliver',
      birthDate: d(-250),
      breed: 'Maine Coon',
      sex: 'male',
      color: 'Brown tabby',
      weightKg: 4.1,
      neuterStatus: 'neutered',
      primaryVet: 'Dr. Sample Rahman',
      primaryClinic: 'Sample Oak Veterinary Clinic',
      notes: 'FICTIONAL DEMO PROFILE. Young and very playful.',
    },
    { ...demo },
  );
  await createRecord(
    {
      catId: oliver.id,
      category: 'surgery',
      title: 'Neuter surgery',
      date: d(-70),
      source: 'veterinarian',
      clinic: 'Sample Oak Veterinary Clinic',
      veterinarian: 'Dr. Sample Rahman',
      treatment: 'Routine procedure. Cone for 10 days (fictional).',
      notes: 'Recovered well at home.',
      documentIds: [],
    },
    demo,
  );
  await createRecord(
    {
      catId: oliver.id,
      category: 'preventive',
      title: 'Deworming treatment',
      date: d(-30),
      source: 'owner',
      description: 'Product given as directed by the clinic (fictional).',
      documentIds: [],
    },
    demo,
  );
  await createVaccination(
    { catId: oliver.id, vaccine: 'FVRCP (kitten series)', dateGiven: d(-160), clinic: 'Sample Oak Veterinary Clinic', batchNumber: 'DEMO-0311', nextDueDate: d(205), documentIds: [] },
    demo,
  );
  await createAppointment(
    {
      catId: oliver.id,
      title: 'Post-surgery check',
      dateTime: at(-60, 11, 0),
      clinic: 'Sample Oak Veterinary Clinic',
      status: 'completed',
      reminderMinutes: null,
    },
    demo,
  );
  const oliverWeights = [2.6, 3.1, 3.5, 3.8, 4.1];
  for (let i = 0; i < oliverWeights.length; i++) {
    await addMeasurement({ catId: oliver.id, type: 'weight', value: oliverWeights[i]!, measuredAt: at(-160 + i * 40, 10) }, { ...demo, silent: true });
  }
  for (let i = 0; i < 7; i++) {
    await addMeasurement({ catId: oliver.id, type: 'activity', value: 30 + ((i * 13) % 25), measuredAt: at(-7 + i, 19) }, { ...demo, silent: true });
  }

  const prefs = await getPrefs();
  if (!prefs.selectedCatId) await updatePrefs({ selectedCatId: luna.id });
  await audit('demo', 'demo', 'Loaded fictional demo data (Luna, Milo, Oliver)');
}
