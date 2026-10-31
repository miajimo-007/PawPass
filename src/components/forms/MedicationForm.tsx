import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/db/database';
import type { Medication } from '@/db/types';
import { medicationFormSchema, type MedicationFormValues } from '@/validation/schemas';
import { createMedication, updateMedication } from '@/services/medications';
import { errorMessage } from '@/services/errors';
import { todayISO } from '@/lib/dates';
import { ROUTE_LABELS, options } from '@/lib/labels';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field, FormSection } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/misc';
import { CatSelect, DocumentAttachField, SubmitBar, emptyAttach, persistAttachments } from './shared';

export function MedicationForm({ catId, edit, onDone }: { catId: string; edit?: Medication; onDone: () => void }) {
  const [saving, setSaving] = React.useState(false);
  const [attach, setAttach] = React.useState(emptyAttach(edit?.documentIds));
  const [newTime, setNewTime] = React.useState('08:00');
  const { register, handleSubmit, watch, setValue, formState, reset, getValues } = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: {
      catId: edit?.catId ?? catId,
      name: edit?.name ?? '',
      dosage: edit?.dosage ?? '',
      route: edit?.route ?? 'oral',
      frequency: edit?.frequency ?? '',
      startDate: edit?.startDate ?? todayISO(),
      endDate: edit?.endDate ?? '',
      prescribedBy: edit?.prescribedBy ?? '',
      instructions: edit?.instructions ?? '',
      condition: edit?.condition ?? '',
      status: edit?.status ?? 'active',
      reminderTimes: [],
      remindersEnabled: true,
      documentIds: edit?.documentIds ?? [],
      stockCount: edit?.stockCount != null ? String(edit.stockCount) : '',
      refillWarningDays: edit?.refillWarningDays != null ? String(edit.refillWarningDays) : '',
    },
  });

  // Load the existing schedule when editing.
  React.useEffect(() => {
    if (!edit) return;
    void db.medicationSchedules
      .where('medicationId')
      .equals(edit.id)
      .first()
      .then((s) => {
        if (s) reset({ ...getValues(), reminderTimes: s.times, remindersEnabled: s.remindersEnabled });
      });
  }, [edit, reset, getValues]);

  const e = formState.errors;
  const times = watch('reminderTimes');
  const remindersEnabled = watch('remindersEnabled');
  const selectedCat = watch('catId');

  const addTime = () => {
    if (!/^\d{2}:\d{2}$/.test(newTime) || times.includes(newTime)) return;
    setValue('reminderTimes', [...times, newTime].sort(), { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (v) => {
    setSaving(true);
    try {
      const documentIds = await persistAttachments(v.catId, attach, v.startDate, 'prescription');
      const { reminderTimes, remindersEnabled: re, stockCount, refillWarningDays, ...rest } = v;
      const input = {
        ...rest,
        endDate: rest.endDate || undefined,
        documentIds,
        stockCount: stockCount ? Number(stockCount) : undefined,
        refillWarningDays: refillWarningDays ? Number(refillWarningDays) : undefined,
      };
      if (edit) await updateMedication(edit.id, input, { times: reminderTimes, remindersEnabled: re });
      else await createMedication(input, { times: reminderTimes, remindersEnabled: re });
      toast.success(edit ? 'Medication updated' : 'Medication added');
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <p className="rounded-lg bg-info-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-info">
        Enter the dosage and frequency exactly as prescribed by your veterinarian. PAWPASS does not calculate or suggest doses.
      </p>
      <FormSection>
        {!edit && <CatSelect {...register('catId')} error={e.catId?.message} />}
        <Field label="Medication name" htmlFor="med-name" error={e.name?.message}>
          <Input {...register('name')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prescribed dosage" htmlFor="med-dose" error={e.dosage?.message}>
            <Input placeholder="e.g. 1 tablet" {...register('dosage')} />
          </Field>
          <Field label="Route" htmlFor="med-route">
            <Select {...register('route')}>
              {options(ROUTE_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Frequency" htmlFor="med-freq" error={e.frequency?.message}>
          <Input placeholder="e.g. Every 12 hours" {...register('frequency')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" htmlFor="med-start" error={e.startDate?.message}>
            <Input type="date" {...register('startDate')} />
          </Field>
          <Field label="End date" htmlFor="med-end" optional error={e.endDate?.message}>
            <Input type="date" {...register('endDate')} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prescribed by" htmlFor="med-vet" optional>
            <Input {...register('prescribedBy')} />
          </Field>
          <Field label="For condition" htmlFor="med-cond" optional>
            <Input {...register('condition')} />
          </Field>
        </div>
        <Field label="Instructions" htmlFor="med-instr" optional>
          <Textarea {...register('instructions')} />
        </Field>
        {edit && (
          <Field label="Status" htmlFor="med-status">
            <Select {...register('status')}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="stopped">Stopped</option>
            </Select>
          </Field>
        )}
      </FormSection>

      <FormSection title="Dose reminders">
        <p className="text-[13px] text-muted-foreground">
          Reminders appear while PAWPASS is open. A dose is only marked as given when you record it.
        </p>
        <ul className="flex flex-wrap gap-2" aria-label="Reminder times">
          {times.map((t) => (
            <li key={t} className="flex items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1 text-sm font-semibold tabular">
              {t}
              <button
                type="button"
                aria-label={`Remove ${t}`}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-sage-light"
                onClick={() => setValue('reminderTimes', times.filter((x) => x !== t))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {times.length === 0 && <li className="text-sm text-muted-foreground">No dose times set.</li>}
        </ul>
        <div className="flex items-end gap-2">
          <Field label="Add a dose time" htmlFor="med-newtime" className="flex-1">
            <Input type="time" value={newTime} onChange={(ev) => setNewTime(ev.target.value)} />
          </Field>
          <Button variant="secondary" onClick={addTime}>
            <Plus aria-hidden /> Add
          </Button>
        </div>
        <Switch id="med-reminders" checked={remindersEnabled} onChange={(v) => setValue('remindersEnabled', v)} label="Show reminders" />
      </FormSection>

      <FormSection title="Stock & refills">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Doses in stock" htmlFor="med-stock" optional error={e.stockCount?.message} hint="Goes down each time you mark a dose given.">
            <Input type="number" inputMode="numeric" min={0} {...register('stockCount')} />
          </Field>
          <Field label="Warn when days left ≤" htmlFor="med-refill" optional error={e.refillWarningDays?.message} hint="Default 5 days.">
            <Input type="number" inputMode="numeric" min={0} {...register('refillWarningDays')} />
          </Field>
        </div>
      </FormSection>

      <DocumentAttachField catId={selectedCat} value={attach} onChange={setAttach} />
      <SubmitBar saving={saving} onCancel={onDone} label={edit ? 'Save changes' : 'Add medication'} />
    </form>
  );
}
