import { useSearchParams } from 'react-router-dom';
import { HeartPulse, Phone } from 'lucide-react';
import { decodeFoundTag } from '@/lib/foundTag';
import { LogoMark } from '@/components/layout/Logo';

/** Public page opened by scanning a collar QR tag. Shows only what is encoded in the link. */
export function FoundPage() {
  const [params] = useSearchParams();
  const tag = decodeFoundTag(params.get('d'));
  const tel = tag ? `tel:${tag.p.replace(/[^\d+]/g, '')}` : '';
  return (
    <div className="flex min-h-dvh flex-col items-center bg-background px-5 pb-10 pt-[calc(2rem+env(safe-area-inset-top))] text-center">
      <LogoMark className="h-10 w-10" />
      {tag ? (
        <div className="mt-6 w-full max-w-sm space-y-5">
          <div>
            <p className="eyebrow">You found a cat</p>
            <h1 className="mt-1 text-[38px] font-semibold leading-tight">Hi, I’m {tag.n}!</h1>
            <p className="mt-2 text-muted-foreground">{tag.m || 'I might be lost. Please contact my family.'}</p>
          </div>
          <a
            href={tel}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-lift"
          >
            <Phone className="h-5 w-5" aria-hidden /> Call {tag.o ? tag.o : 'my family'}
          </a>
          <p className="text-2xl font-bold tracking-wide tabular">{tag.p}</p>
          {tag.h && (
            <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive-soft p-3 text-left text-sm text-destructive">
              <HeartPulse className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {tag.h}
            </p>
          )}
          <p className="text-[13px] text-muted-foreground">
            Please keep me somewhere safe and don’t feed me anything new. Any vet can also scan my microchip.
          </p>
        </div>
      ) : (
        <div className="mt-8 max-w-sm">
          <h1 className="text-2xl font-semibold">This tag link is incomplete</h1>
          <p className="mt-2 text-sm text-muted-foreground">Try scanning the QR code again. If you found a cat, a local vet can scan for a microchip.</p>
        </div>
      )}
      <p className="mt-auto pt-10 text-[11px] text-muted-foreground">PAWPASS collar tag · the details above are stored only in the tag itself.</p>
    </div>
  );
}
