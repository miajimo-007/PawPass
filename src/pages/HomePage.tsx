import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  ClipboardPlus,
  FileUp,
  HardDriveDownload,
  Pill,
  Scale,
  Siren,
  ShieldCheck,
  Stethoscope,
  Syringe,
  ThermometerSun,
} from 'lucide-react';
import { useCatData, useSelectedCat } from '@/hooks/useData';
import { useActions } from '@/components/forms/ActionsProvider';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, PageSkeleton } from '@/components/ui/misc';
import { CatPhoto } from '@/components/shared/CatAvatar';
import { DoseList, TimelineRow, VaccineDueBadge } from '@/components/shared/displays';
import { TimelineDetailDialog } from '@/components/shared/TimelineDetail';
import { WelcomePanel } from '@/components/shared/WelcomePanel';
import { buildTimeline, type TimelineItem } from '@/services/records';
import { dueVaccinations } from '@/services/vaccinations';
import { pastDueAppointments, upcomingAppointments } from '@/services/appointments';
import { latestOf, trendOf } from '@/services/health';
import { daysBetween, formatAge, formatDate, formatDateTime, relativeDays, toISODate } from '@/lib/dates';
import { formatMeasurement } from '@/lib/units';
import { NEUTER_LABELS, SEX_LABELS } from '@/lib/labels';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const QUICK_ACTIONS = [
  { key: 'record', label: 'Medical record', icon: ClipboardPlus },
  { key: 'symptom', label: 'Log symptoms', icon: ThermometerSun },
  { key: 'measurement', label: 'Record weight', icon: Scale },
  { key: 'medication', label: 'Medication', icon: Pill },
  { key: 'vaccination', label: 'Vaccination', icon: Syringe },
  { key: 'appointment', label: 'Appointment', icon: CalendarPlus },
  { key: 'document', label: 'Upload document', icon: FileUp },
] as const;

export function HomePage() {
  const { cat, cats, prefs } = useSelectedCat();
  const data = useCatData(cat?.id);
  const act = useActions();
  const [openItem, setOpenItem] = React.useState<TimelineItem | null>(null);

  if (cats === undefined || cat === undefined) return <PageSkeleton />;
  if (!cat) return <WelcomePanel />;
  if (!data) return <PageSkeleton />;

  const latestWeight = latestOf(data.measurements, 'weight');
  const weightTrend = trendOf(data.measurements, 'weight');
  const activeMeds = data.medications.filter((m) => m.status === 'active');
  const vaccDue = dueVaccinations(data.vaccinations).slice(0, 3);
  const upcoming = upcomingAppointments(data.appointments).slice(0, 3);
  const pastDue = pastDueAppointments(data.appointments);
  const timeline = buildTimeline(data.records, data.vaccinations, data.medications).slice(0, 5);
  const activeConditions = data.diagnoses.filter((d) => d.status !== 'resolved');
  const recentSymptoms = [...data.symptoms]
    .filter((s) => s.severity !== 'none' && daysBetween(new Date(s.observedAt), new Date()) <= 14)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
    .slice(0, 3);
  const backupAgeDays = prefs.lastBackupAt ? daysBetween(new Date(prefs.lastBackupAt), new Date()) : null;
  const needsBackup = backupAgeDays === null || backupAgeDays > 30;

  return (
    <div className="space-y-5">
      <PageHeader title={`${greeting()}${prefs.ownerName ? `, ${prefs.ownerName}` : ''}`} showCatSwitcher />

      {/* Cat hero */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 bg-gradient-to-br from-primary-soft/70 via-card to-card p-4 sm:p-5">
          <CatPhoto cat={cat} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-semibold sm:text-[28px]">{cat.name}</h2>
              {cat.isDemo && <Badge tone="outline">Fictional demo</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[formatAge(cat.birthDate, cat.birthDateEstimated), cat.breed, SEX_LABELS[cat.sex]].filter(Boolean).join(' · ')}
            </p>
            <p className="text-[13px] text-muted-foreground">{NEUTER_LABELS[cat.neuterStatus]}</p>
            <Link to={`/cats/${cat.id}`} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:min-h-0">
              View profile <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px border-t bg-border sm:grid-cols-4">
          <Stat
            label="Latest weight"
            value={latestWeight ? formatMeasurement('weight', latestWeight.value, prefs) : '—'}
            sub={
              latestWeight
                ? `${formatDate(latestWeight.measuredAt)}${weightTrend ? ` · ${weightTrend.delta >= 0 ? '+' : '−'}${formatMeasurement('weight', Math.abs(weightTrend.delta), prefs)}` : ''}`
                : 'Not recorded'
            }
            to="/health"
          />
          <Stat label="Medications" value={String(activeMeds.length)} sub="active" to="/records?tab=medications" />
          <Stat
            label="Next vaccine"
            value={vaccDue[0] ? relativeDays(vaccDue[0].v.nextDueDate!) : '—'}
            sub={vaccDue[0]?.v.vaccine ?? 'None confirmed'}
            tone={vaccDue[0]?.status === 'overdue' ? 'danger' : vaccDue[0]?.status === 'due-soon' ? 'warning' : undefined}
            to="/records?tab=vaccinations"
          />
          <Stat label="Next visit" value={upcoming[0] ? relativeDays(toISODate(new Date(upcoming[0].dateTime))) : '—'} sub={upcoming[0]?.title ?? 'None scheduled'} to="/records?tab=appointments" />
        </div>
      </Card>

      {/* Quick actions */}
      <section aria-labelledby="qa-title">
        <h2 id="qa-title" className="sr-only">
          Quick actions
        </h2>
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-7">
          {QUICK_ACTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => act(key === 'measurement' ? { type: 'measurement', catId: cat.id, measurementType: 'weight' } : { type: key, catId: cat.id })}
              className="flex min-w-[92px] shrink-0 flex-col items-center gap-2 rounded-xl border bg-card px-2 py-3 text-center text-[12.5px] font-semibold shadow-card transition-colors hover:border-primary/40 hover:bg-primary-soft/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              {label}
            </button>
          ))}
        </div>
      </section>

      <Link
        to="/emergency"
        className="flex min-h-11 items-center gap-3 rounded-xl border border-destructive/25 bg-destructive-soft/50 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive-soft"
      >
        <Siren className="h-5 w-5" aria-hidden /> Emergency — warning signs, poisons & vet contacts
        <ChevronRight className="ml-auto h-4 w-4" aria-hidden />
      </Link>

      {needsBackup && (
        <Card className="border-warning/30 bg-warning-soft/50">
          <CardContent className="flex items-center gap-3 pt-4">
            <HardDriveDownload className="h-5 w-5 shrink-0 text-warning" aria-hidden />
            <p className="flex-1 text-sm">
              {backupAgeDays === null ? 'You have not exported a backup yet.' : `Last backup was ${backupAgeDays} days ago.`} Records live only on this device.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/profile/data">Back up</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's medications</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/records?tab=medications">All</Link>
            </Button>
          </CardHeader>
          <div className="pb-2">
            <DoseList catId={cat.id} medications={activeMeds} schedules={data.schedules} compact />
          </div>
          {activeMeds.length > 0 && (
            <p className="border-t px-4 py-2.5 text-[12px] text-muted-foreground">
              Current: {activeMeds.map((m) => `${m.name} (${m.dosage}, ${m.frequency.toLowerCase()})`).join('; ')}
            </p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coming up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            {pastDue.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => act({ type: 'complete-appointment', appointment: a })}
                className="flex w-full items-center gap-3 rounded-lg border border-warning/30 bg-warning-soft/40 p-3 text-left"
              >
                <AlertCircle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-semibold">{a.title}</span>
                  <span className="text-muted-foreground">Was {formatDateTime(a.dateTime)} — mark as completed?</span>
                </span>
              </button>
            ))}
            {upcoming.map((a) => (
              <Link key={a.id} to="/records?tab=appointments" className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info-soft text-info">
                  <CalendarClock className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block truncate font-semibold">{a.title}</span>
                  <span className="text-muted-foreground">
                    {formatDateTime(a.dateTime)}
                    {a.clinic ? ` · ${a.clinic}` : ''}
                  </span>
                </span>
              </Link>
            ))}
            {vaccDue.map(({ v, status }) => (
              <Link key={v.id} to="/records?tab=vaccinations" className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                  <Syringe className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block truncate font-semibold">{v.vaccine}</span>
                  <VaccineDueBadge status={status} date={v.nextDueDate} />
                </span>
              </Link>
            ))}
            {upcoming.length === 0 && vaccDue.length === 0 && pastDue.length === 0 && (
              <EmptyState
                compact
                icon={CalendarClock}
                title="Nothing scheduled"
                description="Upcoming appointments and vet-confirmed vaccine dates appear here."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Important health notes</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to={`/cats/${cat.id}`}>Profile</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-sm">
            <NoteRow label="Allergies" items={data.allergies.map((a) => a.allergen)} empty="No allergies recorded" tone="danger" />
            <NoteRow label="Conditions" items={activeConditions.map((d) => d.name)} empty="No conditions recorded" tone="warning" />
            {recentSymptoms.length > 0 && (
              <NoteRow label="Recent observations" items={recentSymptoms.map((s) => s.description)} empty="" tone="neutral" />
            )}
            {cat.notes && <p className="whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">{cat.notes}</p>}
            <p className="text-[12px] text-muted-foreground">
              Shows only what has been recorded. An empty section does not mean your cat is healthy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent medical activity</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/records">Timeline</Link>
            </Button>
          </CardHeader>
          {timeline.length ? (
            <div className="divide-y pb-1">
              {timeline.map((i) => (
                <TimelineRow key={`${i.kind}-${i.id}`} item={i} onOpen={() => setOpenItem(i)} />
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={Stethoscope}
              title="No medical history yet"
              action={
                <Button size="sm" variant="secondary" onClick={() => act({ type: 'record', catId: cat.id })}>
                  Add the first record
                </Button>
              }
            />
          )}
        </Card>
      </div>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-[12px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Stored on this device only.
      </p>
      <TimelineDetailDialog item={openItem} onClose={() => setOpenItem(null)} />
    </div>
  );
}

function Stat({ label, value, sub, to, tone }: { label: string; value: string; sub: string; to: string; tone?: 'danger' | 'warning' }) {
  return (
    <Link to={to} className="block min-w-0 bg-card px-4 py-3 hover:bg-muted">
      <p className="eyebrow">{label}</p>
      <p className={`mt-1 truncate text-lg font-bold tabular ${tone === 'danger' ? 'text-destructive' : tone === 'warning' ? 'text-warning' : ''}`}>{value}</p>
      <p className="truncate text-[12px] text-muted-foreground">{sub}</p>
    </Link>
  );
}

function NoteRow({ label, items, empty, tone }: { label: string; items: string[]; empty: string; tone: 'danger' | 'warning' | 'neutral' }) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{label}</p>
      {items.length ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((t) => (
            <Badge key={t} tone={tone}>
              {t}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
