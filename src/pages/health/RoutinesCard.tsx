import { CalendarCheck2, Check, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Routine } from '@/db/types';
import { deleteRoutine, markRoutineDone, routineLabel, routineStatus, undoRoutineDone } from '@/services/care';
import { formatDate, relativeDays, todayISO } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useActions } from '@/components/forms/ActionsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConfirm } from '@/components/ui/confirm';
import { EmptyState } from '@/components/ui/misc';
import { ItemMenu } from '@/components/shared/ItemMenu';

export function RoutinesCard({ catId, routines }: { catId: string; routines: Routine[] }) {
  const act = useActions();
  const confirm = useConfirm();
  const sorted = routines.map((r) => ({ r, st: routineStatus(r) })).sort((a, b) => a.st.nextDue.localeCompare(b.st.nextDue));

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck2 className="h-4 w-4 text-primary" aria-hidden /> Care routines
          </CardTitle>
          <p className="text-[13px] text-muted-foreground">Grooming, flea/tick, deworming and litter changes.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => act({ type: 'routine', catId })}>
          <Plus aria-hidden /> Add
        </Button>
      </CardHeader>
      <CardContent className="pt-1">
        {sorted.length === 0 ? (
          <EmptyState compact icon={CalendarCheck2} title="No routines yet" description="Add nail trims, flea treatment or deworming to get reminders when they're due." />
        ) : (
          <ul className="divide-y">
            {sorted.map(({ r, st }) => {
              const doneToday = r.doneDates[0] === todayISO();
              return (
                <li key={r.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {routineLabel(r)}
                      {st.state === 'overdue' && <Badge tone="danger">Overdue</Badge>}
                      {st.state === 'due' && <Badge tone="warning">Due today</Badge>}
                      {st.state === 'soon' && <Badge tone="info">Soon</Badge>}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      Every {r.intervalDays} day{r.intervalDays === 1 ? '' : 's'} · next {relativeDays(st.nextDue).toLowerCase()} ({formatDate(st.nextDue)})
                      {r.doneDates[0] ? ` · last ${formatDate(r.doneDates[0])}` : ''}
                    </p>
                    {r.product && <p className="text-[12.5px] text-muted-foreground">{r.product}</p>}
                  </div>
                  {doneToday ? (
                    <Button size="sm" variant="ghost" onClick={() => undoRoutineDone(r.id, todayISO())} aria-label={`Undo ${routineLabel(r)} done today`}>
                      <Undo2 aria-hidden /> Undo
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={st.state === 'ok' ? 'outline' : 'default'}
                      className={cn(st.state === 'ok' && 'text-muted-foreground')}
                      onClick={() => markRoutineDone(r.id).then(() => toast.success(`${routineLabel(r)} done`))}
                    >
                      <Check aria-hidden /> Done
                    </Button>
                  )}
                  <ItemMenu
                    label={`Options for ${routineLabel(r)}`}
                    items={[
                      { label: 'Edit', icon: Pencil, onSelect: () => act({ type: 'routine', edit: r }) },
                      {
                        label: 'Delete',
                        icon: Trash2,
                        destructive: true,
                        onSelect: async () => {
                          if (await confirm({ title: 'Delete routine?', description: `${routineLabel(r)} and its history will be removed.`, confirmLabel: 'Delete', destructive: true })) await deleteRoutine(r.id);
                        },
                      },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
