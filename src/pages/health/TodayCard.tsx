import { Droplets, Sparkles, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import type { QuickLog, QuickLogKind } from '@/db/types';
import { addQuickLog, quickLogDailyCounts, undoLastQuickLog } from '@/services/care';
import { errorMessage } from '@/services/errors';
import { parseISODate } from '@/lib/dates';
import { QUICK_LOG_LABELS } from '@/lib/labels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ICON: Record<QuickLogKind, string> = { pee: '💧', poop: '💩', water: '🥣', litter: '🧹' };
const KINDS: QuickLogKind[] = ['pee', 'poop', 'water', 'litter'];

/** One-tap litter box and water counters with a 7-day overview. */
export function TodayCard({ catId, logs }: { catId: string; logs: QuickLog[] }) {
  const week = quickLogDailyCounts(logs, 7);
  const today = week[week.length - 1]!;

  const add = async (k: QuickLogKind) => {
    try {
      await addQuickLog(catId, k);
      if ('vibrate' in navigator) navigator.vibrate?.(10);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const undo = async (k: QuickLogKind) => {
    if (await undoLastQuickLog(catId, k)) toast(`Removed last ${QUICK_LOG_LABELS[k].toLowerCase()} entry`);
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Today
          </CardTitle>
          <p className="text-[13px] text-muted-foreground">Tap to count litter box visits and water refills.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {KINDS.map((k) => (
            <div key={k} className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => add(k)}
                aria-label={`Add ${QUICK_LOG_LABELS[k]} (today: ${today.counts[k]})`}
                className="flex h-[72px] w-full flex-col items-center justify-center rounded-xl border bg-card transition-colors hover:border-primary/40 hover:bg-primary-soft/40 active:scale-[0.98]"
              >
                <span className="text-xl" aria-hidden>
                  {ICON[k]}
                </span>
                <span className="text-lg font-bold tabular leading-none">{today.counts[k]}</span>
              </button>
              <span className="text-center text-[11.5px] font-medium text-muted-foreground">{QUICK_LOG_LABELS[k]}</span>
              {today.counts[k] > 0 && (
                <button type="button" onClick={() => undo(k)} className="flex min-h-8 items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground" aria-label={`Undo last ${QUICK_LOG_LABELS[k]}`}>
                  <Undo2 className="h-3 w-3" aria-hidden /> undo
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-[12px]">
            <caption className="sr-only">Counts for the last 7 days</caption>
            <thead className="text-muted-foreground">
              <tr>
                <th scope="col" className="py-1 text-left font-medium">
                  <Droplets className="inline h-3.5 w-3.5" aria-hidden /> 7 days
                </th>
                {week.map((d) => (
                  <th key={d.date} scope="col" className="px-1 py-1 font-medium">
                    {parseISODate(d.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular">
              {KINDS.map((k) => (
                <tr key={k} className="border-t">
                  <th scope="row" className="py-1 text-left font-medium">
                    {QUICK_LOG_LABELS[k]}
                  </th>
                  {week.map((d) => (
                    <td key={d.date} className={`px-1 py-1 ${d.counts[k] === 0 ? 'text-muted-foreground/60' : 'font-semibold'}`}>
                      {d.counts[k]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
