import { db } from '@/db/database';
import type { Expense, ExpenseCategory } from '@/db/types';
import { EXPENSE_CATEGORIES } from '@/lib/labels';
import { nowIso } from '@/lib/utils';
import { audit, clean, stamp } from './base';
import { NotFoundError, safeWrite } from './errors';

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>;

const REGION_CURRENCY: Record<string, string> = {
  SA: 'SAR', AE: 'AED', KW: 'KWD', QA: 'QAR', BH: 'BHD', OM: 'OMR', EG: 'EGP', JO: 'JOD',
  US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD', IN: 'INR', JP: 'JPY', CH: 'CHF',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', IE: 'EUR', BE: 'EUR', AT: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR',
};

/** Best-guess currency from the device locale; the owner can change it in Profile. */
export function defaultCurrency(locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US'): string {
  try {
    const region = new Intl.Locale(locale).maximize().region ?? '';
    return REGION_CURRENCY[region] ?? 'USD';
  } catch {
    return 'USD';
  }
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export async function createExpense(input: ExpenseInput, opts: { isDemo?: boolean } = {}): Promise<Expense> {
  return safeWrite(async () => {
    const row = stamp(clean({ ...input, documentIds: input.documentIds ?? [] }), opts) as Expense;
    await db.expenses.add(row);
    await audit('create', 'expense', `Added cost: ${row.description} (${formatMoney(row.amount, row.currency)})`, row.id, row.catId);
    return row;
  });
}

export async function updateExpense(id: string, input: ExpenseInput) {
  await safeWrite(async () => {
    const existing = await db.expenses.get(id);
    if (!existing) throw new NotFoundError('This cost');
    const next = clean({ ...input, id, createdAt: existing.createdAt, updatedAt: nowIso(), isDemo: existing.isDemo }) as Expense;
    next.documentIds = input.documentIds ?? [];
    await db.expenses.put(next);
  });
}

export async function deleteExpense(id: string) {
  const row = await db.expenses.get(id);
  if (!row) return;
  await db.expenses.delete(id);
  await audit('delete', 'expense', `Deleted cost: ${row.description}`, id, row.catId);
}

export interface CostSummary {
  currency: string;
  total: number;
  reimbursed: number;
  net: number;
  pendingClaims: number;
  byCategory: { category: ExpenseCategory; label: string; total: number }[];
}

/** Totals for one currency over a date range (YYYY-MM-DD, inclusive). */
export function summarizeCosts(expenses: Expense[], currency: string, from?: string, to?: string): CostSummary {
  const rows = expenses.filter((e) => e.currency === currency && (!from || e.date >= from) && (!to || e.date <= to));
  const byCat = new Map<ExpenseCategory, number>();
  let total = 0;
  let reimbursed = 0;
  let pendingClaims = 0;
  for (const e of rows) {
    total += e.amount;
    reimbursed += e.claimStatus === 'paid' ? (e.reimbursedAmount ?? 0) : 0;
    if (e.claimStatus === 'to-submit' || e.claimStatus === 'submitted') pendingClaims++;
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    currency,
    total: round(total),
    reimbursed: round(reimbursed),
    net: round(total - reimbursed),
    pendingClaims,
    byCategory: [...byCat.entries()].map(([category, t]) => ({ category, label: EXPENSE_CATEGORIES[category], total: round(t) })).sort((a, b) => b.total - a.total),
  };
}
