import * as React from 'react';
import { ArrowRightLeft, Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import type { Diet } from '@/db/types';
import { currentDiets, deleteDiet, endDiet } from '@/services/care';
import { formatDate } from '@/lib/dates';
import { FOOD_TYPES } from '@/lib/labels';
import { useActions } from '@/components/forms/ActionsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConfirm } from '@/components/ui/confirm';
import { EmptyState } from '@/components/ui/misc';
import { ItemMenu } from '@/components/shared/ItemMenu';

export function DietCard({ catId, diets }: { catId: string; diets: Diet[] }) {
  const act = useActions();
  const confirm = useConfirm();
  const [showHistory, setShowHistory] = React.useState(false);
  const current = currentDiets(diets);
  const past = diets.filter((d) => !current.includes(d)).sort((a, b) => b.startDate.localeCompare(a.startDate));

  const menu = (d: Diet) => [
    { label: 'Edit', icon: Pencil, onSelect: () => act({ type: 'diet', edit: d }) },
    ...(!d.endDate ? [{ label: 'Stopped this food', icon: ArrowRightLeft, onSelect: () => endDiet(d.id).then(() => toast.success('Marked as ended today')) }] : []),
    {
      label: 'Delete',
      icon: Trash2,
      destructive: true,
      onSelect: async () => {
        if (await confirm({ title: 'Delete this food?', description: `${d.foodName} will be removed from the diet history.`, confirmLabel: 'Delete', destructive: true })) await deleteDiet(d.id);
      },
    },
  ];

  const row = (d: Diet) => (
    <li key={d.id} className="flex items-start gap-2 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {d.foodName}
          {d.brand && <span className="font-normal text-muted-foreground"> · {d.brand}</span>}
        </p>
        <p className="text-[13px] text-muted-foreground">
          {FOOD_TYPES[d.type]}
          {d.portion ? ` · ${d.portion}` : ''} · {formatDate(d.startDate)}
          {d.endDate ? ` – ${formatDate(d.endDate)}` : ' – now'}
        </p>
        {d.reasonForChange && d.endDate && <p className="text-[12.5px] text-muted-foreground">Changed because: {d.reasonForChange}</p>}
        {d.notes && <p className="mt-0.5 text-[12.5px]">{d.notes}</p>}
      </div>
      <ItemMenu label={`Options for ${d.foodName}`} items={menu(d)} />
    </li>
  );

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-primary" aria-hidden /> Food & diet
          </CardTitle>
          <p className="text-[13px] text-muted-foreground">Track what your cat eats and when food changes.</p>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {current.length ? <ul className="divide-y">{current.map(row)}</ul> : <EmptyState compact icon={UtensilsCrossed} title="No current food recorded" />}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => act({ type: 'diet', catId })}>
            <Plus aria-hidden /> Add food
          </Button>
          {current.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => act({ type: 'diet', catId, change: true })}>
              <ArrowRightLeft aria-hidden /> Change food
            </Button>
          )}
          {past.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setShowHistory((s) => !s)} aria-expanded={showHistory}>
              History <Badge>{past.length}</Badge>
            </Button>
          )}
        </div>
        {showHistory && past.length > 0 && <ul className="mt-2 divide-y border-t">{past.map(row)}</ul>}
      </CardContent>
    </Card>
  );
}
