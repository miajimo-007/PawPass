import * as React from 'react';
import { toast } from 'sonner';
import { usePrefs } from '@/hooks/useData';
import { claimNewReminders, computeDueReminders, loadReminderData } from '@/services/reminders';

const CHECK_EVERY_MS = 60_000;

/**
 * In-app reminders. Runs only while PAWPASS is open (there is no server to send
 * push notifications). Shows a toast, and a system notification if the user
 * granted permission and the app is in the background.
 */
export function ReminderWatcher() {
  const prefs = usePrefs();
  const enabled = prefs?.remindersEnabled ?? true;

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const check = async () => {
      try {
        const data = await loadReminderData();
        const fresh = await claimNewReminders(computeDueReminders(data));
        if (cancelled) return;
        for (const r of fresh) {
          toast(r.title, { description: r.body, duration: 12_000 });
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
            try {
              const reg = await navigator.serviceWorker?.getRegistration();
              if (reg) await reg.showNotification(r.title, { body: r.body, tag: r.key, icon: 'icons/icon-192.png' });
              else new Notification(r.title, { body: r.body, tag: r.key });
            } catch {
              /* notifications are best-effort */
            }
          }
        }
      } catch {
        /* reminder checks never interrupt the app */
      }
    };
    void check();
    const id = window.setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => document.visibilityState === 'visible' && void check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);

  return null;
}
