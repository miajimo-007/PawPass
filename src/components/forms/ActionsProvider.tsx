import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  Appointment,
  Cat,
  Diet,
  Expense,
  Routine,
  DocumentFile,
  Measurement,
  MeasurementType,
  MedicalRecord,
  Medication,
  RecordCategory,
  SymptomLog,
  Vaccination,
} from '@/db/types';
import { useSelectedCat } from '@/hooks/useData';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CatForm } from './CatForm';
import { RecordForm } from './RecordForm';
import { MedicationForm } from './MedicationForm';
import { VaccinationForm } from './VaccinationForm';
import { AppointmentForm, CompleteAppointmentForm } from './AppointmentForm';
import { MeasurementForm, SymptomForm } from './HealthForms';
import { DocumentForm } from './DocumentForm';
import { AllergyForm, ConditionForm } from './ProfileForms';
import { DietForm, RefillForm, RoutineForm, WeightGoalForm } from './CareForms';
import { ExpenseForm } from './ExpenseForm';

export type Action =
  | { type: 'cat'; edit?: Cat }
  | { type: 'record'; catId?: string; edit?: MedicalRecord; category?: RecordCategory }
  | { type: 'symptom'; catId?: string; edit?: SymptomLog }
  | { type: 'measurement'; catId?: string; edit?: Measurement; measurementType?: MeasurementType }
  | { type: 'medication'; catId?: string; edit?: Medication }
  | { type: 'vaccination'; catId?: string; edit?: Vaccination }
  | { type: 'appointment'; catId?: string; edit?: Appointment }
  | { type: 'document'; catId?: string; edit?: DocumentFile }
  | { type: 'complete-appointment'; appointment: Appointment }
  | { type: 'allergy'; catId: string }
  | { type: 'condition'; catId: string }
  | { type: 'diet'; catId?: string; edit?: Diet; change?: boolean }
  | { type: 'routine'; catId?: string; edit?: Routine }
  | { type: 'weight-goal'; cat: Cat }
  | { type: 'refill'; medication: Medication }
  | { type: 'expense'; catId?: string; edit?: Expense };

const ActionsContext = React.createContext<(a: Action) => void>(() => {});

/** Opens any create/edit form from anywhere (dashboard quick actions, lists, detail pages). */
export function useActions() {
  return React.useContext(ActionsContext);
}

function titleFor(a: Action): { title: string; description?: string; size?: 'md' | 'lg' } {
  const verb = 'edit' in a && a.edit ? 'Edit' : 'Add';
  switch (a.type) {
    case 'cat':
      return { title: a.edit ? `Edit ${a.edit.name}` : 'Add a cat', size: 'lg' };
    case 'record':
      return { title: `${verb} medical record`, size: 'lg' };
    case 'symptom':
      return { title: a.edit ? 'Edit observation' : 'Log symptoms', description: 'Owner-recorded observation' };
    case 'measurement':
      return { title: a.edit ? 'Edit measurement' : 'Record measurement' };
    case 'medication':
      return { title: `${verb} medication`, size: 'lg' };
    case 'vaccination':
      return { title: a.edit ? 'Edit vaccination' : 'Add vaccination' };
    case 'appointment':
      return { title: a.edit ? 'Edit appointment' : 'New appointment' };
    case 'document':
      return { title: a.edit ? 'Edit document details' : 'Upload document', description: 'Stored only on this device' };
    case 'complete-appointment':
      return { title: 'Complete appointment' };
    case 'allergy':
      return { title: 'Add allergy' };
    case 'condition':
      return { title: 'Add medical condition' };
    case 'diet':
      return { title: a.edit ? 'Edit food' : a.change ? 'Change food' : 'Add food' };
    case 'routine':
      return { title: a.edit ? 'Edit care routine' : 'Add care routine' };
    case 'weight-goal':
      return { title: `${a.cat.name}'s weight goal` };
    case 'refill':
      return { title: `Refill ${a.medication.name}` };
    case 'expense':
      return { title: a.edit ? 'Edit cost' : 'Add cost' };
  }
}

export function ActionsProvider({ children }: { children: React.ReactNode }) {
  const [action, setAction] = React.useState<Action | null>(null);
  const { cat, cats } = useSelectedCat();
  const navigate = useNavigate();

  const open = React.useCallback(
    (a: Action) => {
      // Every action except creating a cat needs at least one cat profile.
      if (a.type !== 'cat' && cats && cats.length === 0) {
        setAction({ type: 'cat' });
        return;
      }
      setAction(a);
    },
    [cats],
  );
  const close = () => setAction(null);
  const defaultCat = cat?.id ?? cats?.[0]?.id ?? '';
  const catFor = (a: { catId?: string }) => a.catId ?? defaultCat;

  let body: React.ReactNode = null;
  if (action) {
    switch (action.type) {
      case 'cat':
        body = (
          <CatForm
            edit={action.edit}
            onDone={(created) => {
              close();
              if (created) navigate('/');
            }}
          />
        );
        break;
      case 'record':
        body = <RecordForm catId={catFor(action)} edit={action.edit} category={action.category} onDone={close} />;
        break;
      case 'symptom':
        body = <SymptomForm catId={catFor(action)} edit={action.edit} onDone={close} />;
        break;
      case 'measurement':
        body = <MeasurementForm catId={catFor(action)} edit={action.edit} type={action.measurementType} onDone={close} />;
        break;
      case 'medication':
        body = <MedicationForm catId={catFor(action)} edit={action.edit} onDone={close} />;
        break;
      case 'vaccination':
        body = <VaccinationForm catId={catFor(action)} edit={action.edit} onDone={close} />;
        break;
      case 'appointment':
        body = <AppointmentForm catId={catFor(action)} edit={action.edit} onDone={close} />;
        break;
      case 'document':
        body = <DocumentForm catId={catFor(action)} edit={action.edit} onDone={close} />;
        break;
      case 'complete-appointment':
        body = <CompleteAppointmentForm appointment={action.appointment} onDone={close} />;
        break;
      case 'allergy':
        body = <AllergyForm catId={action.catId} onDone={close} />;
        break;
      case 'condition':
        body = <ConditionForm catId={action.catId} onDone={close} />;
        break;
      case 'diet':
        body = <DietForm catId={catFor(action)} edit={action.edit} change={action.change} onDone={close} />;
        break;
      case 'routine':
        body = <RoutineForm catId={catFor(action)} edit={action.edit} onDone={close} />;
        break;
      case 'weight-goal':
        body = <WeightGoalForm cat={action.cat} onDone={close} />;
        break;
      case 'refill':
        body = <RefillForm medication={action.medication} onDone={close} />;
        break;
      case 'expense':
        body = <ExpenseForm catId={catFor(action)} edit={action.edit} onDone={close} />;
        break;
    }
  }
  const meta = action ? titleFor(action) : { title: '' };

  return (
    <ActionsContext.Provider value={open}>
      {children}
      <Dialog open={!!action} onOpenChange={(o) => !o && close()}>
        {action && (
          <DialogContent title={meta.title} description={meta.description} size={meta.size}>
            {body}
          </DialogContent>
        )}
      </Dialog>
    </ActionsContext.Provider>
  );
}
