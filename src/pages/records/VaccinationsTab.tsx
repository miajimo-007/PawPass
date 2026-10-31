import * as React from 'react';
import { Pencil, Syringe, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CatData } from '@/hooks/useData';
import { deleteVaccination, dueVaccinations, vaccinationDueStatus } from '@/services/vaccinations';
import { buildTimeline, type TimelineItem } from '@/services/records';
import { formatDate } from '@/lib/dates';
import { useActions } from '@/components/forms/ActionsProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { EmptyState, SectionHeader } from '@/components/ui/misc';
import { VaccineDueBadge } from '@/components/shared/displays';
import { ItemMenu } from '@/components/shared/ItemMenu';
import { TimelineDetailDialog } from '@/components/shared/TimelineDetail';

export function VaccinationsTab({ catId, data }: { catId: string; data: CatData }) {
  const act = useActions();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState<TimelineItem | null>(null);
  const due = dueVaccinations(data.vaccinations);
  const history = [...data.vaccinations].sort((a, b) => b.dateGiven.localeCompare(a.dateGiven));

  if (!history.length) {
    return (
      <Card>
        <EmptyState
          icon={Syringe}
          title="No vaccinations recorded"
          description="Record each vaccine with its batch number. Add a next due date only when your vet has confirmed it."
          action={<Button onClick={() => act({ type: 'vaccination', catId })}>Add vaccination</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <SectionHeader title="Upcoming & overdue" />
        {due.length ? (
          <Card className="divide-y">
            {due.map(({ v, status }) => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${status === 'overdue' ? 'bg-destructive-soft text-destructive' : status === 'due-soon' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'}`}
                >
                  <Syringe className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{v.vaccine}</p>
                  <p className="text-[13px] text-muted-foreground">Vet-confirmed date: {formatDate(v.nextDueDate)}</p>
                </div>
                <VaccineDueBadge status={status} date={v.nextDueDate} />
              </div>
            ))}
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">No vet-confirmed due dates recorded.</p>
        )}
      </section>

      <section>
        <SectionHeader title={`History (${history.length})`} />
        <Card className="divide-y overflow-hidden">
          {history.map((v) => {
            const status = vaccinationDueStatus(v, data.vaccinations);
            return (
              <div key={v.id} className="flex items-center gap-2 pr-1">
                <button
                  type="button"
                  className="min-w-0 flex-1 px-4 py-3 text-left hover:bg-muted/60"
                  onClick={() => setOpen(buildTimeline([], [v], []).at(0) ?? null)}
                >
                  <p className="font-semibold">{v.vaccine}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {formatDate(v.dateGiven)}
                    {v.clinic ? ` · ${v.clinic}` : ''}
                    {v.batchNumber ? ` · Batch ${v.batchNumber}` : ''}
                  </p>
                  {status !== 'none' && (
                    <span className="mt-1 block">
                      <VaccineDueBadge status={status} date={v.nextDueDate} />
                    </span>
                  )}
                </button>
                <ItemMenu
                  label={`Options for ${v.vaccine} on ${formatDate(v.dateGiven)}`}
                  items={[
                    { label: 'Edit', icon: Pencil, onSelect: () => act({ type: 'vaccination', edit: v }) },
                    {
                      label: 'Delete',
                      icon: Trash2,
                      destructive: true,
                      onSelect: async () => {
                        if (await confirm({ title: 'Delete vaccination?', description: `${v.vaccine} (${formatDate(v.dateGiven)}) will be removed permanently.`, confirmLabel: 'Delete', destructive: true })) {
                          await deleteVaccination(v.id);
                          toast.success('Vaccination deleted');
                        }
                      },
                    },
                  ]}
                />
              </div>
            );
          })}
        </Card>
      </section>
      <TimelineDetailDialog item={open} onClose={() => setOpen(null)} />
    </div>
  );
}
