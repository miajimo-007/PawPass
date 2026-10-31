import * as React from 'react';

interface State {
  error: Error | null;
}

/** Last-resort error screen. Data in IndexedDB is unaffected by a rendering error. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('PAWPASS error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6 text-center">
        <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          Your records are still saved on this device. Reload PAWPASS to continue. If this keeps happening, export a backup from Profile → Data management.
        </p>
        <pre className="max-h-32 overflow-auto rounded-lg bg-muted p-3 text-left text-xs">{this.state.error.message}</pre>
        <button type="button" onClick={() => window.location.reload()} className="mx-auto h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
          Reload
        </button>
      </div>
    );
  }
}
