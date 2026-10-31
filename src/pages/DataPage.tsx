import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, CheckCircle2, Download, FileJson, HardDrive, Loader2, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { usePrefs } from '@/hooks/useData';
import {
  EXPORT_SCOPES,
  exportBackupBlob,
  importBackup,
  parseBackup,
  previewBackup,
  type BackupFile,
  type BackupPreview,
  type DuplicateStrategy,
  type ExportScope,
  type ImportReport,
} from '@/services/backup';
import { clearAllData, countAll, estimateBlobBytes } from '@/services/dataManagement';
import { downloadBlob } from '@/services/documents';
import { getStorageInfo, requestPersistentStorage, type StorageInfo } from '@/services/storage';
import { DEFAULT_PREFS } from '@/services/prefs';
import { errorMessage } from '@/services/errors';
import { formatDate, formatDateTime, daysBetween } from '@/lib/dates';
import { formatBytes } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/ui/misc';
import { useConfirm } from '@/components/ui/confirm';
import { cn } from '@/lib/utils';

const TABLE_LABELS: Record<string, string> = {
  cats: 'Cat profiles',
  medicalRecords: 'Medical records',
  diagnoses: 'Conditions',
  allergies: 'Allergies',
  medications: 'Medications',
  medicationSchedules: 'Dose schedules',
  medicationLogs: 'Dose log entries',
  vaccinations: 'Vaccinations',
  appointments: 'Appointments',
  clinics: 'Clinics',
  measurements: 'Measurements',
  symptomLogs: 'Observations',
  documents: 'Documents',
};

export function DataPage() {
  const prefs = usePrefs() ?? DEFAULT_PREFS;
  const confirm = useConfirm();
  const counts = useLiveQuery(() => countAll(), []);
  const blobBytes = useLiveQuery(() => estimateBlobBytes(), []);
  const [storage, setStorage] = React.useState<StorageInfo>();
  const [exporting, setExporting] = React.useState<ExportScope | null>(null);

  const refreshStorage = React.useCallback(() => {
    void getStorageInfo().then(setStorage);
  }, []);
  React.useEffect(refreshStorage, [refreshStorage, counts]);

  const doExport = async (scope: ExportScope) => {
    setExporting(scope);
    try {
      const { blob, fileName, counts: c } = await exportBackupBlob(scope);
      downloadBlob(blob, fileName);
      const total = Object.values(c).reduce((a, b) => a + b, 0);
      toast.success(`Exported ${total} entries (${formatBytes(blob.size)})`, { description: fileName });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;
  const backupAge = prefs.lastBackupAt ? daysBetween(new Date(prefs.lastBackupAt), new Date()) : null;

  return (
    <div className="space-y-5">
      <PageHeader title="Data management" subtitle="Everything here happens on this device." />

      {/* Backup */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Back up</CardTitle>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {prefs.lastBackupAt ? `Last complete backup: ${formatDateTime(prefs.lastBackupAt)}` : 'No complete backup exported yet.'}
            </p>
          </div>
          {backupAge !== null && backupAge <= 30 ? <Badge tone="success">Up to date</Badge> : <Badge tone="warning">Recommended</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          <Button size="lg" className="w-full sm:w-auto" onClick={() => doExport('full')} disabled={!!exporting || !total}>
            {exporting === 'full' ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
            Export complete backup (.json)
          </Button>
          <p className="text-[13px] text-muted-foreground">
            The backup file includes every cat, record and document (documents are embedded, so it can be large). Keep it somewhere safe, e.g. iCloud Drive
            or Files. It is not encrypted — treat it like a medical record.
          </p>
          <details className="group rounded-lg border">
            <summary className="flex min-h-11 cursor-pointer items-center px-3.5 text-sm font-semibold">Export a single section</summary>
            <div className="grid gap-2 border-t p-3 sm:grid-cols-2">
              {(Object.keys(EXPORT_SCOPES) as ExportScope[])
                .filter((s) => s !== 'full')
                .map((s) => (
                  <Button key={s} variant="outline" className="justify-start" onClick={() => doExport(s)} disabled={!!exporting}>
                    {exporting === s ? <Loader2 className="animate-spin" aria-hidden /> : <FileJson aria-hidden />}
                    {EXPORT_SCOPES[s].label}
                  </Button>
                ))}
            </div>
          </details>
        </CardContent>
      </Card>

      <RestoreCard />

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" aria-hidden /> Storage on this device
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {storage?.supported && storage.quota ? (
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-semibold">{formatBytes(storage.usage ?? 0)} used</span>
                <span className="text-muted-foreground">of about {formatBytes(storage.quota)} available</span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Browser storage used"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((storage.ratio ?? 0) * 100)}
              >
                <div
                  className={cn('h-full rounded-full', storage.level === 'critical' ? 'bg-destructive' : storage.level === 'warning' ? 'bg-warning' : 'bg-primary')}
                  style={{ width: `${Math.max(1, Math.min(100, (storage.ratio ?? 0) * 100))}%` }}
                />
              </div>
              {storage.level !== 'ok' && (
                <p role="alert" className="mt-2 flex items-start gap-2 text-[13px] text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Storage is nearly full. Export a backup, then delete large documents you no longer need. Saving will stop safely if space runs out —
                  existing records are never overwritten.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">This browser does not report storage usage.</p>
          )}
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-muted p-3">
              <dt className="text-[12px] text-muted-foreground">Entries</dt>
              <dd className="text-lg font-bold tabular">{total ?? '—'}</dd>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <dt className="text-[12px] text-muted-foreground">Files & photos</dt>
              <dd className="text-lg font-bold tabular">{blobBytes !== undefined ? formatBytes(blobBytes) : '—'}</dd>
            </div>
            <div className="col-span-2 rounded-lg bg-muted p-3 sm:col-span-1">
              <dt className="text-[12px] text-muted-foreground">Protected from cleanup</dt>
              <dd className="text-lg font-bold">{storage?.persisted === undefined ? 'Unknown' : storage.persisted ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
          {storage?.persisted === false && (
            <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
              <p className="flex-1 text-[13px] text-muted-foreground">
                Ask the browser to keep PAWPASS data even when the device is low on space. Installing PAWPASS to your Home Screen makes this more likely to be
                granted.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const ok = await requestPersistentStorage();
                  toast[ok ? 'success' : 'info'](ok ? 'Storage is now protected' : 'The browser did not grant persistent storage');
                  refreshStorage();
                }}
              >
                <ShieldCheck aria-hidden /> Protect storage
              </Button>
            </div>
          )}
          {counts && (
            <details className="rounded-lg border">
              <summary className="flex min-h-11 cursor-pointer items-center px-3.5 text-sm font-semibold">What's stored</summary>
              <dl className="divide-y border-t">
                {Object.entries(counts).map(([k, v]) => (
                  <div key={k} className="flex justify-between px-3.5 py-2 text-sm">
                    <dt className="text-muted-foreground">{TABLE_LABELS[k] ?? k}</dt>
                    <dd className="font-semibold tabular">{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/25">
        <CardHeader>
          <CardTitle className="text-destructive">Delete all data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Permanently removes every cat, record, document and setting from this browser. This cannot be undone. Export a backup first.
          </p>
          <Button
            variant="destructive"
            disabled={!total}
            onClick={async () => {
              const ok = await confirm({
                title: 'Delete everything?',
                description: `All ${total} entries will be permanently deleted from this device. Backups you exported are not affected.`,
                confirmLabel: 'Delete all data',
                destructive: true,
                typeToConfirm: 'DELETE',
              });
              if (!ok) return;
              try {
                await clearAllData();
                toast.success('All local data deleted');
              } catch (err) {
                toast.error(errorMessage(err));
              }
            }}
          >
            <Trash2 aria-hidden /> Delete all local data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RestoreCard() {
  const confirm = useConfirm();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [backup, setBackup] = React.useState<BackupFile | null>(null);
  const [fileName, setFileName] = React.useState('');
  const [preview, setPreview] = React.useState<BackupPreview | null>(null);
  const [strategy, setStrategy] = React.useState<DuplicateStrategy>('skip');
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const [report, setReport] = React.useState<ImportReport | null>(null);

  const reset = () => {
    setBackup(null);
    setPreview(null);
    setFileName('');
    setError(undefined);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    reset();
    setReport(null);
    setBusy(true);
    setFileName(f.name);
    try {
      const parsed = parseBackup(await f.text());
      setBackup(parsed);
      setPreview(await previewBackup(parsed));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    if (!backup || !preview) return;
    const writes = preview.totals.new + (strategy === 'replace' ? preview.totals.duplicates : 0);
    const ok = await confirm({
      title: 'Import this backup?',
      description: `${writes} entries will be ${strategy === 'replace' ? 'added or replaced' : 'added'}. ${
        strategy === 'skip' ? `${preview.totals.duplicates} already-present entries will be left unchanged.` : 'Entries with the same ID will be overwritten by the backup copy.'
      } Nothing else on this device is deleted.`,
      confirmLabel: 'Import',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await importBackup(backup, strategy);
      setReport(r);
      reset();
      toast.success(`Imported ${r.imported + r.replaced} entries`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Restore from backup</CardTitle>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Import a PAWPASS .json backup. You'll see a preview before anything is saved.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <input ref={inputRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onFile(e.target.files?.[0])} />
        {!preview && (
          <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />} Choose backup file
          </Button>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive-soft p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {error}
          </p>
        )}
        {preview && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3.5 text-sm">
              <p className="font-semibold">{fileName}</p>
              <p className="text-muted-foreground">
                Exported {formatDate(preview.exportedAt)} · {preview.catNames.length ? `Cats: ${preview.catNames.join(', ')}` : 'No cat profiles in this file'}
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <caption className="sr-only">Backup contents</caption>
                <thead className="bg-muted text-left text-[12px] text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">Section</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">New</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">Already here</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Invalid</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.tables
                    .filter((t) => t.total > 0)
                    .map((t) => (
                      <tr key={t.table}>
                        <th scope="row" className="px-3 py-2 text-left font-medium">
                          {TABLE_LABELS[t.table] ?? t.table}
                          {t.issues.length > 0 && <span className="block text-[12px] font-normal text-destructive">{t.issues.join('; ')}</span>}
                        </th>
                        <td className="px-2 py-2 text-right tabular">{t.new}</td>
                        <td className="px-2 py-2 text-right tabular">{t.duplicates}</td>
                        <td className={cn('px-3 py-2 text-right tabular', t.invalid > 0 && 'font-semibold text-destructive')}>{t.invalid}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {preview.possibleDuplicateCats.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-[13px] text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                A cat named {preview.possibleDuplicateCats.join(', ')} already exists on this device as a separate profile. Importing will create a second
                profile with that name.
              </p>
            )}
            {preview.totals.duplicates > 0 && (
              <div className="space-y-1.5">
                <p className="text-[13px] font-semibold">Entries already on this device</p>
                <Segmented
                  label="How to handle entries already on this device"
                  value={strategy}
                  onChange={setStrategy}
                  options={[
                    { value: 'skip', label: 'Keep mine (skip)' },
                    { value: 'replace', label: 'Use backup copy' },
                  ]}
                  size="sm"
                  className="w-fit"
                />
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" onClick={reset} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={onImport} disabled={busy || preview.totals.new + (strategy === 'replace' ? preview.totals.duplicates : 0) === 0}>
                {busy && <Loader2 className="animate-spin" aria-hidden />} Import backup
              </Button>
            </div>
          </div>
        )}
        {report && (
          <div role="status" className="rounded-lg bg-success-soft p-3.5 text-sm">
            <p className="flex items-center gap-2 font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Import finished
            </p>
            <p className="mt-1">
              {report.imported} added · {report.replaced} replaced · {report.skipped} skipped (already present) · {report.failed} failed validation
            </p>
            {report.failed > 0 && <p className="mt-1 text-[13px] text-muted-foreground">Failed entries were incomplete or referred to a cat that is not in the backup.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
