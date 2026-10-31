import * as React from 'react';
import { CheckCircle2, Pencil, Pill, Square, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Medication } from '@/db/types';
import type { CatData } from '@/hooks/useData';
import { useMedicationLogs } from '@/hooks/useData';
import { deleteMedication, setMedicationStatus } from '@/services/medications';
import { addDays, formatDate, formatDateTime } from '@/lib/dates';
import { ROUTE_LABELS } from '@/lib/labels';
import { useActions } from '@/components/forms/ActionsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { EmptyState, SectionHeader } from '@/components/ui/misc';
import { DoseList } from '@/components/shared/displays';
import { ItemMenu } from '@/components/shared/ItemMenu';
import { LinkedDocuments } from '@/components/shared/DocumentViewer';

export function MedicationsTab({ catId, data }: { catId: string; data: CatData }) {
  const act = useActions();
  const confirm = useConfirm();
  const active = data.medications.filter((m) => m.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
  const past = data.medications.filter((m) => m.status !== 'active').sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''));
  const since = React.useMemo(() => addDays(new Date(), -14).toISOString(), []);
  const logs = useMedicationLogs(catId, since) ?? [];

  if (data.medications.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Pill}
          title="No medications recorded"
          description="Add medications exactly as prescribed. You can set dose times to get a daily checklist and in-app reminders."
          action={<Button onClick={() => act({ type: 'medication', catId })}>Add medication</Button>}
        />
      </Card>
    );
  }

  const menu = (m: Medication) => [
    { label: 'Edit', icon: Pencil, onSelect: () => act({ type: 'medication', edit: m }) },
    ...(m.status === 'active'
      ? [{ label: 'Mark completed', icon: CheckCircle2, onSelect: () => setMedicationStatus(m.id, 'completed').then(() => toast.success(`${m.name} marked completed`)) }]
      : [{ label: 'Mark active', icon: Square, onSelect: () => setMedicationStatus(m.id, 'active') }]),
    {
      label: 'Delete',
      icon: Trash2,
      destructive: true,
      onSelect: async () => {
        if (await confirm({ title: `Delete ${m.name}?`, description: 'The medication and its full dose history will be removed permanently.', confirmLabel: 'Delete', destructive: true })) {
          await deleteMedication(m.id);
          toast.success('Medication deleted');
        }
      },
    },
  ];

  const recentLogs = [...logs].sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor)).slice(0, 10);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Today's doses</CardTitle>
            <p className="text-[12.5px] text-muted-foreground">Tap ✓ when given or – when skipped. Reminders never mark a dose as given.</p>
          </div>
        </CardHeader>
        <div className="pb-1 pt-1">
          <DoseList catId={catId} medications={active} schedules={data.schedules} />
        </div>
      </Card>

      <section>
        <SectionHeader title={`Current (${active.length})`} />
        {active.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {active.map((m) => (
              <MedCard key={m.id} m={m} times={data.schedules.find((s) => s.medicationId === m.id)?.times ?? []} menu={menu(m)} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active medications.</p>
        )}
      </section>

      {recentLogs.length > 0 && (
        <section>
          <SectionHeader title="Recent dose log" />
          <Card className="divide-y">
            {recentLogs.map((l) => {
              const m = data.medications.find((x) => x.id === l.medicationId);
              return (
                <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{m?.name ?? 'Medication'}</span>
                    <span className="text-muted-foreground"> · {formatDateTime(l.scheduledFor)}</span>
                    {l.note && <span className="text-muted-foreground"> · {l.note}</span>}
                  </span>
                  <Badge tone={l.status === 'given' ? 'success' : 'warning'}>{l.status === 'given' ? 'Given' : 'Skipped'}</Badge>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <SectionHeader title={`Past (${past.length})`} />
          <div className="grid gap-3 lg:grid-cols-2">
            {past.map((m) => (
              <MedCard key={m.id} m={m} times={[]} menu={menu(m)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MedCard({ m, times, menu }: { m: Medication; times: string[]; menu: React.ComponentProps<typeof ItemMenu>['items'] }) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{m.name}</span>
            {m.status !== 'active' && <Badge>{m.status === 'completed' ? 'Completed' : 'Stopped'}</Badge>}
            {m.prescribedBy ? <Badge tone="primary">Prescribed</Badge> : <Badge>Owner-entered</Badge>}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {m.dosage} · {ROUTE_LABELS[m.route]} · {m.frequency}
          </p>
        </div>
        <ItemMenu label={`Options for ${m.name}`} items={menu} />
      </CardHeader>
      <CardContent className="space-y-2 text-[13px]">
        <p className="text-muted-foreground">
          {formatDate(m.startDate)} – {m.endDate ? formatDate(m.endDate) : 'ongoing'}
          {m.prescribedBy ? ` · ${m.prescribedBy}` : ''}
          {m.condition ? ` · for ${m.condition}` : ''}
        </p>
        {times.length > 0 && <p>Reminder times: <span className="font-semibold tabular">{times.join(', ')}</span></p>}
        {m.instructions && <p className="whitespace-pre-wrap rounded-lg bg-muted px-3 py-2">{m.instructions}</p>}
        <LinkedDocuments ids={m.documentIds ?? []} />
      </CardContent>
    </Card>
  );
}
