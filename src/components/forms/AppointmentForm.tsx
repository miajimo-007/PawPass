import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { Appointment } from '@/db/types';
import { appointmentFormSchema, type AppointmentFormValues } from '@/validation/schemas';
import { completeAppointment, createAppointment, updateAppointment } from '@/services/appointments';
import { errorMessage } from '@/services/errors';
import { formatDateTime, fromLocalInputValue, toLocalInputValue } from '@/lib/dates';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field, FormSection } from '@/components/ui/field';
import { Switch } from '@/components/ui/misc';
import { CatSelect, ClinicDatalist, SubmitBar } from './shared';

const REMINDER_OPTIONS = [
  { value: 'none', label: 'No reminder' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
  { value: '1440', label: '1 day before' },
  { value: '2880', label: '2 days before' },
];

function defaultDateTime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toLocalInputValue(d.toISOString());
}

export function AppointmentForm({ catId, edit, onDone }: { catId: string; edit?: Appointment; onDone: () => void }) {
  const [saving, setSaving] = React.useState(false);
  const { register, handleSubmit, formState } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      catId: edit?.catId ?? catId,
      title: edit?.title ?? '',
      dateTime: edit ? toLocalInputValue(edit.dateTime) : defaultDateTime(),
      clinic: edit?.clinic ?? '',
      clinicAddress: edit?.clinicAddress ?? '',
      clinicPhone: edit?.clinicPhone ?? '',
      veterinarian: edit?.veterinarian ?? '',
      preparationNotes: edit?.preparationNotes ?? '',
      reminderMinutes: edit ? (edit.reminderMinutes == null ? 'none' : String(edit.reminderMinutes)) : '1440',
      status: edit?.status ?? 'scheduled',
    },
  });
  const e = formState.errors;

  const onSubmit = handleSubmit(async (v) => {
    setSaving(true);
    try {
      const input = {
        ...v,
        dateTime: fromLocalInputValue(v.dateTime),
        reminderMinutes: v.reminderMinutes === 'none' ? null : Number(v.reminderMinutes),
      };
      if (edit) await updateAppointment(edit.id, input);
      else await createAppointment(input);
      toast.success(edit ? 'Appointment updated' : 'Appointment scheduled');
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <ClinicDatalist />
      <FormSection>
        {!edit && <CatSelect {...register('catId')} error={e.catId?.message} />}
        <Field label="Reason for visit" htmlFor="apt-title" error={e.title?.message}>
          <Input placeholder="e.g. Annual check-up" {...register('title')} />
        </Field>
        <Field label="Date and time" htmlFor="apt-dt" error={e.dateTime?.message}>
          <Input type="datetime-local" {...register('dateTime')} />
        </Field>
        <Field label="Reminder" htmlFor="apt-reminder" hint="Shown while PAWPASS is open.">
          <Select {...register('reminderMinutes')}>
            {REMINDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        {edit && (
          <Field label="Status" htmlFor="apt-status">
            <Select {...register('status')}>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
        )}
      </FormSection>
      <FormSection title="Clinic">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Clinic" htmlFor="apt-clinic" optional>
            <Input list="clinic-names" {...register('clinic')} />
          </Field>
          <Field label="Veterinarian" htmlFor="apt-vet" optional>
            <Input {...register('veterinarian')} />
          </Field>
          <Field label="Address" htmlFor="apt-addr" optional>
            <Input autoComplete="street-address" {...register('clinicAddress')} />
          </Field>
          <Field label="Phone" htmlFor="apt-phone" optional>
            <Input type="tel" autoComplete="tel" {...register('clinicPhone')} />
          </Field>
        </div>
        <Field label="Preparation notes" htmlFor="apt-prep" optional hint="Fasting, samples or documents to bring.">
          <Textarea {...register('preparationNotes')} />
        </Field>
      </FormSection>
      <SubmitBar saving={saving} onCancel={onDone} label={edit ? 'Save changes' : 'Schedule'} />
    </form>
  );
}

/** Marks an appointment completed and optionally creates a linked visit record. */
export function CompleteAppointmentForm({ appointment, onDone }: { appointment: Appointment; onDone: () => void }) {
  const [saving, setSaving] = React.useState(false);
  const [createVisit, setCreateVisit] = React.useState(true);
  const [findings, setFindings] = React.useState('');
  const [treatment, setTreatment] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      await completeAppointment(appointment.id, createVisit ? { findings, treatment, notes } : undefined);
      toast.success(createVisit ? 'Visit completed and added to the medical record' : 'Appointment marked completed');
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-lg border bg-card p-3.5 text-sm">
        <p className="font-semibold">{appointment.title}</p>
        <p className="text-muted-foreground">
          {formatDateTime(appointment.dateTime)}
          {appointment.clinic ? ` · ${appointment.clinic}` : ''}
        </p>
      </div>
      <Switch
        id="complete-visit"
        checked={createVisit}
        onChange={setCreateVisit}
        label="Add a visit record"
        description="Creates a consultation entry on the medical timeline, linked to this appointment."
      />
      {createVisit && (
        <FormSection>
          <Field label="What the vet found" htmlFor="cv-findings" optional>
            <Textarea value={findings} onChange={(e) => setFindings(e.target.value)} />
          </Field>
          <Field label="Treatment or plan" htmlFor="cv-treatment" optional>
            <Textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} />
          </Field>
          <Field label="Notes" htmlFor="cv-notes" optional>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </FormSection>
      )}
      <SubmitBar saving={saving} onCancel={onDone} label="Mark completed" />
    </form>
  );
}
