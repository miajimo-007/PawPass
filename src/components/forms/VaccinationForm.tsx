import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { Vaccination } from '@/db/types';
import { vaccinationFormSchema, type VaccinationFormValues } from '@/validation/schemas';
import { createVaccination, updateVaccination } from '@/services/vaccinations';
import { errorMessage } from '@/services/errors';
import { todayISO } from '@/lib/dates';
import { Input, Textarea } from '@/components/ui/input';
import { Field, FormSection } from '@/components/ui/field';
import { CatSelect, ClinicDatalist, DocumentAttachField, SubmitBar, emptyAttach, persistAttachments } from './shared';

export function VaccinationForm({ catId, edit, onDone }: { catId: string; edit?: Vaccination; onDone: () => void }) {
  const [saving, setSaving] = React.useState(false);
  const [attach, setAttach] = React.useState(emptyAttach(edit?.documentIds));
  const { register, handleSubmit, watch, formState } = useForm<VaccinationFormValues>({
    resolver: zodResolver(vaccinationFormSchema),
    defaultValues: {
      catId: edit?.catId ?? catId,
      vaccine: edit?.vaccine ?? '',
      dateGiven: edit?.dateGiven ?? todayISO(),
      clinic: edit?.clinic ?? '',
      veterinarian: edit?.veterinarian ?? '',
      batchNumber: edit?.batchNumber ?? '',
      nextDueDate: edit?.nextDueDate ?? '',
      notes: edit?.notes ?? '',
      documentIds: edit?.documentIds ?? [],
    },
  });
  const e = formState.errors;
  const selectedCat = watch('catId');

  const onSubmit = handleSubmit(async (v) => {
    setSaving(true);
    try {
      const documentIds = await persistAttachments(v.catId, attach, v.dateGiven, 'vaccination');
      const input = { ...v, nextDueDate: v.nextDueDate || undefined, documentIds };
      if (edit) await updateVaccination(edit.id, input);
      else await createVaccination(input);
      toast.success(edit ? 'Vaccination updated' : 'Vaccination recorded');
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
        <Field label="Vaccine" htmlFor="vac-name" error={e.vaccine?.message}>
          <Input placeholder="e.g. FVRCP, Rabies" {...register('vaccine')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date given" htmlFor="vac-date" error={e.dateGiven?.message}>
            <Input type="date" max={todayISO()} {...register('dateGiven')} />
          </Field>
          <Field label="Batch number" htmlFor="vac-batch" optional>
            <Input autoComplete="off" {...register('batchNumber')} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Clinic" htmlFor="vac-clinic" optional>
            <Input list="clinic-names" {...register('clinic')} />
          </Field>
          <Field label="Veterinarian" htmlFor="vac-vet" optional>
            <Input {...register('veterinarian')} />
          </Field>
        </div>
        <Field
          label="Next due date"
          htmlFor="vac-next"
          optional
          error={e.nextDueDate?.message}
          hint="Only enter a date your veterinarian confirmed. PAWPASS never calculates vaccine schedules."
        >
          <Input type="date" {...register('nextDueDate')} />
        </Field>
        <Field label="Notes" htmlFor="vac-notes" optional>
          <Textarea {...register('notes')} />
        </Field>
        <DocumentAttachField catId={selectedCat} value={attach} onChange={setAttach} />
      </FormSection>
      <SubmitBar saving={saving} onCancel={onDone} label={edit ? 'Save changes' : 'Save vaccination'} />
    </form>
  );
}
