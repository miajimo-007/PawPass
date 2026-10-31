import { MoreHorizontal } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

/** Small accessible overflow menu (no external dependency). */
export function ItemMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const els = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus();
  };
  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open && (
        <div role="menu" onKeyDown={onMenuKey} className="absolute right-0 top-full z-30 mt-1 min-w-[170px] animate-fade-in overflow-hidden rounded-xl border bg-card py-1 shadow-lift">
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                it.onSelect();
              }}
              className={cn('flex h-11 w-full items-center gap-2.5 px-3.5 text-left text-sm font-medium hover:bg-muted focus:bg-muted focus:outline-none', it.destructive && 'text-destructive')}
            >
              {it.icon && <it.icon className="h-4 w-4" />}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
