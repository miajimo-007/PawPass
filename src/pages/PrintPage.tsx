import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Printer } from 'lucide-react';
import { db } from '@/db/database';
import type { Cat, Measurement, Preferences, Vaccination } from '@/db/types';
import { useCatData, usePrefs, type CatData } from '@/hooks/useData';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { DEFAULT_PREFS } from '@/services/prefs';
import { latestOf } from '@/services/health';
import { dueVaccinations } from '@/services/vaccinations';
import { upcomingAppointments } from '@/services/appointments';
import { currentDiets, routineLabel, routineStatus } from '@/services/care';
import { addDays, formatAge, formatDate, formatDateTime } from '@/lib/dates';
import { formatMeasurement, toDisplay, unitLabel, type UnitPrefs } from '@/lib/units';
import { FOOD_TYPES, ALLERGY_SEVERITY, CONDITION_STATUS, NEUTER_LABELS, RECORD_CATEGORIES, ROUTE_LABELS, SEVERITY_LABELS, SEX_LABELS, SYMPTOM_CATEGORIES } from '@/lib/labels';
import { EMERGENCY_SIGNS } from '@/lib/emergency';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/layout/Logo';

export type PrintKind = 'summary' | 'sitter' | 'poster';

const TITLES: Record<PrintKind, string> = {
  summary: 'Vet visit summary',
  sitter: 'Pet sitter card',
  poster: 'Lost cat poster',
};

/**
 * Print-optimised pages. "Print / Save as PDF" uses the browser's print dialog,
 * which on iPhone (Share → Print) and desktop can save a PDF.
 * Always rendered in a light, ink-friendly style regardless of the app theme.
 */
export function PrintPage() {
  const { kind = 'summary', id = '' } = useParams();
  const k = (['summary', 'sitter', 'poster'].includes(kind) ? kind : 'summary') as PrintKind;
  const cat = useLiveQuery(() => db.cats.get(id), [id], null);
  const data = useCatData(id);
  const prefs = usePrefs() ?? DEFAULT_PREFS;
  const clinic = useLiveQuery(
    async () => (cat?.primaryClinic ? db.clinics.where('name').equalsIgnoreCase(cat.primaryClinic).first() : undefined),
    [cat?.primaryClinic],
  );

  React.useEffect(() => {
    if (cat) document.title = `${cat.name} — ${TITLES[k]} — PAWPASS`;
    return () => {
      document.title = 'PAWPASS — Cat Health Record';
    };
  }, [cat, k]);

  if (cat === null || !data) return <p className="p-6 text-sm">Loading…</p>;
  if (!cat) return <p className="p-6 text-sm">This cat profile was not found.</p>;

  return (
    <div className="min-h-dvh bg-neutral-100 text-neutral-900 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-white/95 px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur">
        <Button asChild variant="ghost" size="sm" className="text-neutral-900">
          <Link to={`/cats/${cat.id}`}>
            <ArrowLeft aria-hidden /> Back
          </Link>
        </Button>
        <p className="truncate text-sm font-semibold">{TITLES[k]}</p>
        <Button size="sm" onClick={() => window.print()}>
          <Printer aria-hidden /> Print / PDF
        </Button>
      </div>
      <article className="mx-auto my-4 max-w-[800px] bg-white p-6 shadow-sm sm:p-10 print:my-0 print:max-w-none print:p-0 print:shadow-none">
        {k === 'summary' && <Summary cat={cat} data={data} prefs={prefs} />}
        {k === 'sitter' && <Sitter cat={cat} data={data} prefs={prefs} clinicPhone={clinic?.phone} />}
        {k === 'poster' && <Poster cat={cat} data={data} prefs={prefs} />}
      </article>
      <p className="no-print pb-8 text-center text-xs text-neutral-500">On iPhone: tap Print / PDF, then pinch out on the preview or use Share → Save to Files.</p>
    </div>
  );
}

// ---- building blocks -------------------------------------------------------------------------

function Photo({ cat, className }: { cat: Cat; className: string }) {
  const url = useObjectUrl(cat.photo);
  return url ? (
    <img src={url} alt={`Photo of ${cat.name}`} className={`object-cover ${className}`} />
  ) : (
    <div className={`flex items-center justify-center bg-neutral-200 font-serif text-neutral-500 ${className}`} aria-hidden>
      {cat.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-6 border-b border-neutral-300 pb-1 font-sans text-[13px] font-bold uppercase tracking-wider text-neutral-700 break-after-avoid">{children}</h2>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-500">{children}</p>;
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="text-neutral-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </React.Fragment>
        ))}
    </dl>
  );
}

function Header({ cat, title, prefs, data }: { cat: Cat; title: string; prefs: UnitPrefs; data: CatData }) {
  const w = latestOf(data.measurements, 'weight');
  return (
    <header className="flex items-start gap-5">
      <Photo cat={cat} className="h-24 w-24 shrink-0 rounded-xl text-4xl" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">{title}</p>
        <h1 className="font-display text-3xl font-semibold leading-tight">{cat.name}</h1>
        <Facts
          rows={[
            ['Age', `${formatAge(cat.birthDate, cat.birthDateEstimated)}${cat.birthDate ? ` (born ${formatDate(cat.birthDate)}${cat.birthDateEstimated ? ', estimated' : ''})` : ''}`],
            ['Breed / colour', [cat.breed, cat.color].filter(Boolean).join(' · ')],
            ['Sex', `${SEX_LABELS[cat.sex]} · ${NEUTER_LABELS[cat.neuterStatus]}`],
            ['Weight', w ? `${formatMeasurement('weight', w.value, prefs)} (${formatDate(w.measuredAt)})` : undefined],
            ['Microchip', cat.microchip],
          ]}
        />
      </div>
      <LogoMark className="h-7 w-7 shrink-0" />
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-8 border-t border-neutral-300 pt-2 text-[11px] text-neutral-500">
      Generated by PAWPASS on {formatDateTime(new Date().toISOString())}. Based on records entered by the owner; not a veterinary document.
    </footer>
  );
}

function WeightSpark({ points, prefs }: { points: Measurement[]; prefs: UnitPrefs }) {
  if (points.length < 2) return null;
  const vals = points.map((p) => toDisplay('weight', p.value, prefs));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const W = 300;
  const Hh = 60;
  const d = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${Hh - ((v - min) / span) * (Hh - 8) - 4}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} className="h-16 w-full max-w-sm" role="img" aria-label="Weight trend">
      <polyline points={d} fill="none" stroke="#1f4d3a" strokeWidth="2" strokeLinejoin="round" />
      <text x="0" y="10" fontSize="9" fill="#666">
        {max.toFixed(2)} {unitLabel('weight', prefs)}
      </text>
      <text x="0" y={Hh - 1} fontSize="9" fill="#666">
        {min.toFixed(2)}
      </text>
    </svg>
  );
}

// ---- Vet visit summary --------------------------------------------------------------------------

function Summary({ cat, data, prefs }: { cat: Cat; data: CatData; prefs: UnitPrefs }) {
  const yearAgo = addDays(new Date(), -365).toISOString().slice(0, 10);
  const recentObs = addDays(new Date(), -60).toISOString();
  const meds = data.medications.filter((m) => m.status === 'active');
  const byVaccine = new Map<string, Vaccination>();
  for (const v of data.vaccinations) {
    const key = v.vaccine.trim().toLowerCase();
    const prev = byVaccine.get(key);
    if (!prev || prev.dateGiven < v.dateGiven) byVaccine.set(key, v);
  }
  const latestVaccines = [...byVaccine.values()].sort((a, b) => b.dateGiven.localeCompare(a.dateGiven));
  const due = dueVaccinations(data.vaccinations);
  const weights = data.measurements.filter((m) => m.type === 'weight' && m.measuredAt.slice(0, 10) >= yearAgo).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const records = data.records.filter((r) => r.date >= yearAgo).sort((a, b) => b.date.localeCompare(a.date));
  const obs = data.symptoms.filter((s) => s.observedAt >= recentObs).sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const upcoming = upcomingAppointments(data.appointments).slice(0, 3);

  return (
    <>
      <Header cat={cat} title="Vet visit summary" prefs={prefs} data={data} />

      <div className="grid gap-x-8 sm:grid-cols-2 print:grid-cols-2">
        <section>
          <H>Allergies</H>
          {data.allergies.length ? (
            <ul className="space-y-0.5 text-sm">
              {data.allergies.map((a) => (
                <li key={a.id}>
                  <strong>{a.allergen}</strong> — {ALLERGY_SEVERITY[a.severity]}
                  {a.reaction ? `; ${a.reaction}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>None recorded.</Empty>
          )}
        </section>
        <section>
          <H>Conditions</H>
          {data.diagnoses.length ? (
            <ul className="space-y-0.5 text-sm">
              {data.diagnoses.map((d) => (
                <li key={d.id}>
                  <strong>{d.name}</strong> — {CONDITION_STATUS[d.status]}
                  {d.diagnosedOn ? ` (since ${formatDate(d.diagnosedOn)})` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>None recorded.</Empty>
          )}
        </section>
      </div>

      <H>Current medications</H>
      {meds.length ? (
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] uppercase text-neutral-500">
            <tr>
              <th className="py-1 pr-2 font-semibold">Medication</th>
              <th className="py-1 pr-2 font-semibold">Dosage</th>
              <th className="py-1 pr-2 font-semibold">Frequency</th>
              <th className="py-1 font-semibold">Since</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {meds.map((m) => (
              <tr key={m.id}>
                <td className="py-1 pr-2 font-medium">
                  {m.name}
                  {m.condition ? <span className="block text-xs text-neutral-500">for {m.condition}</span> : null}
                </td>
                <td className="py-1 pr-2">
                  {m.dosage} ({ROUTE_LABELS[m.route].toLowerCase()})
                </td>
                <td className="py-1 pr-2">{m.frequency}</td>
                <td className="py-1">{formatDate(m.startDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>No active medications recorded.</Empty>
      )}

      <H>Vaccinations</H>
      {latestVaccines.length ? (
        <ul className="space-y-0.5 text-sm">
          {latestVaccines.map((v) => {
            const d = due.find((x) => x.v.id === v.id);
            return (
              <li key={v.id}>
                <strong>{v.vaccine}</strong> — last given {formatDate(v.dateGiven)}
                {v.nextDueDate ? `; next due ${formatDate(v.nextDueDate)}${d?.status === 'overdue' ? ' (OVERDUE)' : ''}` : ''}
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>No vaccinations recorded.</Empty>
      )}

      <H>Weight — last 12 months</H>
      {weights.length ? (
        <div className="flex flex-wrap items-center gap-6">
          <WeightSpark points={weights} prefs={prefs} />
          <ul className="text-sm">
            {weights
              .slice(-5)
              .reverse()
              .map((w) => (
                <li key={w.id}>
                  {formatDate(w.measuredAt)}: <strong>{formatMeasurement('weight', w.value, prefs)}</strong>
                </li>
              ))}
          </ul>
        </div>
      ) : (
        <Empty>No weights recorded in the last year.</Empty>
      )}
      {(cat.targetWeightKg != null || latestOf(data.measurements, 'bcs')) && (
        <p className="mt-1 text-sm">
          {cat.targetWeightKg != null && (
            <>
              Target weight: <strong>{formatMeasurement('weight', cat.targetWeightKg, prefs)}</strong> ({cat.targetWeightSetBy === 'veterinarian' ? 'set by vet' : 'set by owner'}).{' '}
            </>
          )}
          {latestOf(data.measurements, 'bcs') && (
            <>
              Body condition: <strong>{latestOf(data.measurements, 'bcs')!.value} / 9</strong> ({formatDate(latestOf(data.measurements, 'bcs')!.measuredAt)}, owner-scored).
            </>
          )}
        </p>
      )}

      <H>Diet</H>
      {data.diets.length ? (
        <ul className="space-y-0.5 text-sm">
          {[...data.diets]
            .sort((a, b) => b.startDate.localeCompare(a.startDate))
            .slice(0, 5)
            .map((d) => (
              <li key={d.id}>
                <strong>{d.foodName}</strong>
                {d.brand ? ` (${d.brand})` : ''} — {FOOD_TYPES[d.type].toLowerCase()}
                {d.portion ? `, ${d.portion}` : ''} · {formatDate(d.startDate)}
                {d.endDate ? ` – ${formatDate(d.endDate)}` : ' – now'}
                {d.reasonForChange && d.endDate ? ` (changed: ${d.reasonForChange})` : ''}
              </li>
            ))}
        </ul>
      ) : (
        <Empty>No diet recorded.</Empty>
      )}

      <H>Owner observations — last 60 days</H>
      {obs.length ? (
        <ul className="space-y-0.5 text-sm">
          {obs.slice(0, 12).map((s) => (
            <li key={s.id}>
              {formatDate(s.observedAt)} · {SYMPTOM_CATEGORIES[s.category]}: {s.description} ({SEVERITY_LABELS[s.severity].toLowerCase()})
            </li>
          ))}
        </ul>
      ) : (
        <Empty>None logged.</Empty>
      )}

      <H>Medical history — last 12 months</H>
      {records.length ? (
        <ul className="space-y-1.5 text-sm">
          {records.map((r) => (
            <li key={r.id} className="break-inside-avoid">
              <strong>{formatDate(r.date)}</strong> · {RECORD_CATEGORIES[r.category]} · {r.title}
              {r.clinic ? ` (${r.clinic})` : ''}
              {r.source === 'owner' ? ' — owner-entered' : ''}
              {r.findings && <span className="block text-neutral-600">{r.findings}</span>}
              {r.treatment && <span className="block text-neutral-600">Treatment: {r.treatment}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No records in the last year.</Empty>
      )}

      {upcoming.length > 0 && (
        <>
          <H>Upcoming appointments</H>
          <ul className="text-sm">
            {upcoming.map((a) => (
              <li key={a.id}>
                {formatDateTime(a.dateTime)} — {a.title}
                {a.clinic ? ` (${a.clinic})` : ''}
              </li>
            ))}
          </ul>
        </>
      )}

      {cat.notes && (
        <>
          <H>Owner notes</H>
          <p className="whitespace-pre-wrap text-sm">{cat.notes}</p>
        </>
      )}
      <Footer />
    </>
  );
}

// ---- Pet sitter card -----------------------------------------------------------------------------

function Sitter({ cat, data, prefs, clinicPhone }: { cat: Cat; data: CatData; prefs: Preferences; clinicPhone?: string }) {
  const meds = data.medications.filter((m) => m.status === 'active');
  const conditions = data.diagnoses.filter((d) => d.status !== 'resolved');
  return (
    <>
      <Header cat={cat} title="Pet sitter card" prefs={prefs} data={data} />

      <H>Contacts</H>
      <Facts
        rows={[
          ['Owner', prefs.ownerName ? `${prefs.ownerName}${prefs.ownerPhone ? ` · ${prefs.ownerPhone}` : ''}` : prefs.ownerPhone],
          ['Emergency contact', [prefs.emergencyContactName, prefs.emergencyContactPhone].filter(Boolean).join(' · ')],
          ['Veterinarian', [cat.primaryVet, cat.primaryClinic].filter(Boolean).join(', ')],
          ['Clinic phone', clinicPhone],
        ]}
      />
      {!prefs.ownerPhone && !prefs.emergencyContactPhone && (
        <p className="no-print mt-1 text-xs text-amber-700">Tip: add your phone and an emergency contact in Profile → Contact details.</p>
      )}

      <H>Feeding</H>
      {currentDiets(data.diets).length > 0 && (
        <ul className="mb-1 text-sm">
          {currentDiets(data.diets).map((d) => (
            <li key={d.id}>
              <strong>{d.foodName}</strong>
              {d.brand ? ` (${d.brand})` : ''}
              {d.portion ? ` — ${d.portion}` : ''}
            </li>
          ))}
        </ul>
      )}
      {cat.feedingNotes ? (
        <p className="whitespace-pre-wrap text-sm">{cat.feedingNotes}</p>
      ) : (
        currentDiets(data.diets).length === 0 && <Empty>No feeding routine entered (edit the cat profile to add one).</Empty>
      )}

      <H>Medications to give</H>
      {meds.length ? (
        <ul className="space-y-2 text-sm">
          {meds.map((m) => {
            const times = data.schedules.find((s) => s.medicationId === m.id)?.times ?? [];
            return (
              <li key={m.id} className="break-inside-avoid rounded border border-neutral-300 p-2">
                <strong>{m.name}</strong> — {m.dosage}, {ROUTE_LABELS[m.route].toLowerCase()}, {m.frequency.toLowerCase()}
                {times.length > 0 && <span className="block">Times: {times.join(', ')}</span>}
                {m.instructions && <span className="block text-neutral-600">{m.instructions}</span>}
                <span className="mt-1 block text-xs text-neutral-500">Given ☐ ☐ ☐ ☐ ☐ ☐ ☐ (tick each dose)</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>No medications.</Empty>
      )}

      <div className="grid gap-x-8 sm:grid-cols-2 print:grid-cols-2">
        <section>
          <H>Allergies</H>
          {data.allergies.length ? <p className="text-sm">{data.allergies.map((a) => a.allergen).join(', ')}</p> : <Empty>None recorded.</Empty>}
        </section>
        <section>
          <H>Health conditions</H>
          {conditions.length ? <p className="text-sm">{conditions.map((d) => d.name).join(', ')}</p> : <Empty>None recorded.</Empty>}
        </section>
      </div>

      {data.routines.length > 0 && (
        <>
          <H>Care tasks while I'm away</H>
          <ul className="space-y-0.5 text-sm">
            {data.routines.map((r) => (
              <li key={r.id}>
                {routineLabel(r)} — next due {formatDate(routineStatus(r).nextDue)}
                {r.product ? ` (${r.product})` : ''}
              </li>
            ))}
          </ul>
        </>
      )}

      <H>Care tips</H>
      {cat.sitterNotes ? <p className="whitespace-pre-wrap text-sm">{cat.sitterNotes}</p> : <Empty>No care tips entered.</Empty>}

      <H>Call the vet straight away if</H>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {EMERGENCY_SIGNS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <Footer />
    </>
  );
}

// ---- Lost cat poster -------------------------------------------------------------------------------

function Poster({ cat, data, prefs }: { cat: Cat; data: CatData; prefs: Preferences }) {
  const needsMeds = data.medications.some((m) => m.status === 'active');
  return (
    <div className="text-center">
      <p className="font-sans text-6xl font-black tracking-tight text-red-700 sm:text-7xl">LOST CAT</p>
      <p className="mt-1 text-lg font-semibold text-neutral-600">Please help {cat.name} come home</p>
      <Photo cat={cat} className="mx-auto mt-5 aspect-square w-full max-w-[460px] rounded-2xl text-8xl" />
      <h1 className="mt-5 font-display text-5xl font-semibold">{cat.name}</h1>
      <p className="mt-2 text-xl">
        {[cat.color, cat.breed, SEX_LABELS[cat.sex].toLowerCase(), formatAge(cat.birthDate, cat.birthDateEstimated)].filter((x) => x && x !== 'Age unknown').join(' · ')}
      </p>
      <div className="mx-auto mt-3 flex max-w-md flex-wrap justify-center gap-2 text-sm font-semibold">
        {cat.microchip && <span className="rounded-full border-2 border-neutral-800 px-3 py-1">Microchipped</span>}
        {needsMeds && <span className="rounded-full border-2 border-red-700 px-3 py-1 text-red-700">Needs daily medication</span>}
        {data.allergies.length > 0 && <span className="rounded-full border-2 border-neutral-800 px-3 py-1">Has allergies — do not feed</span>}
      </div>
      <div className="mx-auto mt-6 max-w-md rounded-2xl bg-neutral-900 px-6 py-5 text-white">
        <p className="text-sm uppercase tracking-widest text-neutral-300">If seen, please call</p>
        <p className="mt-1 text-4xl font-bold tracking-wide">{prefs.ownerPhone || '__________________'}</p>
        {prefs.ownerName && <p className="mt-1 text-lg">{prefs.ownerName}</p>}
      </div>
      {!prefs.ownerPhone && <p className="no-print mt-2 text-xs text-amber-700">Add your phone number in Profile → Contact details to fill this in.</p>}
      <p className="mx-auto mt-4 max-w-md text-sm text-neutral-600">Please do not chase. Check sheds and garages. Any vet can scan for a microchip.</p>
    </div>
  );
}
