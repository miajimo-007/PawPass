import * as React from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BellRing, ChevronRight, Database, History, Info, Lock, Smartphone, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/db/database';
import { usePrefs } from '@/hooks/useData';
import { DEFAULT_PREFS, updatePrefs } from '@/services/prefs';
import { hasDemoData, removeDemoData, resetDemoData, seedDemoData } from '@/services/demo';
import { errorMessage } from '@/services/errors';
import { formatDateTime } from '@/lib/dates';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Segmented, Switch } from '@/components/ui/misc';
import { useConfirm } from '@/components/ui/confirm';

export function ProfilePage() {
  const prefs = usePrefs() ?? DEFAULT_PREFS;
  const confirm = useConfirm();
  const [name, setName] = React.useState<string | null>(null);
  const demo = useLiveQuery(() => hasDemoData(), [], false);
  const [busy, setBusy] = React.useState(false);
  const [permission, setPermission] = React.useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');

  const ownerName = name ?? prefs.ownerName ?? '';

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Profile" subtitle="Your preferences and the data stored on this device" />

      <Card>
        <CardHeader>
          <CardTitle>About you</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => updatePrefs({ ownerName: ownerName.trim() || undefined }), 'Name saved');
            }}
          >
            <Field label="Your first name" htmlFor="owner-name" optional className="flex-1" hint="Used only for the greeting on your dashboard.">
              <Input value={ownerName} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
            </Field>
            <Button type="submit" variant="secondary" className="mb-[22px]">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Units & reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold" id="wu">
              Weight
            </span>
            <Segmented
              label="Weight unit"
              value={prefs.weightUnit}
              onChange={(v) => updatePrefs({ weightUnit: v })}
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
              size="sm"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Water</span>
            <Segmented
              label="Volume unit"
              value={prefs.volumeUnit}
              onChange={(v) => updatePrefs({ volumeUnit: v })}
              options={[
                { value: 'ml', label: 'ml' },
                { value: 'floz', label: 'fl oz' },
              ]}
              size="sm"
            />
          </div>
          <Switch
            id="reminders"
            checked={prefs.remindersEnabled}
            onChange={(v) => updatePrefs({ remindersEnabled: v })}
            label="In-app reminders"
            description="Medication, appointment and vaccine reminders while PAWPASS is open."
          />
          {permission !== 'unsupported' && permission !== 'granted' && (
            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
              <BellRing className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <p className="flex-1 text-[13px] text-muted-foreground">
                {permission === 'denied'
                  ? 'System notifications are blocked in your browser settings.'
                  : 'Allow system notifications so reminders can also appear when PAWPASS is in the background.'}
              </p>
              {permission === 'default' && (
                <Button size="sm" variant="outline" onClick={async () => setPermission(await Notification.requestPermission())}>
                  Allow
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="divide-y overflow-hidden">
        {[
          { to: '/profile/data', icon: Database, title: 'Data management', text: 'Backup, restore, storage and deletion' },
          { to: '/profile/privacy', icon: Lock, title: 'Privacy & local storage', text: 'Where your records live' },
          { to: '/profile/install', icon: Smartphone, title: 'Install on your phone', text: 'Add PAWPASS to your Home Screen' },
          { to: '/profile/activity', icon: History, title: 'Activity log', text: 'Recent changes on this device' },
        ].map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted/60">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{title}</span>
              <span className="block text-[13px] text-muted-foreground">{text}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
          </Link>
        ))}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Demo mode
            </CardTitle>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Fictional cats Luna, Milo and Oliver with sample records. Demo data is labelled and never mixed with your own entries.
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {demo ? (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  if (await confirm({ title: 'Reset demo data?', description: 'Demo cats are restored to their original sample data. Your own records are not touched.', confirmLabel: 'Reset demo' }))
                    void run(resetDemoData, 'Demo data reset');
                }}
              >
                Reset demo
              </Button>
              <Button
                variant="destructive-outline"
                disabled={busy}
                onClick={async () => {
                  if (await confirm({ title: 'Remove demo data?', description: 'Luna, Milo and Oliver and all their sample records will be removed. Your own records are not touched.', confirmLabel: 'Remove demo', destructive: true }))
                    void run(removeDemoData, 'Demo data removed');
                }}
              >
                Remove demo
              </Button>
            </>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => run(seedDemoData, 'Demo cats added')}>
              Load demo cats
            </Button>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-muted-foreground">
        <Info className="h-3.5 w-3.5" aria-hidden /> PAWPASS {__APP_VERSION__} · not a substitute for veterinary advice
      </p>
    </div>
  );
}

export function ActivityPage() {
  const events = useLiveQuery(() => db.auditEvents.orderBy('at').reverse().limit(200).toArray(), []);
  return (
    <div>
      <PageHeader title="Activity log" subtitle="The last 200 changes made on this device" />
      <Card className="divide-y">
        {events?.length ? (
          events.map((e) => (
            <div key={e.id} className="px-4 py-2.5">
              <p className="text-sm">{e.summary}</p>
              <p className="text-[12px] text-muted-foreground">{formatDateTime(e.at)}</p>
            </div>
          ))
        ) : (
          <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>
        )}
      </Card>
    </div>
  );
}
