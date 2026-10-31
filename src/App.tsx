import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Compass } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ActionsProvider } from '@/components/forms/ActionsProvider';
import { ConfirmProvider } from '@/components/ui/confirm';
import { ReminderWatcher } from '@/components/shared/ReminderWatcher';
import { EmptyState } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { HomePage } from '@/pages/HomePage';
import { CatsPage } from '@/pages/CatsPage';
import { CatDetailPage } from '@/pages/CatDetailPage';
import { HealthPage } from '@/pages/HealthPage';
import { RecordsPage } from '@/pages/RecordsPage';
import { ActivityPage, ProfilePage } from '@/pages/ProfilePage';
import { DataPage } from '@/pages/DataPage';
import { InstallPage, PrivacyPage } from '@/pages/InfoPages';

function NotFound() {
  return (
    <Card>
      <EmptyState
        icon={Compass}
        title="Page not found"
        action={
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        }
      />
    </Card>
  );
}

/**
 * HashRouter keeps every route working on GitHub Pages (a static host with no
 * server-side rewrites) and inside the installed PWA, including offline reloads.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ConfirmProvider>
          <ActionsProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<HomePage />} />
                <Route path="cats" element={<CatsPage />} />
                <Route path="cats/:id" element={<CatDetailPage />} />
                <Route path="health" element={<HealthPage />} />
                <Route path="records" element={<RecordsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="profile/data" element={<DataPage />} />
                <Route path="profile/privacy" element={<PrivacyPage />} />
                <Route path="profile/install" element={<InstallPage />} />
                <Route path="profile/activity" element={<ActivityPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            <ReminderWatcher />
          </ActionsProvider>
        </ConfirmProvider>
      </HashRouter>
      <Toaster
        position="top-center"
        offset="calc(env(safe-area-inset-top) + 12px)"
        toastOptions={{ className: 'font-sans', style: { borderRadius: 14 } }}
        closeButton
      />
    </ErrorBoundary>
  );
}
