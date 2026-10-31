import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileText, Loader2, Paperclip, X } from 'lucide-react';
import { db } from '@/db/database';
import type { DocumentCategory } from '@/db/types';
import { useCats, useClinicNames } from '@/hooks/useData';
import { addDocument } from '@/services/documents';
import { formatBytes } from '@/lib/utils';
import { validateUpload } from '@/validation/schemas';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';

export function CatSelect({ id = 'catId', error, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  const cats = useCats() ?? [];
  return (
    <Field label="Cat" htmlFor={id} error={error}>
      <Select {...props}>
        {cats.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.isDemo ? ' (demo)' : ''}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** Suggestions for clinic names already used on this device. */
export function ClinicDatalist() {
  const names = useClinicNames();
  return (
    <datalist id="clinic-names">
      {names.map((n) => (
        <option key={n} value={n} />
      ))}
    </datalist>
  );
}

export function SubmitBar({ saving, onCancel, label = 'Save', extra }: { saving: boolean; onCancel: () => void; label?: string; extra?: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-6 flex flex-col-reverse gap-2 border-t bg-background/95 px-5 pt-3 backdrop-blur sm:flex-row sm:items-center sm:justify-end">
      {extra && <div className="sm:mr-auto">{extra}</div>}
      <Button variant="outline" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
      <Button type="submit" disabled={saving} aria-live="polite">
        {saving ? (
          <>
            <Loader2 className="animate-spin" aria-hidden /> Saving…
          </>
        ) : (
          label
        )}
      </Button>
    </div>
  );
}

export interface AttachValue {
  existing: string[];
  pending: File[];
}

export const emptyAttach = (ids: string[] = []): AttachValue => ({ existing: ids, pending: [] });

/** Lets the user link existing documents of this cat and add new files. */
export function DocumentAttachField({ catId, value, onChange }: { catId: string; value: AttachValue; onChange: (v: AttachValue) => void }) {
  const docs = useLiveQuery(() => (catId ? db.documents.where('catId').equals(catId).toArray() : []), [catId]) ?? [];
  const [error, setError] = React.useState<string>();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const linked = docs.filter((d) => value.existing.includes(d.id));
  const unlinked = docs.filter((d) => !value.existing.includes(d.id));

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const ok: File[] = [];
    for (const f of Array.from(files)) {
      const problem = validateUpload(f);
      if (problem) {
        setError(`${f.name}: ${problem}`);
        continue;
      }
      ok.push(f);
    }
    if (ok.length) setError(undefined);
    onChange({ ...value, pending: [...value.pending, ...ok] });
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-semibold">
        Supporting documents <span className="font-normal text-muted-foreground">(optional)</span>
      </p>
      <ul className="space-y-1.5">
        {linked.map((d) => (
          <li key={d.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{d.title}</span>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
              aria-label={`Unlink ${d.title}`}
              onClick={() => onChange({ ...value, existing: value.existing.filter((x) => x !== d.id) })}
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
        {value.pending.map((f, i) => (
          <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-dashed bg-card px-3 py-2 text-sm">
            <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{f.name}</span>
            <span className="text-xs text-muted-foreground">{formatBytes(f.size)} · new</span>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
              aria-label={`Remove ${f.name}`}
              onClick={() => onChange({ ...value, pending: value.pending.filter((_, j) => j !== i) })}
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          <Paperclip aria-hidden /> Add file
        </Button>
        {unlinked.length > 0 && (
          <Select
            aria-label="Link an existing document"
            className="h-9 w-auto max-w-[220px] text-[13px]"
            value=""
            onChange={(e) => e.target.value && onChange({ ...value, existing: [...value.existing, e.target.value] })}
          >
            <option value="">Link existing…</option>
            {unlinked.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </Select>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        multiple
        accept="application/pdf,image/*,text/plain"
        onChange={(e) => onFiles(e.target.files)}
      />
      {error && (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Saves pending files as documents and returns the full list of linked ids. */
export async function persistAttachments(catId: string, value: AttachValue, date: string, category: DocumentCategory): Promise<string[]> {
  const ids = [...value.existing];
  for (const f of value.pending) {
    const doc = await addDocument(f, { catId, title: f.name.replace(/\.[^.]+$/, ''), category: f.type.startsWith('image/') && category === 'report' ? 'photo' : category, date });
    ids.push(doc.id);
  }
  return ids;
}
