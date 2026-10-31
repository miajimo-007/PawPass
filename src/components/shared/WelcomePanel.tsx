import * as React from 'react';
import { Link } from 'react-router-dom';
import { HardDrive, Plus, ShieldCheck, Sparkles, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { seedDemoData } from '@/services/demo';
import { errorMessage } from '@/services/errors';
import { useActions } from '@/components/forms/ActionsProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Wordmark } from '@/components/layout/Logo';

export function WelcomePanel() {
  const act = useActions();
  const [loading, setLoading] = React.useState(false);
  const loadDemo = async () => {
    setLoading(true);
    try {
      await seedDemoData();
      toast.success('Demo cats Luna, Milo and Oliver added (fictional data)');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="mx-auto max-w-xl space-y-6 py-4">
      <div className="lg:hidden">
        <Wordmark />
      </div>
      <div>
        <p className="eyebrow">Welcome</p>
        <h1 className="mt-1 text-[34px] font-semibold leading-[1.1] sm:text-[40px]">A personal health record for every cat.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Keep vet visits, medications, vaccinations, weight and documents together — organised, searchable and always with you.
        </p>
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button size="lg" onClick={() => act({ type: 'cat' })}>
          <Plus aria-hidden /> Add your first cat
        </Button>
        <Button size="lg" variant="outline" onClick={loadDemo} disabled={loading}>
          <Sparkles aria-hidden /> {loading ? 'Loading demo…' : 'Explore with demo cats'}
        </Button>
      </div>
      <Card className="divide-y">
        {[
          { icon: ShieldCheck, title: 'Private by design', text: 'No account, no cloud. Records are stored in this browser on this device.' },
          { icon: WifiOff, title: 'Works offline', text: 'Once loaded, PAWPASS keeps working without a connection.' },
          { icon: HardDrive, title: 'You hold the backups', text: 'Export a backup file regularly — data does not sync between devices.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3 p-4">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-[13px] text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </Card>
      <p className="text-center text-[13px] text-muted-foreground">
        Moving from another device?{' '}
        <Link to="/profile/data" className="font-semibold text-primary underline-offset-4 hover:underline">
          Restore a backup
        </Link>
      </p>
    </div>
  );
}
