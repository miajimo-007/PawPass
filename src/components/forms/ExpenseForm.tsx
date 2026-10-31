import * as React from 'react';
import { toast } from 'sonner';
import type { ClaimStatus, Expense, ExpenseCategory } from '@/db/types';
import { createExpense, defaultCurrency, updateExpense } from '@/services/expenses';
import { errorMessage } from '@/services/errors';
import { usePrefs } from '@/hooks/useData';
import { todayISO } from '@/lib/dates';
import { CLAIM_STATUS, EXPENSE_CATEGORIES, options } from '@/lib/labels';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field, FormSection } from '@/components/ui/field';
import { CatSelect, ClinicDatalist, DocumentAttachField, SubmitBar, emptyAttach, persistAttachments } from './shared';

export function ExpenseForm({ catId, edit, onDone }: { catId: string; edit?: Expense; onDone: () => void }) {
  const prefs = usePrefs();
  const currency = edit?.currency ?? prefs?.currency ?? defaultCurrency();
  const [saving, setSaving] = React.useState(false);
  const [attach, setAttach] = React.useState(emptyAttach(edit?.documentIds));
  const [v, setV] = React.useState({
    catId: edit?.catId ?? catId,
    date: edit?.date ?? todayISO(),
    category: (edit?.category ?? 'vet') as ExpenseCategory,
    amount: edit ? String(edit.amount) : '',
    description: edit?.description ?? '',
    provider: edit?.provider ?? '',
    claimStatus: (edit?.claimStatus ?? 'none') as ClaimStatus,
    reimbursedAmount: edit?.reimbursedAmount != null ? String(edit.reimbursedAmount) : '',
    notes: edit?.notes ?? '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const amount = Number(v.amount);
    if (!v.amount || !Number.isFinite(amount) || amount <= 0) errs.amount = 'Enter an amount greater than 0';
    if (!v.description.trim()) errs.description = 'Add a short description';
    const reimbursed = v.reimbursedAmount ? Number(v.reimbursedAmount) : undefined;
    if (reimbursed !== undefined && (!Number.isFinite(reimbursed) || reimbursed < 0)) errs.reimbursedAmount = 'Enter a valid amount';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const documentIds = await persistAttachments(v.catId, attach, v.date, 'invoice');
      const input = {
        catId: v.catId,
        date: v.date,
        category: v.category,
        amount: Math.round(amount * 100) / 100,
        currency,
        description: v.description.trim(),
        provider: v.provider.trim() || undefined,
        claimStatus: v.claimStatus,
        reimbursedAmount: v.claimStatus === 'paid' ? reimbursed : undefined,
        notes: v.notes.trim() || undefined,
        documentIds,
      };
      if (edit) await updateExpense(edit.id, input);
      else await createExpense(input);
      toast.success(edit ? 'Cost updated' : 'Cost added');
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <ClinicDatalist />
      <FormSection>
        {!edit && <CatSelect value={v.catId} onChange={set('catId')} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${currency})`} htmlFor="ex-amount" error={errors.amount}>
            <Input type="number" inputMode="decimal" step="0.01" min="0" value={v.amount} onChange={set('amount')} />
          </Field>
          <Field label="Date" htmlFor="ex-date">
            <Input type="date" value={v.date} onChange={set('date')} />
          </Field>
        </div>
        <Field label="Category" htmlFor="ex-cat">
          <Select value={v.category} onChange={set('category')}>
            {options(EXPENSE_CATEGORIES).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="ex-desc" error={errors.description}>
          <Input value={v.description} onChange={set('description')} placeholder="e.g. Annual check-up and vaccines" />
        </Field>
        <Field label="Paid to" htmlFor="ex-provider" optional>
          <Input list="clinic-names" value={v.provider} onChange={set('provider')} />
        </Field>
      </FormSection>
      <FormSection title="Insurance">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Claim" htmlFor="ex-claim">
            <Select value={v.claimStatus} onChange={set('claimStatus')}>
              {options(CLAIM_STATUS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          {v.claimStatus === 'paid' && (
            <Field label={`Reimbursed (${currency})`} htmlFor="ex-reimb" optional error={errors.reimbursedAmount}>
              <Input type="number" inputMode="decimal" step="0.01" min="0" value={v.reimbursedAmount} onChange={set('reimbursedAmount')} />
            </Field>
          )}
        </div>
        <Field label="Notes" htmlFor="ex-notes" optional>
          <Textarea rows={2} value={v.notes} onChange={set('notes')} />
        </Field>
        <DocumentAttachField catId={v.catId} value={attach} onChange={setAttach} label="Invoice or receipt" />
      </FormSection>
      <SubmitBar saving={saving} onCancel={onDone} label={edit ? 'Save changes' : 'Add cost'} />
    </form>
  );
}
