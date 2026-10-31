import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { Measurement, MeasurementType, SymptomLog } from '@/db/types';
import { measurementFormSchema, symptomFormSchema, type MeasurementFormValues, type SymptomFormValues } from '@/validation/schemas';
import { addMeasurement, addSymptom, updateMeasurement, updateSymptom } from '@/services/health';
import { errorMessage } from '@/services/errors';
import { usePrefs } from '@/hooks/useData';
import { DEFAULT_PREFS } from '@/services/prefs';
import { fromDisplay, toDisplay, unitLabel } from '@/lib/units';
import { fromLocalInputValue, toLocalInputValue } from '@/lib/dates';
import { MEASUREMENT_LABELS, SEVERITY_LABELS, SYMPTOM_CATEGORIES, options } from '@/lib/labels';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field, FormSection } from '@/components/ui/field';
import { Segmented } from '@/components/ui/misc';
import { CatSelect, DocumentAttachField, SubmitBar, emptyAttach, persistAttachments } from './shared';

export function MeasurementForm({
  catId,
  edit,
  type,
  onDone,
}: {
  catId: string;
  edit?: Measurement;
  type?: MeasurementType;
  onDone: () => void;
}) {
  const prefs = usePrefs() ?? DEFAULT_PREFS;
  const [saving, setSaving] = React.useState(false);
  const { register, handleSubmit, watch, setValue, formState } = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    defaultValues: {
      catId: edit?.catId ?? catId,
      type: edit?.type ?? type ?? 'weight',
      value: edit ? String(Number(toDisplay(edit.type, edit.value, prefs).toFixed(2))) : '',
      measuredAt: toLocalInputValue(edit?.measuredAt ?? new Date().toISOString()),
      note: edit?.note ?? '',
    },
  });
  const e = formState.errors;
  const t = watch('type');

  const onSubmit = handleSubmit(async (v) => {
    setSaving(true);
    try {
      const input = {
        catId: v.catId,
        type: v.type,
        value: Number(fromDisplay(v.type, Number(v.value), prefs).toFixed(4)),
        measuredAt: fromLocalInputValue(v.measuredAt),
        note: v.note,
      };
      if (edit) await updateMeasurement(edit.id, input);
      else await addMeasurement(input);
      toast.success(`${MEASUREMENT_LABELS[v.type]} saved`);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormSection>
        {!edit && <CatSelect {...register('catId')} error={e.catId?.message} />}
        {!edit && (
          <Segmented
            label="Measurement"
            value={t}
            onChange={(v) => setValue('type', v)}
            options={options(MEASUREMENT_LABELS)}
            size="sm"
            className="w-fit max-w-full"
          />
        )}
        <Field label={`${MEASUREMENT_LABELS[t]} (${unitLabel(t, prefs)})`} htmlFor="ms-value" error={e.value?.message}>
          <Input type="number" inputMode="decimal" step="any" min="0" autoFocus {...register('value')} />
        </Field>
        <Field label="When" htmlFor="ms-at" error={e.measuredAt?.message}>
          <Input type="datetime-local" {...register('measuredAt')} />
        </Field>
        <Field label="Note" htmlFor="ms-note" optional>
          <Input {...register('note')} />
        </Field>
      </FormSection>
      <p className="text-[12.5px] text-muted-foreground">Owner-recorded measurement.</p>
      <SubmitBar saving={saving} onCancel={onDone} />
    </form>
  );
}

const LEVEL_CATEGORIES = new Set(['appetite', 'water', 'activity', 'urination']);

export function SymptomForm({ catId, edit, onDone }: { catId: string; edit?: SymptomLog; onDone: () => void }) {
  const [saving, setSaving] = React.useState(false);
  const [media, setMedia] = React.useState(emptyAttach(edit?.mediaIds));
  const { register, handleSubmit, watch, formState } = useForm<SymptomFormValues>({
    resolver: zodResolver(symptomFormSchema),
    defaultValues: {
      catId: edit?.catId ?? catId,
      category: edit?.category ?? 'symptom',
      description: edit?.description ?? '',
      severity: edit?.severity ?? 'mild',
      level: edit?.level ?? '',
      observedAt: toLocalInputValue(edit?.observedAt ?? new Date().toISOString()),
      notes: edit?.notes ?? '',
    },
  });
  const e = formState.errors;
  const cat = watch('category');
  const selectedCat = watch('catId');

  const onSubmit = handleSubmit(async (v) => {
    setSaving(true);
    try {
      const mediaIds = await persistAttachments(v.catId, media, v.observedAt.slice(0, 10), 'photo');
      const input = {
        mediaIds,
        catId: v.catId,
        category: v.category,
        description: v.description,
        severity: v.severity,
        level: v.level || undefined,
        observedAt: fromLocalInputValue(v.observedAt),
        notes: v.notes,
      };
      if (edit) await updateSymptom(edit.id, input);
      else await addSymptom(input);
      toast.success('Observation logged');
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <p className="rounded-lg bg-muted px-3.5 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
        Observations are your own notes, not a diagnosis. Contact your veterinarian if you are worried — or immediately in an emergency.
      </p>
      <FormSection>
        {!edit && <CatSelect {...register('catId')} error={e.catId?.message} />}
        <Field label="What did you notice?" htmlFor="sy-cat">
          <Select {...register('category')}>
            {options(SYMPTOM_CATEGORIES).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="sy-desc" error={e.description?.message}>
          <Input placeholder="e.g. Ate less than half of breakfast" {...register('description')} />
        </Field>
        <div className={LEVEL_CATEGORIES.has(cat) ? 'grid grid-cols-2 gap-3' : ''}>
          <Field label="How significant?" htmlFor="sy-sev">
            <Select {...register('severity')}>
              {options(SEVERITY_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          {LEVEL_CATEGORIES.has(cat) && (
            <Field label="Compared with usual" htmlFor="sy-level" optional>
              <Select {...register('level')}>
                <option value="">—</option>
                <option value="decreased">Less than usual</option>
                <option value="normal">Usual</option>
                <option value="increased">More than usual</option>
              </Select>
            </Field>
          )}
        </div>
        <Field label="When" htmlFor="sy-at" error={e.observedAt?.message}>
          <Input type="datetime-local" {...register('observedAt')} />
        </Field>
        <Field label="Notes" htmlFor="sy-notes" optional>
          <Textarea {...register('notes')} />
        </Field>
        <DocumentAttachField catId={selectedCat} value={media} onChange={setMedia} label="Photos or video" />
      </FormSection>
      <SubmitBar saving={saving} onCancel={onDone} label="Save observation" />
    </form>
  );
}
