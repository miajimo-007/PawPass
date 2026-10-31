import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, ExternalLink, FileText, MapPin, Phone, Pill, ShieldAlert } from 'lucide-react';
import { db } from '@/db/database';
import { useCatData, useSelectedCat } from '@/hooks/useData';
import { latestOf } from '@/services/health';
import { formatAge } from '@/lib/dates';
import { formatMeasurement } from '@/lib/units';
import { COMMON_TOXINS, EMERGENCY_SIGNS, EMERGENCY_VET_SEARCH_URL } from '@/lib/emergency';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CatPhoto } from '@/components/shared/CatAvatar';

const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`;

/** One screen with what matters in an emergency. Works offline except the map search. */
export function EmergencyPage() {
  const { cat, prefs } = useSelectedCat();
  const data = useCatData(cat?.id);
  const clinic = useLiveQuery(
    async () => (cat?.primaryClinic ? db.clinics.where('name').equalsIgnoreCase(cat.primaryClinic).first() : undefined),
    [cat?.primaryClinic],
  );
  const meds = data?.medications.filter((m) => m.status === 'active') ?? [];
  const weight = data ? latestOf(data.measurements, 'weight') : undefined;

  return (
    <div className="space-y-5">
      <PageHeader title="Emergency" subtitle="If your cat may be in danger, call a vet now." showCatSwitcher />

      <div className="grid gap-3 sm:grid-cols-2">
        {clinic?.phone ? (
          <Button asChild size="lg" variant="destructive" className="h-14 text-base">
            <a href={tel(clinic.phone)}>
              <Phone aria-hidden /> Call {clinic.name}
            </a>
          </Button>
        ) : (
          <Card className="border-destructive/30 p-4 text-sm">
            <p className="font-semibold">No vet phone saved yet</p>
            <p className="text-muted-foreground">Add the clinic phone when you create an appointment and it will appear here.</p>
          </Card>
        )}
        <Button asChild size="lg" variant="outline" className="h-14 text-base">
          <a href={EMERGENCY_VET_SEARCH_URL} target="_blank" rel="noopener noreferrer">
            <MapPin aria-hidden /> Find a 24-hour vet <ExternalLink className="opacity-60" aria-hidden />
          </a>
        </Button>
        {prefs.emergencyContactPhone && (
          <Button asChild size="lg" variant="outline" className="h-14 text-base sm:col-span-2">
            <a href={tel(prefs.emergencyContactPhone)}>
              <Phone aria-hidden /> Call {prefs.emergencyContactName || 'emergency contact'}
            </a>
          </Button>
        )}
      </div>

      {cat && data && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CatPhoto cat={cat} size="md" />
              <div>
                <CardTitle className="text-lg">{cat.name}</CardTitle>
                <p className="text-[13px] text-muted-foreground">
                  {[formatAge(cat.birthDate, cat.birthDateEstimated), cat.breed, weight ? formatMeasurement('weight', weight.value, prefs) : null].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="eyebrow">Tell the vet</p>
            <div>
              <span className="font-semibold">Allergies: </span>
              {data.allergies.length ? data.allergies.map((a) => <Badge key={a.id} tone="danger" className="mr-1">{a.allergen}</Badge>) : <span className="text-muted-foreground">none recorded</span>}
            </div>
            <div>
              <span className="font-semibold">Conditions: </span>
              {data.diagnoses.filter((d) => d.status !== 'resolved').map((d) => d.name).join(', ') || <span className="text-muted-foreground">none recorded</span>}
            </div>
            <div>
              <span className="flex items-center gap-1 font-semibold">
                <Pill className="h-4 w-4" aria-hidden /> Current medications:
              </span>
              {meds.length ? (
                <ul className="ml-5 list-disc">
                  {meds.map((m) => (
                    <li key={m.id}>
                      {m.name} — {m.dosage}, {m.frequency.toLowerCase()}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground"> none recorded</span>
              )}
            </div>
            {cat.microchip && (
              <div>
                <span className="font-semibold">Microchip: </span>
                {cat.microchip}
              </div>
            )}
            <Button asChild variant="secondary" size="sm">
              <Link to={`/print/summary/${cat.id}`}>
                <FileText aria-hidden /> Open full vet summary
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden /> Call a vet straight away if you see
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm">
            {EMERGENCY_SIGNS.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" aria-hidden /> Common poisons for cats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            {COMMON_TOXINS.map((t) => (
              <div key={t.name} className="py-2">
                <dt className="text-sm font-semibold">{t.name}</dt>
                <dd className="text-[13px] text-muted-foreground">{t.detail}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[12px] text-muted-foreground">
            General guidance only. If you think your cat ate or touched something harmful, call a vet immediately — do not wait for symptoms and do not try to make your cat vomit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
