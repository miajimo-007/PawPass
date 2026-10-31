import { cn } from '@/lib/utils';

/** Wordmark: a restrained shield-and-cross mark with the PAWPASS name. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M16 7.5c3.4 2 6.3 2.6 8.5 2.6v6.2c0 5-3.6 8.2-8.5 9.9-4.9-1.7-8.5-4.9-8.5-9.9v-6.2c2.2 0 5.1-.6 8.5-2.6Z" fill="none" stroke="#F3EFE6" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16 12.8v7.4M12.3 16.5h7.4" stroke="#B9CBB6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="font-display text-[19px] font-semibold tracking-tight text-foreground">PAWPASS</span>
    </span>
  );
}
