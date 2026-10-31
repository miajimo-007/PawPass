import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { MedicalRecord, RecordCategory } from '@/db/types';
import { recordFormSchema, type RecordFormValues } from '@/validation/schemas';
import { createRecord, updateRecord } from '@/services/records';
import { errorMessage } from '@/services/errors';
import { todayISO } from '@/lib/dates';
import { RECORD_CATEGORIES, options } from '@/lib/labels';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field, FormSection } from '@/components/ui/field';
import { Segmented } from '@/components/ui/misc';
import { CatSelect, ClinicDatalist, DocumentAttachField, SubmitBar, emptyAttach, persistAttachments } from './shared';

const categoryDocType = (c: RecordCategory) =>
  c === 'lab' ? 'lab' : c === 'imaging' ? 'imaging' : c === 'vaccination' ? 'vaccination' : c === 'medication' ? 'prescription' : 'report';

export function RecordForm({
  catId,
  edit,
  category,
  onDone,
}: {
  catId: string;
  edit?: MedicalRecord;
  category?: RecordCategory;
  onDone: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [attach, setAttach] = React.useState(emptyAttach(edit?.documentIds));
  const { register, handleSubmit, watch, setValue, formState } = useForm<RecordFormValues>({
    resolver: zodResolver(recordFormSchema),
    defaultValues: {
      catId: edit?.catId ?? catId,
      category: edit?.category ?? category ?? 'consultation',
      title: edit?.title ?? '',
      date: edit?.date ?? todayISO(),
      endDate: edit?.endDate ?? '',
      source: edit?.source ?? (category === 'observation' ? 'owner' : 'veterinarian'),
      clinic: edit?.clinic ?? '',
      veterinarian: edit?.veterinarian ?? '',
      description: edit?.description ?? '',
      findings: edit?.findings ?? '',
      treatment: edit?.treatment ?? '',
      notes: edit?.notes ?? '',
      documentIds: edit?.documentIds ?? [],
    },
  });
  const e = formState.errors;
  const cat = watch('category');
  const source = watch('source');
  const selectedCat = watch('catId');
  const multiDay = cat === 'hospitalization' || cat === 'medication';

  const onSubmit = handleSubmit(async (v) => {
    setSaving(true);
    try {
      const documentIds = await persistAttachments(v.catId, attach, v.date, categoryDocType(v.category));
      const input = { ...v, endDate: v.endDate || undefined, documentIds };
      if (edit) await updateRecord(edit.id, input);
      else await createRecord(input);
      toast.success(edit ? 'Record updated' : 'Record saved');
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
        <Field label="Record type" htmlFor="rec-category">
          <Select {...register('category')}>
            {options(RECORD_CATEGORIES).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title" htmlFor="rec-title" error={e.title?.message}>
          <Input placeholder="e.g. Dental check-up" {...register('title')} />
        </Field>
        <div className={multiDay ? 'grid grid-cols-2 gap-3' : ''}>
          <Field label={multiDay ? 'Start date' : 'Date'} htmlFor="rec-date" error={e.date?.message}>
            <Input type="date" {...register('date')} />
          </Field>
          {multiDay && (
            <Field label="End date" htmlFor="rec-end" optional>
              <Input type="date" {...register('endDate')} />
            </Field>
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold" id="rec-source-label">
            Who provided this information?
          </p>
          <Segmented
            label="Who provided this information?"
            value={source}
            onChange={(v) => setValue('source', v)}
            options={[
              { value: 'veterinarian', label: 'Veterinarian' },
              { value: 'owner', label: 'Me (owner)' },
            ]}
            size="sm"
            className="w-fit"
          />
        </div>
      </FormSection>

      <FormSection title="Clinic">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Clinic" htmlFor="rec-clinic" optional>
            <Input list="clinic-names" {...register('clinic')} />
          </Field>
          <Field label="Veterinarian" htmlFor="rec-vet" optional>
            <Input {...register('veterinarian')} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Details">
        <Field label="Description" htmlFor="rec-desc" optional>
          <Textarea {...register('description')} />
        </Field>
        <Field label={cat === 'lab' || cat === 'imaging' ? 'Results / findings' : 'Findings'} htmlFor="rec-findings" optional>
          <Textarea {...register('findings')} />
        </Field>
        <Field label="Treatment" htmlFor="rec-treatment" optional>
          <Textarea {...register('treatment')} />
        </Field>
        <Field label="Clinical notes" htmlFor="rec-notes" optional>
          <Textarea {...register('notes')} />
        </Field>
        <DocumentAttachField catId={selectedCat} value={attach} onChange={setAttach} />
      </FormSection>

      <SubmitBar saving={saving} onCancel={onDone} label={edit ? 'Save changes' : 'Save record'} />
    </form>
  );
}
