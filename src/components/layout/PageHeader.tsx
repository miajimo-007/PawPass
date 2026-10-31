import * as React from 'react';
import { CatSwitcher } from '@/components/shared/CatSwitcher';
import { Wordmark } from './Logo';

/** Page title row. On phones it also shows the brand and the cat switcher. */
export function PageHeader({
  title,
  subtitle,
  actions,
  showCatSwitcher = false,
  eyebrow,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  showCatSwitcher?: boolean;
  eyebrow?: string;
}) {
  return (
    <header className="mb-5 lg:mb-7">
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <Wordmark />
        {showCatSwitcher && <CatSwitcher className="max-w-[48%]" />}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h1 className="text-[28px] font-semibold leading-tight sm:text-[32px]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
    </header>
  );
}
