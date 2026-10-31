/** Date helpers. Calendar dates are "YYYY-MM-DD" in the user's local time zone. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parse "YYYY-MM-DD" as a local date (not UTC). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, days: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = parseISODate(toISODate(b)).getTime() - parseISODate(toISODate(a)).getTime();
  return Math.round(ms / 86_400_000);
}

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDate(s?: string | null): string {
  if (!s) return '—';
  const d = s.length === 10 ? parseISODate(s) : new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

export function formatShortDate(s: string): string {
  const d = s.length === 10 ? parseISODate(s) : new Date(s);
  return shortFmt.format(d);
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

/** Converts a full ISO timestamp to the value expected by <input type="datetime-local">. */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(v: string): string {
  return new Date(v).toISOString();
}

/** Human age from a birth date, e.g. "3 yrs 2 mo" or "7 mo". */
export function formatAge(birthDate?: string, estimated?: boolean, now = new Date()): string {
  if (!birthDate) return 'Age unknown';
  const b = parseISODate(birthDate);
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) return 'Age unknown';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const prefix = estimated ? '~' : '';
  if (years === 0) return `${prefix}${Math.max(rem, 0)} mo`;
  if (rem === 0 || estimated) return `${prefix}${years} yr${years === 1 ? '' : 's'}`;
  return `${years} yr${years === 1 ? '' : 's'} ${rem} mo`;
}

/** Birth date approximated from an estimated age in years (+ months). */
export function birthDateFromAge(years: number, months = 0, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  d.setMonth(d.getMonth() - (Math.round(years * 12) + months));
  return toISODate(d);
}

export function relativeDays(dateISO: string, now = new Date()): string {
  const diff = daysBetween(now, parseISODate(dateISO));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0) return `In ${diff} days`;
  return `${-diff} days ago`;
}
