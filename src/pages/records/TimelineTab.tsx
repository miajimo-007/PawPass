import * as React from 'react';
import { Search, SlidersHorizontal, Stethoscope } from 'lucide-react';
import type { RecordCategory } from '@/db/types';
import type { CatData } from '@/hooks/useData';
import { buildTimeline, filterTimeline, type TimelineItem } from '@/services/records';
import { RECORD_CATEGORIES, options } from '@/lib/labels';
import { useActions } from '@/components/forms/ActionsProvider';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/misc';
import { Field } from '@/components/ui/field';
import { TimelineRow } from '@/components/shared/displays';
import { TimelineDetailDialog } from '@/components/shared/TimelineDetail';

export function TimelineTab({ catId, data }: { catId: string; data: CatData }) {
  const act = useActions();
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<RecordCategory | ''>('');
  const [source, setSource] = React.useState<'all' | 'owner' | 'veterinarian'>('all');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [open, setOpen] = React.useState<TimelineItem | null>(null);

  const all = React.useMemo(() => buildTimeline(data.records, data.vaccinations, data.medications), [data]);
  const items = filterTimeline(all, { query, categories: category ? [category] : undefined, from: from || undefined, to: to || undefined, source });
  const activeFilters = [category, from, to, source !== 'all' ? source : ''].filter(Boolean).length;

  // Group by year for a readable chronological timeline.
  const groups = items.reduce<Record<string, TimelineItem[]>>((acc, i) => {
    const y = i.date.slice(0, 4);
    (acc[y] ??= []).push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" aria-label="Search records" placeholder="Search records" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        <Button variant={activeFilters ? 'secondary' : 'outline'} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} aria-controls="timeline-filters">
          <SlidersHorizontal aria-hidden /> <span className="hidden sm:inline">Filters</span>
          {activeFilters > 0 && <span className="tabular">({activeFilters})</span>}
        </Button>
      </div>
      {showFilters && (
        <Card id="timeline-filters" className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Category" htmlFor="f-cat">
            <Select value={category} onChange={(e) => setCategory(e.target.value as RecordCategory | '')}>
              <option value="">All categories</option>
              {options(RECORD_CATEGORIES).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Source" htmlFor="f-src">
            <Select value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
              <option value="all">All sources</option>
              <option value="veterinarian">Veterinarian-provided</option>
              <option value="owner">Owner-entered</option>
            </Select>
          </Field>
          <Field label="From" htmlFor="f-from">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To" htmlFor="f-to">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => {
                setCategory('');
                setSource('all');
                setFrom('');
                setTo('');
              }}
            >
              Clear filters
            </Button>
          )}
        </Card>
      )}

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Stethoscope}
            title={all.length ? 'No records match' : 'No medical records yet'}
            description={all.length ? 'Try a different search or clear the filters.' : 'Add consultations, lab results, surgeries and more to build a complete history.'}
            action={!all.length && <Button onClick={() => act({ type: 'record', catId })}>Add a record</Button>}
          />
        </Card>
      ) : (
        Object.keys(groups)
          .sort((a, b) => b.localeCompare(a))
          .map((year) => (
            <section key={year} aria-labelledby={`y-${year}`}>
              <h2 id={`y-${year}`} className="mb-2 mt-4 font-sans text-[13px] font-bold tracking-wide text-muted-foreground">
                {year}
              </h2>
              <Card className="divide-y overflow-hidden">
                {groups[year]!.map((i) => (
                  <TimelineRow key={`${i.kind}-${i.id}`} item={i} onOpen={() => setOpen(i)} />
                ))}
              </Card>
            </section>
          ))
      )}
      <p className="text-center text-[12px] text-muted-foreground">
        {items.length} of {all.length} entries
      </p>
      <TimelineDetailDialog item={open} onClose={() => setOpen(null)} />
    </div>
  );
}
