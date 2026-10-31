import { describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { buildIcs, escapeText } from '@/lib/ics';
import { decodeFoundTag, encodeFoundTag, foundTagUrl } from '@/lib/foundTag';
import { lifeStageFor } from '@/lib/lifeStage';
import { createExpense, defaultCurrency, summarizeCosts } from '@/services/expenses';
import { addDocument, deleteDocument } from '@/services/documents';
import { addSymptom } from '@/services/health';
import { validateUpload } from '@/validation/schemas';
import { makeCat } from './helpers';

describe('calendar export', () => {
  it('builds a valid iCalendar file with timed and all-day events', () => {
    const ics = buildIcs(
      [
        { uid: 'a@pawpass', title: 'Luna: Check-up, vaccines', start: '2026-03-01T09:30:00.000Z', alarmMinutes: 60, location: 'Oak Clinic' },
        { uid: 'b@pawpass', title: 'Luna: FVRCP due', start: '2026-04-15' },
      ],
      new Date('2026-01-01T00:00:00Z'),
    );
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20260301T093000Z');
    expect(ics).toContain('DTEND:20260301T103000Z');
    expect(ics).toContain('TRIGGER:-PT60M');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260415');
    expect(ics).toContain('DTEND;VALUE=DATE:20260416');
    expect(ics).toContain('SUMMARY:Luna: Check-up\\, vaccines');
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
    expect(escapeText('a;b\nc')).toBe('a\\;b\\nc');
  });
});

describe('collar QR tag', () => {
  it('round-trips the chosen details, including Arabic text', () => {
    const data = { n: 'لونا', p: '+966 50 000 0000', o: 'Mohammed', m: 'Indoor cat', h: 'Needs daily medication' };
    const enc = encodeFoundTag(data);
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeFoundTag(enc)).toEqual(data);
    expect(foundTagUrl(data, 'https://example.github.io/PawPass/')).toBe(`https://example.github.io/PawPass/#/found?d=${enc}`);
  });

  it('rejects broken links', () => {
    expect(decodeFoundTag('not-valid')).toBeNull();
    expect(decodeFoundTag(null)).toBeNull();
    expect(decodeFoundTag(encodeFoundTag({ n: 'X', p: '' }))).toBeNull();
  });
});

describe('life stage', () => {
  it('maps age to life stage', () => {
    const now = new Date(2026, 0, 1);
    expect(lifeStageFor('2025-06-01', now)?.stage).toBe('kitten');
    expect(lifeStageFor('2022-01-01', now)?.stage).toBe('young');
    expect(lifeStageFor('2017-06-01', now)?.stage).toBe('mature');
    expect(lifeStageFor('2010-01-01', now)?.stage).toBe('senior');
    expect(lifeStageFor(undefined, now)).toBeUndefined();
  });
});

describe('costs & insurance', () => {
  it('summarizes spending, reimbursements and open claims per currency and year', async () => {
    const cat = await makeCat();
    const base = { catId: cat.id, documentIds: [] as string[] };
    await createExpense({ ...base, date: '2026-02-01', category: 'vet', amount: 400, currency: 'SAR', description: 'Exam', claimStatus: 'paid', reimbursedAmount: 250 });
    await createExpense({ ...base, date: '2026-03-01', category: 'food', amount: 100.5, currency: 'SAR', description: 'Food', claimStatus: 'none' });
    await createExpense({ ...base, date: '2026-04-01', category: 'vet', amount: 200, currency: 'SAR', description: 'Recheck', claimStatus: 'submitted' });
    await createExpense({ ...base, date: '2025-12-01', category: 'vet', amount: 999, currency: 'SAR', description: 'Last year', claimStatus: 'none' });
    await createExpense({ ...base, date: '2026-05-01', category: 'other', amount: 50, currency: 'USD', description: 'Toy', claimStatus: 'none' });
    const s = summarizeCosts(await db.expenses.toArray(), 'SAR', '2026-01-01', '2026-12-31');
    expect(s).toMatchObject({ total: 700.5, reimbursed: 250, net: 450.5, pendingClaims: 1 });
    expect(s.byCategory[0]).toMatchObject({ category: 'vet', total: 600 });
  });

  it('guesses a currency from the locale', () => {
    expect(defaultCurrency('ar-SA')).toBe('SAR');
    expect(defaultCurrency('en-GB')).toBe('GBP');
    expect(defaultCurrency('en-ZZ')).toBe('USD');
  });
});

describe('photo & video diary', () => {
  it('accepts short videos and unlinks deleted media from observations', async () => {
    expect(validateUpload({ type: 'video/mp4', size: 5_000_000, name: 'limp.mp4' })).toBeNull();
    expect(validateUpload({ type: 'video/quicktime', size: 70 * 1024 * 1024, name: 'long.mov' })).toMatch(/60 MB/);
    const cat = await makeCat();
    const vid = await addDocument(Object.assign(new Blob(['fake'], { type: 'video/mp4' }), { name: 'clip.mp4' }), { catId: cat.id, title: 'Clip', category: 'video', date: '2026-01-01' });
    const obs = await addSymptom({ catId: cat.id, category: 'activity', description: 'Limping', severity: 'mild', observedAt: '2026-01-01T10:00:00.000Z', mediaIds: [vid.id] });
    expect((await db.symptomLogs.get(obs.id))?.mediaIds).toEqual([vid.id]);
    await deleteDocument(vid.id);
    expect((await db.symptomLogs.get(obs.id))?.mediaIds).toEqual([]);
  });
});
