import * as React from 'react';
import { toast } from 'sonner';
import type { Cat, Diet, FoodType, Medication, Routine, RoutineKind } from '@/db/types';
import { addDiet, addRoutine, addStock, updateDiet, updateRoutine } from '@/services/care';
import { updateCat } from '@/services/cats';
import { errorMessage } from '@/services/errors';
import { DEFAULT_PREFS } from '@/services/prefs';
import { usePrefs } from '@/hooks/useData';
import { todayISO } from '@/lib/dates';
import { displayToKg, kgToDisplay } from '@/lib/units';
import { FOOD_TYPES, ROUTINE_KINDS, options } from '@/lib/labels';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field, FormSection } from '@/components/ui/field';
import { Segmented, Switch } from '@/components/ui/misc';
import { SubmitBar } from './shared';

function useSubmit(onDone: () => void) {
  const [saving, setSaving] = React.useState(false);
  const run = async (fn: () => Promise<unknown>, message: string) => {
    setSaving(true);
    try {
      await fn();
      toast.success(message);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return { saving, run };
}

// ---- Food ------------------------------------------------------------------------------------

export function DietForm({ catId, edit, change, onDone }: { catId: string; edit?: Diet; change?: boolean; onDone: () => void }) {
  const { saving, run } = useSubmit(onDone);
  const [v, setV] = React.useState({
    foodName: edit?.foodName ?? '',
    brand: edit?.brand ?? '',
    type: (edit?.type ?? 'wet') as FoodType,
    portion: edit?.portion ?? '',
    startDate: edit?.startDate ?? todayISO(),
    endDate: edit?.endDate ?? '',
    reasonForChange: edit?.reasonForChange ?? '',
    notes: edit?.notes ?? '',
  });
  const [error, setError] = React.useState<string>();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.foodName.trim()) return setError('Food name is required');
        if (v.endDate && v.endDate < v.startDate) return setError('End date is before start date');
        const input = { catId: edit?.catId ?? catId, ...v, foodName: v.foodName.trim(), endDate: v.endDate || undefined };
        void run(() => (edit ? updateDiet(edit.id, input) : addDiet(input, { replaceCurrent: change })), edit ? 'Food updated' : change ? 'Food change recorded' : 'Food added');
      }}
    >
      {change && <p className="rounded-lg bg-info-soft px-3.5 py-2.5 text-[13px] text-info">Your current food will be marked as ended the day before this one starts, so you can compare weight and symptoms before and after.</p>}
      <FormSection>
        <Field label="Food" htmlFor="diet-name" error={error}>
          <Input value={v.foodName} onChange={set('foodName')} placeholder="e.g. Chicken in gravy" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand" htmlFor="diet-brand" optional>
            <Input value={v.brand} onChange={set('brand')} />
          </Field>
          <Field label="Type" htmlFor="diet-type">
            <Select value={v.type} onChange={set('type')}>
              {options(FOOD_TYPES).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Portion" htmlFor="diet-portion" optional hint="As advised by your vet or the pack, e.g. “40 g twice a day”.">
          <Input value={v.portion} onChange={set('portion')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Started" htmlFor="diet-start">
            <Input type="date" value={v.startDate} onChange={set('startDate')} />
          </Field>
          {edit && (
            <Field label="Ended" htmlFor="diet-end" optional>
              <Input type="date" value={v.endDate} onChange={set('endDate')} />
            </Field>
          )}
        </div>
        {change && (
          <Field label="Reason for change" htmlFor="diet-reason" optional>
            <Input value={v.reasonForChange} onChange={set('reasonForChange')} placeholder="e.g. Vet recommended renal diet" />
          </Field>
        )}
        <Field label="Notes" htmlFor="diet-notes" optional>
          <Textarea rows={2} value={v.notes} onChange={set('notes')} />
        </Field>
      </FormSection>
      <SubmitBar saving={saving} onCancel={onDone} label={edit ? 'Save changes' : change ? 'Record food change' : 'Add food'} />
    </form>
  );
}

// ---- Care routine -----------------------------------------------------------------------------

export function RoutineForm({ catId, edit, onDone }: { catId: string; edit?: Routine; onDone: () => void }) {
  const { saving, run } = useSubmit(onDone);
  const [kind, setKind] = React.useState<RoutineKind>(edit?.kind ?? 'nails');
  const [title, setTitle] = React.useState(edit?.title ?? ROUTINE_KINDS.nails.label);
  const [interval, setIntervalDays] = React.useState(String(edit?.intervalDays ?? ROUTINE_KINDS.nails.days));
  const [lastDone, setLastDone] = React.useState(edit?.doneDates[0] ?? '');
  const [startDate, setStartDate] = React.useState(edit?.startDate ?? todayISO());
  const [product, setProduct] = React.useState(edit?.product ?? '');
  const [notes, setNotes] = React.useState(edit?.notes ?? '');
  const [reminders, setReminders] = React.useState(edit?.remindersEnabled ?? true);
  const [error, setError] = React.useState<string>();
  const parasite = kind === 'flea' || kind === 'deworm';

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const days = Number(interval);
        if (!Number.isInteger(days) || days < 1 || days > 730) return setError('Enter a number of days between 1 and 730');
        const doneDates = edit ? (lastDone && !edit.doneDates.includes(lastDone) ? [lastDone, ...edit.doneDates].sort((a, b) => b.localeCompare(a)) : edit.doneDates) : lastDone ? [lastDone] : [];
        const input = {
          catId: edit?.catId ?? catId,
          kind,
          title: title.trim() || ROUTINE_KINDS[kind].label,
          intervalDays: days,
          startDate,
          remindersEnabled: reminders,
          product: product.trim() || undefined,
          notes: notes.trim() || undefined,
          doneDates,
        };
        void run(() => (edit ? updateRoutine(edit.id, input) : addRoutine(input)), edit ? 'Routine updated' : 'Routine added');
      }}
    >
      <FormSection>
        <Field label="Routine" htmlFor="rt-kind">
          <Select
            value={kind}
            onChange={(e) => {
              const k = e.target.value as RoutineKind;
              setKind(k);
              if (!edit) {
                setTitle(ROUTINE_KINDS[k].label);
                setIntervalDays(String(ROUTINE_KINDS[k].days));
              }
            }}
          >
            {(Object.keys(ROUTINE_KINDS) as RoutineKind[]).map((k) => (
              <option key={k} value={k}>
                {ROUTINE_KINDS[k].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name" htmlFor="rt-title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field
          label="Repeat every (days)"
          htmlFor="rt-interval"
          error={error}
          hint={parasite ? 'Use the interval on the product label or from your vet — it differs between products.' : undefined}
        >
          <Input type="number" inputMode="numeric" min={1} max={730} value={interval} onChange={(e) => setIntervalDays(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Last done" htmlFor="rt-last" optional>
            <Input type="date" max={todayISO()} value={lastDone} onChange={(e) => setLastDone(e.target.value)} />
          </Field>
          {!lastDone && (
            <Field label="First due" htmlFor="rt-start">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
          )}
        </div>
        {(parasite || product) && (
          <Field label="Product" htmlFor="rt-product" optional>
            <Input value={product} onChange={(e) => setProduct(e.target.value)} />
          </Field>
        )}
        <Field label="Notes" htmlFor="rt-notes" optional>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Switch id="rt-rem" checked={reminders} onChange={setReminders} label="Remind me when due" description="Shown while PAWPASS is open." />
      </FormSection>
      <SubmitBar saving={saving} onCancel={onDone} label={edit ? 'Save changes' : 'Add routine'} />
    </form>
  );
}

// ---- Weight goal --------------------------------------------------------------------------------

export function WeightGoalForm({ cat, onDone }: { cat: Cat; onDone: () => void }) {
  const prefs = usePrefs() ?? DEFAULT_PREFS;
  const { saving, run } = useSubmit(onDone);
  const [value, setValue] = React.useState(cat.targetWeightKg ? kgToDisplay(cat.targetWeightKg, prefs.weightUnit).toFixed(2) : '');
  const [setBy, setSetBy] = React.useState<'veterinarian' | 'owner'>(cat.targetWeightSetBy ?? 'veterinarian');
  const [error, setError] = React.useState<string>();
  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value) {
          void run(() => updateCat(cat.id, { targetWeightKg: undefined, targetWeightSetBy: undefined }), 'Weight goal removed');
          return;
        }
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0 || n > 40) return setError('Enter a realistic weight');
        void run(() => updateCat(cat.id, { targetWeightKg: Number(displayToKg(n, prefs.weightUnit).toFixed(3)), targetWeightSetBy: setBy }), 'Weight goal saved');
      }}
    >
      <p className="rounded-lg bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">
        Ask your vet for a healthy target weight. Cats should lose or gain weight slowly — sudden changes can be dangerous.
      </p>
      <FormSection>
        <Field label={`Target weight (${prefs.weightUnit})`} htmlFor="goal-w" error={error} hint="Leave empty to remove the goal.">
          <Input type="number" inputMode="decimal" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold">Set by</p>
          <Segmented
            label="Who set this goal"
            value={setBy}
            onChange={setSetBy}
            options={[
              { value: 'veterinarian', label: 'Veterinarian' },
              { value: 'owner', label: 'Me' },
            ]}
            size="sm"
            className="w-fit"
          />
        </div>
      </FormSection>
      <SubmitBar saving={saving} onCancel={onDone} label="Save goal" />
    </form>
  );
}

// ---- Refill ------------------------------------------------------------------------------------

export function RefillForm({ medication, onDone }: { medication: Medication; onDone: () => void }) {
  const { saving, run } = useSubmit(onDone);
  const [amount, setAmount] = React.useState('');
  const [error, setError] = React.useState<string>();
  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(amount);
        if (!Number.isInteger(n) || n === 0 || Math.abs(n) > 10000) return setError('Enter a whole number of doses');
        void run(() => addStock(medication.id, n), 'Stock updated');
      }}
    >
      <p className="text-sm text-muted-foreground">
        Currently <strong className="text-foreground">{medication.stockCount ?? 0}</strong> doses in stock. Enter how many you added (use a negative number to correct).
      </p>
      <Field label="Doses added" htmlFor="refill-n" error={error}>
        <Input type="number" inputMode="numeric" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <SubmitBar saving={saving} onCancel={onDone} label="Update stock" />
    </form>
  );
}
