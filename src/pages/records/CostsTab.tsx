import * as React from 'react';
import { Pencil, Receipt, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Cat, Expense } from '@/db/types';
import type { CatData } from '@/hooks/useData';
import { usePrefs } from '@/hooks/useData';
import { defaultCurrency, deleteExpense, formatMoney, summarizeCosts } from '@/services/expenses';
import { formatDate } from '@/lib/dates';
import { CLAIM_STATUS, EXPENSE_CATEGORIES } from '@/lib/labels';
import { useActions } from '@/components/forms/ActionsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm';
import { EmptyState } from '@/components/ui/misc';
import { ItemMenu } from '@/components/shared/ItemMenu';
import { LinkedDocuments } from '@/components/shared/DocumentViewer';

export function CostsTab({ cat, data }: { cat: Cat; data: CatData }) {
  const act = useActions();
  const confirm = useConfirm();
  const prefs = usePrefs();
  const expenses: Expense[] = data.expenses;
  const years: string[] = [...new Set(expenses.map((e) => e.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
  const thisYear = String(new Date().getFullYear());
  const [year, setYear] = React.useState<string>(years.includes(thisYear) || !years.length ? thisYear : years[0]!);
  const currencies: string[] = [...new Set(expenses.map((e) => e.currency))];
  const currency: string = currencies.includes(prefs?.currency ?? '') ? prefs!.currency! : currencies[0] ?? prefs?.currency ?? defaultCurrency();
  const from = year === 'all' ? undefined : `${year}-01-01`;
  const to = year === 'all' ? undefined : `${year}-12-31`;
  const summary = summarizeCosts(expenses, currency, from, to);
  const rows = expenses.filter((e) => (!from || e.date >= from) && (!to || e.date <= to)).sort((a, b) => b.date.localeCompare(a.date));
  const max = Math.max(1, ...summary.byCategory.map((c) => c.total));

  if (!expenses.length) {
    return (
      <Card>
        <EmptyState
          icon={Receipt}
          title="No costs recorded"
          description="Log vet bills, medication, food and insurance to see what you spend each year and keep track of insurance claims."
          action={<Button onClick={() => act({ type: 'expense', catId: cat.id })}>Add a cost</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="Year" className="h-10 w-36" value={year} onChange={(e) => setYear(e.target.value)}>
          {[...new Set([thisYear, ...years])].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
          <option value="all">All years</option>
        </Select>
        {(cat.insuranceProvider || cat.insurancePolicy) && (
          <Badge tone="primary">
            <ShieldCheck className="h-3 w-3" aria-hidden /> {[cat.insuranceProvider, cat.insurancePolicy].filter(Boolean).join(' · ')}
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-4">
          {[
            { label: 'Spent', value: formatMoney(summary.total, currency) },
            { label: 'Reimbursed', value: formatMoney(summary.reimbursed, currency) },
            { label: 'Net cost', value: formatMoney(summary.net, currency) },
            { label: 'Open claims', value: String(summary.pendingClaims) },
          ].map((x) => (
            <div key={x.label} className="rounded-lg bg-muted p-3">
              <p className="eyebrow">{x.label}</p>
              <p className="mt-1 truncate text-lg font-bold tabular">{x.value}</p>
            </div>
          ))}
        </CardContent>
        {summary.byCategory.length > 0 && (
          <CardContent className="space-y-2 pt-0">
            {summary.byCategory.map((c) => (
              <div key={c.category} className="text-sm">
                <div className="flex justify-between">
                  <span>{c.label}</span>
                  <span className="font-semibold tabular">{formatMoney(c.total, currency)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(c.total / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        )}
        {currencies.length > 1 && <p className="px-5 pb-4 text-[12px] text-muted-foreground">Totals show {currency} only; costs in other currencies are listed below.</p>}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Costs</CardTitle>
        </CardHeader>
        {rows.length ? (
          <ul className="divide-y">
            {rows.map((e) => (
              <li key={e.id} className="flex gap-2 py-3 pl-4 pr-1">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-semibold">{e.description}</span>
                    <span className="font-bold tabular">{formatMoney(e.amount, e.currency)}</span>
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {formatDate(e.date)} · {EXPENSE_CATEGORIES[e.category]}
                    {e.provider ? ` · ${e.provider}` : ''}
                  </p>
                  {e.claimStatus !== 'none' && (
                    <Badge
                      className="mt-1"
                      tone={e.claimStatus === 'paid' ? 'success' : e.claimStatus === 'rejected' ? 'danger' : e.claimStatus === 'to-submit' ? 'warning' : 'info'}
                    >
                      {CLAIM_STATUS[e.claimStatus]}
                      {e.claimStatus === 'paid' && e.reimbursedAmount != null ? ` · ${formatMoney(e.reimbursedAmount, e.currency)}` : ''}
                    </Badge>
                  )}
                  {e.documentIds.length > 0 && (
                    <div className="mt-2">
                      <LinkedDocuments ids={e.documentIds} />
                    </div>
                  )}
                </div>
                <ItemMenu
                  label={`Options for ${e.description}`}
                  items={[
                    { label: 'Edit', icon: Pencil, onSelect: () => act({ type: 'expense', edit: e }) },
                    {
                      label: 'Delete',
                      icon: Trash2,
                      destructive: true,
                      onSelect: async () => {
                        if (await confirm({ title: 'Delete this cost?', description: `${e.description} (${formatMoney(e.amount, e.currency)}) will be removed. Attached invoices are kept.`, confirmLabel: 'Delete', destructive: true })) {
                          await deleteExpense(e.id);
                          toast.success('Cost deleted');
                        }
                      },
                    },
                  ]}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon={Receipt} title={`No costs in ${year}`} />
        )}
      </Card>
    </div>
  );
}
