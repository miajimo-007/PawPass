import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, PawPrint, Plus } from 'lucide-react';
import { db } from '@/db/database';
import { useCats, usePrefs } from '@/hooks/useData';
import { useActions } from '@/components/forms/ActionsProvider';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, PageSkeleton } from '@/components/ui/misc';
import { CatPhoto } from '@/components/shared/CatAvatar';
import { formatAge } from '@/lib/dates';
import { formatMeasurement } from '@/lib/units';
import { DEFAULT_PREFS } from '@/services/prefs';
import { latestOf } from '@/services/health';

export function CatsPage() {
  const cats = useCats();
  const prefs = usePrefs() ?? DEFAULT_PREFS;
  const act = useActions();
  const weights = useLiveQuery(() => db.measurements.where('type').equals('weight').toArray(), []) ?? [];
  const activeMeds = useLiveQuery(() => db.medications.where('status').equals('active').toArray(), []) ?? [];

  if (!cats) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        title="My Cats"
        subtitle={cats.length ? `${cats.length} ${cats.length === 1 ? 'profile' : 'profiles'} on this device` : undefined}
        actions={
          <Button onClick={() => act({ type: 'cat' })}>
            <Plus aria-hidden /> Add cat
          </Button>
        }
      />
      {cats.length === 0 ? (
        <Card>
          <EmptyState
            icon={PawPrint}
            title="No cats yet"
            description="Create a profile for each cat. Each one keeps its own independent medical history."
            action={<Button onClick={() => act({ type: 'cat' })}>Add your first cat</Button>}
          />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cats.map((c) => {
            const w = latestOf(
              weights.filter((m) => m.catId === c.id),
              'weight',
            );
            const meds = activeMeds.filter((m) => m.catId === c.id).length;
            return (
              <li key={c.id}>
                <Link to={`/cats/${c.id}`} className="block rounded-xl focus-visible:ring-2">
                  <Card className="flex items-center gap-4 p-4 transition-colors hover:border-primary/40">
                    <CatPhoto cat={c} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2">
                        <span className="truncate font-display text-lg font-semibold">{c.name}</span>
                        {c.isDemo && <Badge tone="outline">Demo</Badge>}
                      </p>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {[formatAge(c.birthDate, c.birthDateEstimated), c.breed].filter(Boolean).join(' · ')}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1.5">
                        {w && <Badge>{formatMeasurement('weight', w.value, prefs)}</Badge>}
                        {meds > 0 && <Badge tone="primary">{meds} active med{meds > 1 ? 's' : ''}</Badge>}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
