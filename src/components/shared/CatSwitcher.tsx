import { Check, ChevronDown } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';
import { useSelectedCat } from '@/hooks/useData';
import { updatePrefs } from '@/services/prefs';
import { formatAge } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { CatPhoto } from './CatAvatar';
import { DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

/** Compact selector for the cat currently in view. */
export function CatSwitcher({ className }: { className?: string }) {
  const { cat, cats } = useSelectedCat();
  const [open, setOpen] = React.useState(false);
  if (!cat || !cats || cats.length === 0) return null;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className={cn('flex h-11 min-w-0 items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-sm font-semibold shadow-card hover:bg-muted', className)}
        aria-label={`Viewing ${cat.name}. Switch cat`}
      >
        <CatPhoto cat={cat} size="xs" />
        <span className="truncate">{cat.name}</span>
        {cats.length > 1 && <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />}
      </DialogPrimitive.Trigger>
      <DialogContent title="Choose a cat">
        <ul className="space-y-1.5">
          {cats.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={async () => {
                  await updatePrefs({ selectedCatId: c.id });
                  setOpen(false);
                }}
                className={cn('flex w-full items-center gap-3 rounded-xl border p-2.5 text-left hover:bg-muted', c.id === cat.id && 'border-primary bg-primary-soft/60')}
              >
                <CatPhoto cat={c} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold">
                    {c.name} {c.isDemo && <Badge tone="outline">Demo</Badge>}
                  </span>
                  <span className="block truncate text-[13px] text-muted-foreground">
                    {[formatAge(c.birthDate, c.birthDateEstimated), c.breed].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {c.id === cat.id && <Check className="h-5 w-5 text-primary" aria-label="Selected" />}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </DialogPrimitive.Root>
  );
}
