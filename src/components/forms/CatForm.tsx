import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Cat } from '@/db/types';
import { catFormSchema, splitList, type CatFormValues } from '@/validation/schemas';
import { createCat, updateCat, type CatInput } from '@/services/cats';
import { addMeasurement } from '@/services/health';
import { updatePrefs } from '@/services/prefs';
import { errorMessage } from '@/services/errors';
import { usePrefs } from '@/hooks/useData';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { birthDateFromAge, todayISO } from '@/lib/dates';
import { displayToKg, kgToDisplay } from '@/lib/units';
import { NEUTER_LABELS, SEX_LABELS, options } from '@/lib/labels';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field, FormSection } from '@/components/ui/field';
import { Segmented } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { CatAvatar } from '@/components/shared/CatAvatar';
import { ClinicDatalist, SubmitBar } from './shared';

/** Downscales a photo so profile pictures don't fill browser storage. Falls back to the original. */
async function preparePhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 900;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function CatForm({ edit, onDone }: { edit?: Cat; onDone: (cat?: Cat) => void }) {
  const prefs = usePrefs();
  const unit = prefs?.weightUnit ?? 'kg';
  const [saving, setSaving] = React.useState(false);
  const [photo, setPhoto] = React.useState<Blob | null | undefined>(edit?.photo ?? null);
  const photoUrl = useObjectUrl(photo);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<CatFormValues>({
    resolver: zodResolver(catFormSchema),
    defaultValues: {
      name: edit?.name ?? '',
      ageMode: edit?.birthDateEstimated ? 'estimate' : 'dob',
      birthDate: edit?.birthDateEstimated ? '' : (edit?.birthDate ?? ''),
      estimatedYears: '',
      breed: edit?.breed ?? '',
      sex: edit?.sex ?? 'unknown',
      color: edit?.color ?? '',
      weight: edit?.weightKg ? kgToDisplay(edit.weightKg, unit).toFixed(2) : '',
      microchip: edit?.microchip ?? '',
      neuterStatus: edit?.neuterStatus ?? 'unknown',
      allergies: '',
      conditions: '',
      primaryVet: edit?.primaryVet ?? '',
      primaryClinic: edit?.primaryClinic ?? '',
      notes: edit?.notes ?? '',
      feedingNotes: edit?.feedingNotes ?? '',
      sitterNotes: edit?.sitterNotes ?? '',
    },
  });
  const { register, handleSubmit, watch, setValue, formState } = form;
  const errors = formState.errors;
  const ageMode = watch('ageMode');

  const onSubmit = handleSubmit(async (v) => {
    setSaving(true);
    try {
      let birthDate: string | undefined = undefined;
      let birthDateEstimated = false;
      if (v.ageMode === 'dob') birthDate = v.birthDate || undefined;
      else if (v.estimatedYears) {
        birthDate = birthDateFromAge(Number(v.estimatedYears));
        birthDateEstimated = true;
      } else if (edit?.birthDateEstimated) {
        birthDate = edit.birthDate;
        birthDateEstimated = true;
      }
      const weightKg = v.weight ? Number(displayToKg(Number(v.weight), unit).toFixed(3)) : undefined;
      const input: CatInput = {
        name: v.name,
        photo: photo ?? undefined,
        photoType: photo?.type,
        birthDate,
        birthDateEstimated,
        breed: v.breed,
        sex: v.sex,
        color: v.color,
        weightKg,
        microchip: v.microchip,
        neuterStatus: v.neuterStatus,
        primaryVet: v.primaryVet,
        primaryClinic: v.primaryClinic,
        notes: v.notes,
        feedingNotes: v.feedingNotes,
        sitterNotes: v.sitterNotes,
      };
      if (edit) {
        await updateCat(edit.id, { ...input, photo: photo ?? undefined });
        if (weightKg && Math.abs((edit.weightKg ?? 0) - weightKg) > 0.0005) {
          await addMeasurement({ catId: edit.id, type: 'weight', value: weightKg, measuredAt: new Date().toISOString(), note: 'Updated from profile' });
        }
        toast.success(`${v.name}'s profile saved`);
        onDone();
      } else {
        const cat = await createCat(input, { allergies: splitList(v.allergies), conditions: splitList(v.conditions) });
        if (weightKg) await addMeasurement({ catId: cat.id, type: 'weight', value: weightKg, measuredAt: new Date().toISOString(), note: 'Weight at profile creation' });
        await updatePrefs({ selectedCatId: cat.id });
        toast.success(`${cat.name} added`);
        onDone(cat);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <ClinicDatalist />
      <div className="flex items-center gap-4">
        <CatAvatar name={watch('name') || '?'} url={photoUrl} size="lg" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Camera aria-hidden /> {photo ? 'Change photo' : 'Add photo'}
          </Button>
          {photo && (
            <Button size="sm" variant="ghost" onClick={() => setPhoto(null)}>
              <Trash2 aria-hidden /> Remove
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setPhoto(await preparePhoto(f));
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <FormSection title="Identity">
        <Field label="Name" htmlFor="cat-name" error={errors.name?.message}>
          <Input autoComplete="off" {...register('name')} />
        </Field>
        <div className="space-y-2">
          <Segmented
            label="How do you know the age?"
            value={ageMode}
            onChange={(v) => setValue('ageMode', v)}
            options={[
              { value: 'dob', label: 'Date of birth' },
              { value: 'estimate', label: 'Estimated age' },
            ]}
            size="sm"
            className="w-fit"
          />
          {ageMode === 'dob' ? (
            <Field label="Date of birth" htmlFor="cat-dob" optional error={errors.birthDate?.message}>
              <Input type="date" max={todayISO()} {...register('birthDate')} />
            </Field>
          ) : (
            <Field
              label="Estimated age (years)"
              htmlFor="cat-est"
              optional
              error={errors.estimatedYears?.message}
              hint={edit?.birthDateEstimated ? 'Leave blank to keep the current estimate.' : undefined}
            >
              <Input type="number" inputMode="decimal" step="0.5" min="0" max="35" {...register('estimatedYears')} />
            </Field>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sex" htmlFor="cat-sex">
            <Select {...register('sex')}>
              {options(SEX_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Neutering" htmlFor="cat-neuter">
            <Select {...register('neuterStatus')}>
              {options(NEUTER_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Breed" htmlFor="cat-breed" optional>
            <Input {...register('breed')} />
          </Field>
          <Field label="Color" htmlFor="cat-color" optional>
            <Input {...register('color')} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Weight (${unit})`} htmlFor="cat-weight" optional error={errors.weight?.message}>
            <Input type="number" inputMode="decimal" step="0.01" min="0" {...register('weight')} />
          </Field>
          <Field label="Microchip" htmlFor="cat-chip" optional error={errors.microchip?.message}>
            <Input inputMode="numeric" autoComplete="off" {...register('microchip')} />
          </Field>
        </div>
      </FormSection>

      {!edit && (
        <FormSection title="Health background">
          <Field label="Known allergies" htmlFor="cat-allergies" optional hint="Separate with commas or new lines.">
            <Textarea rows={2} {...register('allergies')} />
          </Field>
          <Field label="Existing medical conditions" htmlFor="cat-conditions" optional hint="Separate with commas or new lines.">
            <Textarea rows={2} {...register('conditions')} />
          </Field>
        </FormSection>
      )}

      <FormSection title="Care team">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Primary veterinarian" htmlFor="cat-vet" optional>
            <Input {...register('primaryVet')} />
          </Field>
          <Field label="Clinic" htmlFor="cat-clinic" optional>
            <Input list="clinic-names" {...register('primaryClinic')} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="cat-notes" optional>
          <Textarea {...register('notes')} />
        </Field>
      </FormSection>

      <FormSection title="For sitters">
        <Field label="Feeding routine" htmlFor="cat-feeding" optional hint="Food, amounts and times. Shown on the pet sitter card.">
          <Textarea rows={2} {...register('feedingNotes')} />
        </Field>
        <Field label="Care tips" htmlFor="cat-sitter" optional hint="Litter, hiding spots, temperament, things to avoid.">
          <Textarea rows={2} {...register('sitterNotes')} />
        </Field>
      </FormSection>

      <SubmitBar saving={saving} onCancel={() => onDone()} label={edit ? 'Save changes' : 'Add cat'} />
    </form>
  );
}
