import { Link } from 'react-router-dom';
import { Download, HardDrive, KeyRound, MonitorSmartphone, Share, ShieldCheck, SquarePlus, Trash2, WifiOff } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const PRIVACY_STATEMENT =
  "Your cat's health records are stored locally on this device. PAWPASS does not upload your personal records to a cloud database.";

export function PrivacyPage() {
  const points = [
    { icon: MonitorSmartphone, title: 'Data stays on this device', text: 'Records do not transfer automatically between devices or browsers. Use backup and restore to move them.' },
    { icon: Trash2, title: 'Clearing browser data deletes records', text: "Clearing site data, history or 'website data' for this site in your browser settings will erase PAWPASS records." },
    {
      icon: HardDrive,
      title: 'Browser storage is not guaranteed to be permanent',
      text: 'Browsers may remove data when the device is very low on space or, on some systems, when a site has not been used for a long time. Installing PAWPASS and allowing persistent storage reduces this risk.',
    },
    { icon: Download, title: 'Export backups regularly', text: 'A backup file is the only way to recover your records if the browser storage is lost.' },
    {
      icon: KeyRound,
      title: 'Device access means record access',
      text: 'Anyone who can use this device and browser profile may be able to open PAWPASS and view stored records. Records are not encrypted by PAWPASS — protect your device with a passcode.',
    },
    { icon: WifiOff, title: 'No tracking, no accounts', text: 'PAWPASS has no login, analytics or advertising. After the first load it works fully offline.' },
  ];
  return (
    <div className="space-y-5">
      <PageHeader title="Privacy & local storage" />
      <Card className="border-primary/20 bg-primary-soft/40">
        <CardContent className="flex gap-3 pt-4">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
          <p className="text-[15px] font-medium leading-relaxed">{PRIVACY_STATEMENT}</p>
        </CardContent>
      </Card>
      <Card className="divide-y">
        {points.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3 p-4">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <p className="font-semibold">{title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </Card>
      <p className="text-sm text-muted-foreground">
        Medical information in PAWPASS is entered by you and is not reviewed by a veterinarian. PAWPASS does not diagnose, prescribe or calculate doses.
      </p>
      <Button asChild variant="secondary">
        <Link to="/profile/data">Go to backup & restore</Link>
      </Button>
    </div>
  );
}

export function InstallPage() {
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone);
  return (
    <div className="space-y-5">
      <PageHeader title="Install on your phone" subtitle={standalone ? 'PAWPASS is installed and running as an app.' : 'Use PAWPASS like a native app, even offline.'} />
      <Card>
        <CardContent className="space-y-4 pt-4">
          <h2 className="font-sans text-base font-bold">iPhone & iPad (Safari)</h2>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-primary">1</span>
              <span>
                Open PAWPASS in <strong>Safari</strong>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-primary">2</span>
              <span className="flex flex-wrap items-center gap-1">
                Tap the <Share className="inline h-4 w-4" aria-label="Share" /> <strong>Share</strong> button.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-primary">3</span>
              <span className="flex flex-wrap items-center gap-1">
                Choose <SquarePlus className="inline h-4 w-4" aria-hidden /> <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
              </span>
            </li>
          </ol>
          <p className="rounded-lg bg-warning-soft p-3 text-[13px] text-warning">
            On iPhone, the Home Screen app and Safari keep <strong>separate</strong> storage. Choose one place to keep your records, or move them with a
            backup.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 pt-4 text-sm">
          <h2 className="font-sans text-base font-bold">Android (Chrome)</h2>
          <p>
            Open the browser menu <strong>⋮</strong> and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
          </p>
          <h2 className="pt-3 font-sans text-base font-bold">Desktop (Chrome, Edge)</h2>
          <p>Click the install icon in the address bar, or use the browser menu → Install PAWPASS.</p>
        </CardContent>
      </Card>
    </div>
  );
}
