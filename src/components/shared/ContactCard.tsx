import * as React from 'react';
import { toast } from 'sonner';
import { usePrefs } from '@/hooks/useData';
import { DEFAULT_PREFS, updatePrefs } from '@/services/prefs';
import { errorMessage } from '@/services/errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

/** Owner contact details used on the pet sitter card, lost-cat poster and emergency screen. Stored only on this device. */
export function ContactCard() {
  const prefs = usePrefs() ?? DEFAULT_PREFS;
  const [draft, setDraft] = React.useState<{ ownerPhone?: string; emergencyContactName?: string; emergencyContactPhone?: string } | null>(null);
  const v = draft ?? { ownerPhone: prefs.ownerPhone, emergencyContactName: prefs.emergencyContactName, emergencyContactPhone: prefs.emergencyContactPhone };
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...v, [k]: e.target.value });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Contact details</CardTitle>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Used on the sitter card, lost-cat poster and emergency screen.</p>
        </div>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await updatePrefs({
                ownerPhone: v.ownerPhone?.trim() || undefined,
                emergencyContactName: v.emergencyContactName?.trim() || undefined,
                emergencyContactPhone: v.emergencyContactPhone?.trim() || undefined,
              });
              setDraft(null);
              toast.success('Contact details saved');
            } catch (err) {
              toast.error(errorMessage(err));
            }
          }}
        >
          <Field label="Your phone" htmlFor="owner-phone" optional>
            <Input type="tel" autoComplete="tel" value={v.ownerPhone ?? ''} onChange={set('ownerPhone')} />
          </Field>
          <Field label="Emergency contact" htmlFor="ec-name" optional>
            <Input autoComplete="off" value={v.emergencyContactName ?? ''} onChange={set('emergencyContactName')} />
          </Field>
          <Field label="Their phone" htmlFor="ec-phone" optional>
            <Input type="tel" autoComplete="off" value={v.emergencyContactPhone ?? ''} onChange={set('emergencyContactPhone')} />
          </Field>
          <Button type="submit" variant="secondary" className="w-fit sm:col-span-3" disabled={!draft}>
            Save contacts
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
