import * as React from 'react';
import { Check, Circle, Minus, Pill, Stethoscope, User } from 'lucide-react';
import { toast } from 'sonner';
import type { Medication, MedicationSchedule, RecordCategory } from '@/db/types';
import { useMedicationLogs } from '@/hooks/useData';
import { buildDoseSlots, clearDose, recordDose, type DoseSlot } from '@/services/medications';
import type { DueStatus } from '@/services/vaccinations';
import type { TimelineItem } from '@/services/records';
import { errorMessage } from '@/services/errors';
import { addDays, formatDate, formatTime, relativeDays, todayISO } from '@/lib/dates';
import { RECORD_CATEGORIES } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';

export function SourceBadge({ source }: { source: 'owner' | 'veterinarian' }) {
  return source === 'veterinarian' ? (
    <Badge tone="primary">
      <Stethoscope className="h-3 w-3" aria-hidden /> Veterinarian
    </Badge>
  ) : (
    <Badge tone="neutral">
      <User className="h-3 w-3" aria-hidden /> Owner-entered
    </Badge>
  );
}

export function VaccineDueBadge({ status, date }: { status: DueStatus; date?: string }) {
  if (status === 'none' || !date) return null;
  if (status === 'overdue') return <Badge tone="danger">Overdue · {relativeDays(date)}</Badge>;
  if (status === 'due-soon') return <Badge tone="warning">Due {relativeDays(date).toLowerCase()}</Badge>;
  return <Badge tone="outline">Due {formatDate(date)}</Badge>;
}

const CATEGORY_DOT: Partial<Record<RecordCategory, string>> = {
  consultation: 'bg-primary',
  diagnosis: 'bg-destructive',
  lab: 'bg-info',
  imaging: 'bg-info',
  surgery: 'bg-warning',
  hospitalization: 'bg-warning',
  vaccination: 'bg-success',
  medication: 'bg-sage',
  observation: 'bg-muted-foreground',
};

export function TimelineRow({ item, onOpen, catName }: { item: TimelineItem; onOpen?: () => void; catName?: string }) {
  const content = (
    <>
      <span className="mt-1.5 flex flex-col items-center" aria-hidden>
        <span className={cn('h-2.5 w-2.5 rounded-full', CATEGORY_DOT[item.category] ?? 'bg-sage')} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-semibold">{item.title}</span>
          <span className="text-[12.5px] text-muted-foreground tabular">{formatDate(item.date)}</span>
        </span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground">
          {RECORD_CATEGORIES[item.category]}
          {catName ? ` · ${catName}` : ''}
          {item.subtitle ? ` · ${item.subtitle}` : ''}
        </span>
        <span className="mt-1.5 block">
          <SourceBadge source={item.source} />
        </span>
      </span>
    </>
  );
  if (!onOpen) return <div className="flex w-full gap-3 px-4 py-3">{content}</div>;
  return (
    <button type="button" onClick={onOpen} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-muted/60 focus-visible:bg-muted/60">
      {content}
    </button>
  );
}

/** Today's (or another day's) dose checklist. Reminders ≠ administration: only the owner marks a dose given. */
export function DoseList({
  catId,
  medications,
  schedules,
  date = todayISO(),
  compact,
}: {
  catId: string;
  medications: Medication[];
  schedules: MedicationSchedule[];
  date?: string;
  compact?: boolean;
}) {
  const since = React.useMemo(() => addDays(new Date(), -3).toISOString(), []);
  const logs = useMedicationLogs(catId, since) ?? [];
  const slots = buildDoseSlots(date, medications, schedules, logs);
  const now = new Date().toISOString();

  if (slots.length === 0) {
    return (
      <EmptyState
        compact
        icon={Pill}
        title="No doses scheduled today"
        description={medications.some((m) => m.status === 'active') ? 'Add dose times to a medication to get a checklist and reminders.' : undefined}
      />
    );
  }

  const set = async (slot: DoseSlot, status: 'given' | 'skipped') => {
    try {
      if (slot.status === status) await clearDose(slot.medication.id, slot.scheduledFor);
      else await recordDose(slot.medication, slot.scheduledFor, status);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <ul className="divide-y">
      {slots.map((s) => {
        const late = s.status === 'not_recorded' && s.scheduledFor < now;
        return (
          <li key={s.medication.id + s.scheduledFor} className={cn('flex items-center gap-3', compact ? 'px-4 py-2.5' : 'px-4 py-3')}>
            <span className="w-14 shrink-0 text-sm font-semibold tabular">{formatTime(s.scheduledFor)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{s.medication.name}</span>
              <span className="block truncate text-[12.5px] text-muted-foreground">
                {s.medication.dosage}
                {' · '}
                {s.status === 'given' ? (
                  <span className="font-semibold text-success">Given</span>
                ) : s.status === 'skipped' ? (
                  <span className="font-semibold text-warning">Skipped</span>
                ) : late ? (
                  <span className="font-semibold text-destructive">Not recorded</span>
                ) : (
                  'Not recorded'
                )}
              </span>
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => set(s, 'given')}
                aria-pressed={s.status === 'given'}
                aria-label={`Mark ${s.medication.name} at ${formatTime(s.scheduledFor)} as given`}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border transition-colors',
                  s.status === 'given' ? 'border-success bg-success text-white' : 'hover:bg-success-soft',
                )}
              >
                {s.status === 'given' ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
              </button>
              <button
                type="button"
                onClick={() => set(s, 'skipped')}
                aria-pressed={s.status === 'skipped'}
                aria-label={`Mark ${s.medication.name} at ${formatTime(s.scheduledFor)} as skipped`}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border transition-colors',
                  s.status === 'skipped' ? 'border-warning bg-warning text-white' : 'hover:bg-warning-soft',
                )}
              >
                <Minus className="h-5 w-5" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
