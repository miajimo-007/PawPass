import { Bell, CalendarClock, CalendarPlus, CheckCircle2, MapPin, Pencil, Phone, Trash2, XCircle } from 'lucide-react';
import { buildIcs, type IcsEvent } from '@/lib/ics';
import { downloadBlob } from '@/services/documents';
import { dueVaccinations } from '@/services/vaccinations';
import { routineLabel, routineNextDue } from '@/services/care';
import { toISODate } from '@/lib/dates';
import { toast } from 'sonner';
import type { Appointment } from '@/db/types';
import type { CatData } from '@/hooks/useData';
import { cancelAppointment, deleteAppointment, pastDueAppointments, upcomingAppointments } from '@/services/appointments';
import { formatDateTime } from '@/lib/dates';
import { APPOINTMENT_STATUS } from '@/lib/labels';
import { useActions } from '@/components/forms/ActionsProvider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { EmptyState, SectionHeader } from '@/components/ui/misc';
import { ItemMenu } from '@/components/shared/ItemMenu';

function appointmentEvent(a: Appointment, catName: string): IcsEvent {
  return {
    uid: `${a.id}@pawpass`,
    title: `${catName}: ${a.title}`,
    start: a.dateTime,
    durationMinutes: 60,
    location: [a.clinic, a.clinicAddress].filter(Boolean).join(', ') || undefined,
    description: [a.veterinarian && `Vet: ${a.veterinarian}`, a.clinicPhone && `Phone: ${a.clinicPhone}`, a.preparationNotes].filter(Boolean).join('\n') || undefined,
    alarmMinutes: a.reminderMinutes ?? null,
  };
}

function exportIcs(events: IcsEvent[], fileName: string) {
  downloadBlob(new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' }), fileName);
}

function reminderText(min?: number | null) {
  if (min == null) return null;
  if (min >= 1440) return `${min / 1440} day${min === 1440 ? '' : 's'} before`;
  if (min >= 60) return `${min / 60} hour${min === 60 ? '' : 's'} before`;
  return `${min} min before`;
}

export function AppointmentsTab({ catId, catName, data }: { catId: string; catName: string; data: CatData }) {
  const act = useActions();
  const confirm = useConfirm();
  const upcoming = upcomingAppointments(data.appointments);
  const pastDue = pastDueAppointments(data.appointments);
  const past = data.appointments.filter((a) => a.status !== 'scheduled').sort((a, b) => b.dateTime.localeCompare(a.dateTime));

  const exportAll = () => {
    const today = toISODate(new Date());
    const events: IcsEvent[] = [
      ...upcoming.map((a) => appointmentEvent(a, catName)),
      ...dueVaccinations(data.vaccinations)
        .filter(({ v }) => v.nextDueDate! >= today)
        .map(({ v }) => ({ uid: `${v.id}-due@pawpass`, title: `${catName}: ${v.vaccine} due (vet-confirmed)`, start: v.nextDueDate!, alarmMinutes: 24 * 60 })),
      ...data.routines
        .filter((r) => routineNextDue(r) >= today)
        .map((r) => ({ uid: `${r.id}-${routineNextDue(r)}@pawpass`, title: `${catName}: ${routineLabel(r)}`, start: routineNextDue(r) })),
    ];
    if (!events.length) {
      toast.info('Nothing upcoming to add to your calendar');
      return;
    }
    exportIcs(events, `pawpass-${catName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-calendar.ics`);
    toast.success(`${events.length} event${events.length === 1 ? '' : 's'} exported — open the file to add them to your calendar`);
  };

  if (!data.appointments.length) {
    return (
      <Card>
        <EmptyState
          icon={CalendarClock}
          title="No appointments"
          description="Schedule vet visits with preparation notes and a reminder."
          action={<Button onClick={() => act({ type: 'appointment', catId })}>New appointment</Button>}
        />
      </Card>
    );
  }

  const row = (a: Appointment) => {
    const items = [
      { label: 'Edit', icon: Pencil, onSelect: () => act({ type: 'appointment', edit: a }) },
      ...(a.status === 'scheduled'
        ? [{ label: 'Add to calendar', icon: CalendarPlus, onSelect: () => exportIcs([appointmentEvent(a, catName)], 'pawpass-appointment.ics') }]
        : []),
      ...(a.status === 'scheduled'
        ? [
            { label: 'Mark completed', icon: CheckCircle2, onSelect: () => act({ type: 'complete-appointment', appointment: a }) },
            {
              label: 'Cancel appointment',
              icon: XCircle,
              onSelect: async () => {
                if (await confirm({ title: 'Cancel this appointment?', description: 'It will be kept in your history as cancelled.', confirmLabel: 'Cancel appointment' })) {
                  await cancelAppointment(a.id);
                  toast.success('Appointment cancelled');
                }
              },
            },
          ]
        : []),
      {
        label: 'Delete',
        icon: Trash2,
        destructive: true,
        onSelect: async () => {
          if (await confirm({ title: 'Delete appointment?', description: 'It will be removed permanently. A linked visit record is kept.', confirmLabel: 'Delete', destructive: true })) {
            await deleteAppointment(a.id);
            toast.success('Appointment deleted');
          }
        },
      },
    ];
    return (
      <div key={a.id} className="flex gap-3 py-3 pl-4 pr-1">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{a.title}</span>
            {a.status !== 'scheduled' && <Badge tone={a.status === 'completed' ? 'success' : 'neutral'}>{APPOINTMENT_STATUS[a.status]}</Badge>}
            {a.linkedRecordId && <Badge tone="primary">Visit recorded</Badge>}
          </p>
          <p className="text-[13px] font-medium">{formatDateTime(a.dateTime)}</p>
          {(a.clinic || a.veterinarian) && <p className="text-[13px] text-muted-foreground">{[a.clinic, a.veterinarian].filter(Boolean).join(' · ')}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {a.clinicAddress && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {a.clinicAddress}
              </span>
            )}
            {a.clinicPhone && (
              <a href={`tel:${a.clinicPhone.replace(/\s/g, '')}`} className="inline-flex min-h-6 items-center gap-1 font-semibold text-primary">
                <Phone className="h-3.5 w-3.5" aria-hidden /> {a.clinicPhone}
              </a>
            )}
            {a.status === 'scheduled' && reminderText(a.reminderMinutes) && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Bell className="h-3.5 w-3.5" aria-hidden /> {reminderText(a.reminderMinutes)}
              </span>
            )}
          </div>
          {a.preparationNotes && <p className="whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-[13px]">{a.preparationNotes}</p>}
        </div>
        <ItemMenu label={`Options for ${a.title}`} items={items} />
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <Button variant="outline" onClick={exportAll} className="w-full sm:w-auto">
        <CalendarPlus aria-hidden /> Add upcoming visits, vaccines & routines to calendar
      </Button>
      {pastDue.length > 0 && (
        <section>
          <SectionHeader title="Needs an update" />
          <Card className="divide-y border-warning/30">
            {pastDue.map((a) => (
              <div key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-[13px] text-muted-foreground">Was scheduled {formatDateTime(a.dateTime)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => act({ type: 'complete-appointment', appointment: a })}>
                    Mark completed
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => cancelAppointment(a.id)}>
                    Cancelled
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}
      <section>
        <SectionHeader title={`Upcoming (${upcoming.length})`} />
        {upcoming.length ? <Card className="divide-y">{upcoming.map(row)}</Card> : <p className="text-sm text-muted-foreground">No upcoming appointments.</p>}
      </section>
      {past.length > 0 && (
        <section>
          <SectionHeader title="Past" />
          <Card className="divide-y">{past.map(row)}</Card>
        </section>
      )}
    </div>
  );
}
