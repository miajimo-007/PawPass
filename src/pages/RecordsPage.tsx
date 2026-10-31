import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCatData, useSelectedCat } from '@/hooks/useData';
import { useActions, type Action } from '@/components/forms/ActionsProvider';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { PageSkeleton, Segmented } from '@/components/ui/misc';
import { WelcomePanel } from '@/components/shared/WelcomePanel';
import { TimelineTab } from './records/TimelineTab';
import { MedicationsTab } from './records/MedicationsTab';
import { VaccinationsTab } from './records/VaccinationsTab';
import { AppointmentsTab } from './records/AppointmentsTab';
import { DocumentsTab } from './records/DocumentsTab';

const TABS = [
  { value: 'timeline', label: 'Timeline' },
  { value: 'medications', label: 'Medications' },
  { value: 'vaccinations', label: 'Vaccines' },
  { value: 'appointments', label: 'Visits' },
  { value: 'documents', label: 'Documents' },
] as const;
type Tab = (typeof TABS)[number]['value'];

const ADD_LABEL: Record<Tab, string> = {
  timeline: 'Add record',
  medications: 'Add medication',
  vaccinations: 'Add vaccination',
  appointments: 'New appointment',
  documents: 'Upload',
};

export function RecordsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.value === params.get('tab'))?.value ?? 'timeline') as Tab;
  const { cat } = useSelectedCat();
  const data = useCatData(cat?.id);
  const act = useActions();

  if (cat === undefined) return <PageSkeleton />;
  if (!cat) return <WelcomePanel />;

  const addAction: Action =
    tab === 'timeline'
      ? { type: 'record', catId: cat.id }
      : tab === 'medications'
        ? { type: 'medication', catId: cat.id }
        : tab === 'vaccinations'
          ? { type: 'vaccination', catId: cat.id }
          : tab === 'appointments'
            ? { type: 'appointment', catId: cat.id }
            : { type: 'document', catId: cat.id };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Records"
        subtitle={`${cat.name}'s medical record`}
        showCatSwitcher
        actions={
          <Button onClick={() => act(addAction)}>
            <Plus aria-hidden /> <span className="hidden sm:inline">{ADD_LABEL[tab]}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        }
      />
      <Segmented
        label="Record section"
        value={tab}
        onChange={(v) => setParams(v === 'timeline' ? {} : { tab: v }, { replace: true })}
        options={TABS.map((t) => ({ value: t.value, label: t.label }))}
        className="-mx-1 w-auto sm:w-fit"
      />
      {!data ? (
        <PageSkeleton />
      ) : tab === 'timeline' ? (
        <TimelineTab catId={cat.id} data={data} />
      ) : tab === 'medications' ? (
        <MedicationsTab catId={cat.id} data={data} />
      ) : tab === 'vaccinations' ? (
        <VaccinationsTab catId={cat.id} data={data} />
      ) : tab === 'appointments' ? (
        <AppointmentsTab catId={cat.id} data={data} />
      ) : (
        <DocumentsTab catId={cat.id} data={data} />
      )}
    </div>
  );
}
