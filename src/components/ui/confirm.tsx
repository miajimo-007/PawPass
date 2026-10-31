import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';

interface ConfirmOptions {
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  /** When set, the user must type this word to enable the confirm button. */
  typeToConfirm?: string;
}

type Resolver = (ok: boolean) => void;
const ConfirmContext = React.createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<(ConfirmOptions & { resolve: Resolver }) | null>(null);
  const [typed, setTyped] = React.useState('');
  const confirm = React.useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setTyped('');
        setState({ ...o, resolve });
      }),
    [],
  );
  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };
  const blocked = !!state?.typeToConfirm && typed.trim().toUpperCase() !== state.typeToConfirm.toUpperCase();
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <DialogPrimitive.Root open={!!state} onOpenChange={(o) => !o && close(false)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/45 data-[state=open]:animate-fade-in" />
          <DialogPrimitive.Content
            role="alertdialog"
            className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background p-5 shadow-2xl data-[state=open]:animate-fade-in"
          >
            {state && (
              <>
                <div className="flex gap-3">
                  {state.destructive && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive-soft text-destructive">
                      <AlertTriangle className="h-5 w-5" aria-hidden />
                    </div>
                  )}
                  <div className="min-w-0">
                    <DialogPrimitive.Title className="font-display text-lg font-semibold">{state.title}</DialogPrimitive.Title>
                    <DialogPrimitive.Description asChild>
                      <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{state.description}</div>
                    </DialogPrimitive.Description>
                  </div>
                </div>
                {state.typeToConfirm && (
                  <div className="mt-4 space-y-1.5">
                    <label htmlFor="confirm-type" className="text-[13px] font-semibold">
                      Type <span className="font-mono">{state.typeToConfirm}</span> to confirm
                    </label>
                    <Input id="confirm-type" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" />
                  </div>
                )}
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => close(false)}>
                    Cancel
                  </Button>
                  <Button variant={state.destructive ? 'destructive' : 'default'} disabled={blocked} onClick={() => close(true)}>
                    {state.confirmLabel ?? 'Confirm'}
                  </Button>
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return React.useContext(ConfirmContext);
}
