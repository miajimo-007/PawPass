import { cn, initials } from '@/lib/utils';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import type { Cat } from '@/db/types';

const sizes = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-10 w-10 text-sm',
  md: 'h-14 w-14 text-lg',
  lg: 'h-20 w-20 text-2xl',
  xl: 'h-24 w-24 text-3xl sm:h-28 sm:w-28',
};

/** Shows the cat's photo, or an elegant monogram when no photo is stored. */
export function CatAvatar({ name, url, size = 'md', className }: { name: string; url?: string; size?: keyof typeof sizes; className?: string }) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-sage-light to-secondary font-display font-semibold text-primary ring-1 ring-border',
        sizes[size],
        className,
      )}
    >
      {url ? (
        <img src={url} alt={`Photo of ${name}`} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center" aria-hidden>
          {initials(name) || '·'}
        </span>
      )}
    </div>
  );
}

export function CatPhoto({ cat, size = 'md', className }: { cat: Cat; size?: keyof typeof sizes; className?: string }) {
  const url = useObjectUrl(cat.photo);
  return <CatAvatar name={cat.name} url={url} size={size} className={className} />;
}
