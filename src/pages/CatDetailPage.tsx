import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Download, FileText, HeartHandshake, PawPrint, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/db/database';
import type { ConditionStatus } from '@/db/types';
import { useCatData, usePrefs } from '@/hooks/useData';
import { countCatData, deleteAllergy, deleteCat, deleteCondition, updateConditionStatus } from '@/services/cats';
import { exportBackupBlob } from '@/services/backup';
import { downloadBlob } from '@/services/documents';
import { updatePrefs, DEFAULT_PREFS } from '@/services/prefs';
import { latestOf } from '@/services/health';
import { errorMessage } from '@/services/errors';
import { formatAge, formatDate } from '@/lib/dates';
import { formatMeasurement } from '@/lib/units';
import { ALLERGY_SEVERITY, CONDITION_STATUS, NEUTER_LABELS, SEX_LABELS, options } from '@/lib/labels';
import { useActions } from '@/components/forms/ActionsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm';
import { EmptyState, KeyValue, PageSkeleton } from '@/components/ui/misc';
import { CatPhoto } from '@/components/shared/CatAvatar';

export function CatDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const cat = useLiveQuery(() => db.cats.get(id), [id], null);
  const data = useCatData(id);
  const prefs = usePrefs() ?? DEFAULT_PREFS;
  const act = useActions();
  const confirm = useConfirm();
  const [exporting, setExporting] = React.useState(false);

  if (cat === null) return <PageSkeleton />;
  if (cat === undefined)
    return (
      <Card>
        <EmptyState
          icon={PawPrint}
          title="This cat profile was not found"
          description="It may have been deleted."
          action={
            <Button asChild variant="secondary">
              <Link to="/cats">Back to My Cats</Link>
            </Button>
          }
        />
      </Card>
    );
  if (!data) return <PageSkeleton />;

  const latestWeight = latestOf(data.measurements, 'weight');

  const onDelete = async () => {
    const n = await countCatData(cat.id);
    const ok = await confirm({
      title: `Delete ${cat.name}?`,
      description: (
        <>
          This permanently removes {cat.name}'s profile and <strong>{n} related entries</strong> (records, medications, vaccinations, appointments,
          measurements and documents) from this device. Consider exporting a backup first.
        </>
      ),
      confirmLabel: 'Delete permanently',
      destructive: true,
      typeToConfirm: 'DELETE',
    });
    if (!ok) return;
    try {
      await deleteCat(cat.id);
      toast.success(`${cat.name} was deleted`);
      navigate('/cats');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const { blob } = await exportBackupBlob('full', { catId: cat.id });
      downloadBlob(blob, `pawpass-${cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success(`${cat.name}'s records exported`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/cats">
          <ArrowLeft aria-hidden /> My Cats
        </Link>
      </Button>

      <Card className="overflow-hidden">
        <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-primary-soft/70 to-card px-4 pb-5 pt-6 text-center sm:flex-row sm:items-center sm:text-left">
          <CatPhoto cat={cat} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold">{cat.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[formatAge(cat.birthDate, cat.birthDateEstimated), cat.breed, cat.color].filter(Boolean).join(' · ')}
            </p>
            {cat.isDemo && (
              <Badge tone="outline" className="mt-2">
                Fictional demo profile
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => act({ type: 'cat', edit: cat })}>
              <Pencil aria-hidden /> Edit
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await updatePrefs({ selectedCatId: cat.id });
                navigate('/');
              }}
            >
              Open dashboard
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <dl className="divide-y">
              <KeyValue label="Date of birth" value={cat.birthDate ? `${formatDate(cat.birthDate)}${cat.birthDateEstimated ? ' (estimated)' : ''}` : undefined} />
              <KeyValue label="Sex" value={SEX_LABELS[cat.sex]} />
              <KeyValue label="Neutering" value={NEUTER_LABELS[cat.neuterStatus]} />
              <KeyValue label="Latest weight" value={latestWeight ? `${formatMeasurement('weight', latestWeight.value, prefs)} · ${formatDate(latestWeight.measuredAt)}` : undefined} />
              <KeyValue label="Microchip" value={cat.microchip} />
              <KeyValue label="Primary veterinarian" value={cat.primaryVet} />
              <KeyValue label="Clinic" value={cat.primaryClinic} />
            </dl>
            {cat.notes && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{cat.notes}</p>}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Known allergies</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => act({ type: 'allergy', catId: cat.id })}>
                <Plus aria-hidden /> Add
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              {data.allergies.length ? (
                <ul className="divide-y">
                  {data.allergies.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{a.allergen}</p>
                        <p className="text-[13px] text-muted-foreground">
                          {ALLERGY_SEVERITY[a.severity]}
                          {a.reaction ? ` · ${a.reaction}` : ''}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove allergy ${a.allergen}`}
                        onClick={async () => {
                          if (await confirm({ title: 'Remove allergy?', description: `${a.allergen} will be removed from ${cat.name}'s profile.`, confirmLabel: 'Remove', destructive: true }))
                            await deleteAllergy(a.id);
                        }}
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No allergies recorded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medical conditions</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => act({ type: 'condition', catId: cat.id })}>
                <Plus aria-hidden /> Add
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              {data.diagnoses.length ? (
                <ul className="divide-y">
                  {data.diagnoses.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{d.name}</p>
                        {d.diagnosedOn && <p className="text-[13px] text-muted-foreground">Since {formatDate(d.diagnosedOn)}</p>}
                      </div>
                      <Select
                        aria-label={`Status of ${d.name}`}
                        className="h-9 w-[118px] text-[13px]"
                        value={d.status}
                        onChange={(e) => updateConditionStatus(d.id, e.target.value as ConditionStatus)}
                      >
                        {options(CONDITION_STATUS).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove condition ${d.name}`}
                        onClick={async () => {
                          if (await confirm({ title: 'Remove condition?', description: `${d.name} will be removed from ${cat.name}'s profile.`, confirmLabel: 'Remove', destructive: true }))
                            await deleteCondition(d.id);
                        }}
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No conditions recorded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medical history</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 pt-2 text-center">
              {[
                { n: data.records.length, l: 'Records', to: '/records' },
                { n: data.vaccinations.length, l: 'Vaccines', to: '/records?tab=vaccinations' },
                { n: data.documents.length, l: 'Documents', to: '/records?tab=documents' },
              ].map((x) => (
                <Link
                  key={x.l}
                  to={x.to}
                  onClick={() => updatePrefs({ selectedCatId: cat.id })}
                  className="rounded-lg bg-muted px-2 py-3 hover:bg-secondary"
                >
                  <span className="block text-xl font-bold tabular">{x.n}</span>
                  <span className="text-[12px] text-muted-foreground">{x.l}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Share & print</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 pt-2 sm:grid-cols-3">
          {[
            { kind: 'summary', icon: FileText, title: 'Vet visit summary', text: 'History, meds, vaccines, weight' },
            { kind: 'sitter', icon: HeartHandshake, title: 'Pet sitter card', text: 'Feeding, meds, contacts' },
            { kind: 'poster', icon: Search, title: 'Lost cat poster', text: 'Photo, description, your phone' },
          ].map(({ kind, icon: Icon, title, text }) => (
            <Link key={kind} to={`/print/${kind}/${cat.id}`} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-[12.5px] text-muted-foreground">{text}</span>
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-muted-foreground">Export {cat.name}'s complete record to share with a vet or move to another device.</p>
          <Button variant="outline" onClick={onExport} disabled={exporting}>
            <Download aria-hidden /> {exporting ? 'Exporting…' : 'Export records'}
          </Button>
          <Button variant="destructive-outline" onClick={onDelete}>
            <Trash2 aria-hidden /> Delete profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
