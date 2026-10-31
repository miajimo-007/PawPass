import * as React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnline } from '@/hooks/useOnline';
import { CatSwitcher } from '@/components/shared/CatSwitcher';
import { NAV_ITEMS } from './nav';
import { Wordmark } from './Logo';
import { UpdatePrompt } from './UpdatePrompt';

function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md supports-[backdrop-filter]:bg-background/85 lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-primary-soft')}>
                    <Icon className="h-[21px] w-[21px]" strokeWidth={isActive ? 2.25 : 1.8} aria-hidden />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-surface px-4 py-6 lg:flex">
      <div className="px-2">
        <Wordmark />
        <p className="mt-1.5 text-[12.5px] text-muted-foreground">A personal health record for every cat</p>
      </div>
      <div className="mt-6 px-1">
        <CatSwitcher className="w-full" />
      </div>
      <nav aria-label="Main" className="mt-6">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors',
                    isActive ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icon className="h-[19px] w-[19px]" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-auto px-2 text-[12px] leading-relaxed text-muted-foreground">
        Records are stored on this device only. Export backups regularly from Profile → Data.
      </p>
    </aside>
  );
}

export function AppShell() {
  const online = useOnline();
  const { pathname } = useLocation();
  const mainRef = React.useRef<HTMLElement>(null);

  // Move focus to the page on navigation for screen-reader and keyboard users.
  React.useEffect(() => {
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-secondary px-4 py-1.5 pt-[calc(0.375rem+env(safe-area-inset-top))] text-[12.5px] font-medium text-secondary-foreground">
            <CloudOff className="h-3.5 w-3.5" aria-hidden /> Offline — everything still works and saves on this device.
          </div>
        )}
        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 px-4 pb-[calc(var(--nav-height)+env(safe-area-inset-bottom)+1.5rem)] pt-[calc(1rem+env(safe-area-inset-top))] outline-none sm:px-6 lg:px-10 lg:pb-12 lg:pt-8"
        >
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <UpdatePrompt />
    </div>
  );
}
