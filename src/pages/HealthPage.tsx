import * as React from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Droplets, Gauge, LineChart, Pencil, Plus, Scale, Target, ThermometerSun, Trash2 } from 'lucide-react';
import { weightGoalDelta } from '@/services/care';
import { TodayCard } from './health/TodayCard';
import { DietCard } from './health/DietCard';
import { RoutinesCard } from './health/RoutinesCard';
import { toast } from 'sonner';
import type { MeasurementType, SymptomCategory } from '@/db/types';
import { useCatData, useSelectedCat } from '@/hooks/useData';
import { deleteMeasurement, deleteSymptom, latestOf, trendOf } from '@/services/health';
import { addDays, formatDate, formatDateTime, formatShortDate } from '@/lib/dates';
import { formatMeasurement, toDisplay, unitLabel } from '@/lib/units';
import { MEASUREMENT_LABELS, SEVERITY_LABELS, SYMPTOM_CATEGORIES, options } from '@/lib/labels';
import { useActions } from '@/components/forms/ActionsProvider';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm';
import { EmptyState, PageSkeleton, Segmented } from '@/components/ui/misc';
import { ItemMenu } from '@/components/shared/ItemMenu';
import { WelcomePanel } from '@/components/shared/WelcomePanel';
import { useTheme } from '@/components/shared/ThemeProvider';

type Range = '30' | '90' | '365' | 'all';
const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '30', label: '30 days' },
  { value: '90', label: '3 months' },
  { value: '365', label: '1 year' },
  { value: 'all', label: 'All' },
];
const METRIC_ICONS: Record<MeasurementType, typeof Scale> = { weight: Scale, water: Droplets, activity: Activity, bcs: Gauge };

export function HealthPage() {
  const { cat, prefs } = useSelectedCat();
  const data = useCatData(cat?.id);
  const act = useActions();
  const confirm = useConfirm();
  const { color } = useTheme();
  const [metric, setMetric] = React.useState<MeasurementType>('weight');
  const [range, setRange] = React.useState<Range>('90');
  const [symptomFilter, setSymptomFilter] = React.useState<SymptomCategory | 'all'>('all');

  if (cat === undefined) return <PageSkeleton />;
  if (!cat) return <WelcomePanel />;
  if (!data) return <PageSkeleton />;

  const from = range === 'all' ? '' : addDays(new Date(), -Number(range)).toISOString();
  const series = data.measurements
    .filter((m) => m.type === metric && (!from || m.measuredAt >= from))
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const chartData = series.map((m) => ({ t: m.measuredAt, v: Number(toDisplay(metric, m.value, prefs).toFixed(2)) }));
  const latest = latestOf(data.measurements, metric);
  const trend = trendOf(data.measurements, metric);
  const unit = unitLabel(metric, prefs);
  const goal = cat.targetWeightKg;
  const goalDelta = weightGoalDelta(latestOf(data.measurements, 'weight')?.value, goal);
  const goalDisplay = goal != null ? Number(toDisplay('weight', goal, prefs).toFixed(2)) : undefined;

  const symptoms = data.symptoms
    .filter((s) => symptomFilter === 'all' || s.category === symptomFilter)
    .filter((s) => !from || s.observedAt >= from)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Health"
        subtitle={`${cat.name} · owner-recorded measurements and observations`}
        showCatSwitcher
        actions={
          <Button onClick={() => act({ type: 'measurement', catId: cat.id, measurementType: metric })} className="hidden sm:inline-flex">
            <Plus aria-hidden /> Record
          </Button>
        }
      />

      <TodayCard catId={cat.id} logs={data.quickLogs} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Measurement" value={metric} onChange={setMetric} options={options(MEASUREMENT_LABELS)} />
        <Segmented label="Date range" value={range} onChange={setRange} options={RANGE_OPTIONS} size="sm" />
      </div>

      <Card>
        <CardHeader>
          <div>
            <p className="eyebrow">{MEASUREMENT_LABELS[metric]}</p>
            <p className="mt-1 text-3xl font-bold tabular">
              {latest ? formatMeasurement(metric, latest.value, prefs) : '—'}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {latest ? `Latest · ${formatDate(latest.measuredAt)}` : 'No measurements yet'}
              {trend && (
                <>
                  {' · '}
                  <span className="font-semibold text-foreground">
                    {trend.delta >= 0 ? '+' : '−'}
                    {formatMeasurement(metric, Math.abs(trend.delta), prefs)}
                  </span>{' '}
                  since {formatShortDate(trend.previous.measuredAt)}
                </>
              )}
            </p>
            {metric === 'weight' && (
              <button
                type="button"
                onClick={() => act({ type: 'weight-goal', cat })}
                className="mt-1.5 inline-flex min-h-8 items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
              >
                <Target className="h-4 w-4" aria-hidden />
                {goal != null
                  ? `Goal ${formatMeasurement('weight', goal, prefs)}${cat.targetWeightSetBy === 'veterinarian' ? ' (vet)' : ''}${
                      goalDelta != null
                        ? Math.abs(goalDelta) < 0.05
                          ? ' · on target'
                          : ` · ${formatMeasurement('weight', Math.abs(goalDelta), prefs)} ${goalDelta > 0 ? 'above' : 'below'}`
                        : ''
                    }`
                  : 'Set a weight goal'}
              </button>
            )}
            {metric === 'bcs' && <p className="mt-1 text-[12.5px] text-muted-foreground">1 = very thin · 5 = ideal · 9 = obese. Ask your vet to show you how to score.</p>}
          </div>
          <Button size="sm" variant="secondary" onClick={() => act({ type: 'measurement', catId: cat.id, measurementType: metric })}>
            <Plus aria-hidden /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {chartData.length >= 2 ? (
            <figure aria-label={`${MEASUREMENT_LABELS[metric]} over time, ${chartData.length} measurements`}>
              <div className="h-56 w-full sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <defs>
                      <linearGradient id="fillMetric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color('--primary')} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={color('--primary')} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={color('--border')} />
                    <XAxis
                      dataKey="t"
                      tickFormatter={(t: string) => formatShortDate(t)}
                      tick={{ fontSize: 11, fill: color('--muted-foreground') }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      domain={metric === 'bcs' ? [1, 9] : ['auto', 'auto']}
                      tick={{ fontSize: 11, fill: color('--muted-foreground') }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
                    <Tooltip
                      formatter={(v) => [`${v} ${unit}`, MEASUREMENT_LABELS[metric]]}
                      labelFormatter={(t: string) => formatDateTime(t)}
                      contentStyle={{ borderRadius: 10, border: `1px solid ${color('--border')}`, background: color('--card'), color: color('--foreground'), fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="v" stroke={color('--primary')} strokeWidth={2} fill="url(#fillMetric)" dot={{ r: 3, fill: color('--primary') }} activeDot={{ r: 5 }} />
                    {metric === 'weight' && goalDisplay != null && (
                      <ReferenceLine
                        y={goalDisplay}
                        ifOverflow="extendDomain"
                        stroke={color('--muted-foreground')}
                        strokeDasharray="5 4"
                        label={{ value: 'Goal', position: 'insideTopRight', fill: color('--muted-foreground'), fontSize: 11 }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <figcaption className="mt-2 text-[12px] text-muted-foreground">Owner-recorded values in {unit}. Trends are not a diagnosis.</figcaption>
            </figure>
          ) : (
            <EmptyState
              compact
              icon={LineChart}
              title={chartData.length === 1 ? 'One measurement in this range' : 'No measurements in this range'}
              description="Record at least two measurements to see a trend."
            />
          )}
        </CardContent>
        {series.length > 0 && (
          <ul className="divide-y border-t">
            {[...series].reverse().slice(0, 12).map((m) => {
              const Icon = METRIC_ICONS[m.type];
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-1.5">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="w-24 font-semibold tabular">{formatMeasurement(m.type, m.value, prefs)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                    {formatDateTime(m.measuredAt)}
                    {m.note ? ` · ${m.note}` : ''}
                  </span>
                  <ItemMenu
                    label={`Options for ${formatMeasurement(m.type, m.value, prefs)} on ${formatDate(m.measuredAt)}`}
                    items={[
                      { label: 'Edit', icon: Pencil, onSelect: () => act({ type: 'measurement', edit: m }) },
                      {
                        label: 'Delete',
                        icon: Trash2,
                        destructive: true,
                        onSelect: async () => {
                          if (await confirm({ title: 'Delete measurement?', description: 'This value will be removed permanently.', confirmLabel: 'Delete', destructive: true })) {
                            await deleteMeasurement(m.id);
                            toast.success('Measurement deleted');
                          }
                        },
                      },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <DietCard catId={cat.id} diets={data.diets} />

      <RoutinesCard catId={cat.id} routines={data.routines} />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Observations & symptoms</CardTitle>
            <p className="text-[13px] text-muted-foreground">Appetite, water, activity, vomiting, stool, urination and behavior notes.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => act({ type: 'symptom', catId: cat.id })}>
            <Plus aria-hidden /> Log
          </Button>
        </CardHeader>
        <CardContent className="pt-3">
          <Select
            aria-label="Filter observations by type"
            className="mb-3 h-10 w-full sm:w-60"
            value={symptomFilter}
            onChange={(e) => setSymptomFilter(e.target.value as SymptomCategory | 'all')}
          >
            <option value="all">All observations</option>
            {options(SYMPTOM_CATEGORIES).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          {symptoms.length ? (
            <ul className="-mx-4 divide-y border-t sm:-mx-5">
              {symptoms.map((s) => (
                <li key={s.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                  <ThermometerSun className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{s.description}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {SYMPTOM_CATEGORIES[s.category]} · {formatDateTime(s.observedAt)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone={s.severity === 'severe' ? 'danger' : s.severity === 'moderate' ? 'warning' : 'neutral'}>{SEVERITY_LABELS[s.severity]}</Badge>
                      {s.level && <Badge tone="outline">{s.level === 'decreased' ? 'Less than usual' : s.level === 'increased' ? 'More than usual' : 'Usual'}</Badge>}
                      <Badge tone="outline">Owner observation</Badge>
                    </div>
                    {s.notes && <p className="mt-1.5 whitespace-pre-wrap text-[13px]">{s.notes}</p>}
                  </div>
                  <ItemMenu
                    label={`Options for observation: ${s.description}`}
                    items={[
                      { label: 'Edit', icon: Pencil, onSelect: () => act({ type: 'symptom', edit: s }) },
                      {
                        label: 'Delete',
                        icon: Trash2,
                        destructive: true,
                        onSelect: async () => {
                          if (await confirm({ title: 'Delete observation?', description: 'This entry will be removed permanently.', confirmLabel: 'Delete', destructive: true })) {
                            await deleteSymptom(s.id);
                            toast.success('Observation deleted');
                          }
                        },
                      },
                    ]}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={ThermometerSun} title="No observations in this range" description="Log anything unusual so you can share accurate details with your vet." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
