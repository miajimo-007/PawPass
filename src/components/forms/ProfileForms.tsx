import * as React from 'react';
import { toast } from 'sonner';
import type { AllergySeverity, ConditionStatus } from '@/db/types';
import { addAllergy, addCondition } from '@/services/cats';
import { errorMessage } from '@/services/errors';
import { ALLERGY_SEVERITY, CONDITION_STATUS, options } from '@/lib/labels';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field, FormSection } from '@/components/ui/field';
import { SubmitBar } from './shared';

export function AllergyForm({ catId, onDone }: { catId: string; onDone: () => void }) {
  const [allergen, setAllergen] = React.useState('');
  const [reaction, setReaction] = React.useState('');
  const [severity, setSeverity] = React.useState<AllergySeverity>('unknown');
  const [error, setError] = React.useState<string>();
  const [saving, setSaving] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allergen.trim()) return setError('Allergen is required');
    setSaving(true);
    try {
      await addAllergy(catId, { allergen: allergen.trim(), reaction: reaction.trim() || undefined, severity });
      toast.success('Allergy recorded');
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <FormSection>
        <Field label="Allergen" htmlFor="al-name" error={error}>
          <Input value={allergen} onChange={(e) => setAllergen(e.target.value)} placeholder="e.g. Chicken, penicillin" />
        </Field>
        <Field label="Reaction" htmlFor="al-reaction" optional>
          <Textarea rows={2} value={reaction} onChange={(e) => setReaction(e.target.value)} />
        </Field>
        <Field label="Severity" htmlFor="al-sev">
          <Select value={severity} onChange={(e) => setSeverity(e.target.value as AllergySeverity)}>
            {options(ALLERGY_SEVERITY).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>
      <SubmitBar saving={saving} onCancel={onDone} label="Save allergy" />
    </form>
  );
}

export function ConditionForm({ catId, onDone }: { catId: string; onDone: () => void }) {
  const [name, setName] = React.useState('');
  const [status, setStatus] = React.useState<ConditionStatus>('active');
  const [diagnosedOn, setDiagnosedOn] = React.useState('');
  const [error, setError] = React.useState<string>();
  const [saving, setSaving] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Condition name is required');
    setSaving(true);
    try {
      await addCondition(catId, { name: name.trim(), status, diagnosedOn: diagnosedOn || undefined });
      toast.success('Condition recorded');
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <FormSection>
        <Field label="Condition" htmlFor="cd-name" error={error} hint="As named by your veterinarian.">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" htmlFor="cd-status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ConditionStatus)}>
              {options(CONDITION_STATUS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Diagnosed on" htmlFor="cd-date" optional>
            <Input type="date" value={diagnosedOn} onChange={(e) => setDiagnosedOn(e.target.value)} />
          </Field>
        </div>
      </FormSection>
      <SubmitBar saving={saving} onCancel={onDone} label="Save condition" />
    </form>
  );
}
