import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Registers the service worker and offers a reload when a new version is available. */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  if (!offlineReady && !needRefresh) return null;
  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-card p-3 pl-4 shadow-lift lg:bottom-6 lg:right-6 lg:left-auto"
    >
      <p className="flex-1 text-sm">
        {needRefresh ? 'A new version of PAWPASS is ready.' : 'PAWPASS is ready to work offline.'}
      </p>
      {needRefresh && (
        <Button size="sm" onClick={() => updateServiceWorker(true)}>
          <RefreshCw aria-hidden /> Update
        </Button>
      )}
      <Button size="icon-sm" variant="ghost" onClick={close} aria-label="Dismiss">
        <X />
      </Button>
    </div>
  );
}
