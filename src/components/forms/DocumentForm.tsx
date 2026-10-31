import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileUp } from 'lucide-react';
import { toast } from 'sonner';
import type { DocumentFile } from '@/db/types';
import { documentFormSchema, validateUpload, type DocumentFormValues } from '@/validation/schemas';
import { addDocument, updateDocument } from '@/services/documents';
import { errorMessage } from '@/services/errors';
import { todayISO } from '@/lib/dates';
import { formatBytes } from '@/lib/utils';
import { DOCUMENT_CATEGORIES, options } from '@/lib/labels';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field, FormSection } from '@/components/ui/field';
import { CatSelect, SubmitBar } from './shared';

export function DocumentForm({ catId, edit, onDone }: { catId: string; edit?: DocumentFile; onDone: () => void }) {
  const [saving, setSaving] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string>();
  const { register, handleSubmit, setValue, getValues, formState } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      catId: edit?.catId ?? catId,
      title: edit?.title ?? '',
      category: edit?.category ?? 'report',
      date: edit?.date ?? todayISO(),
      notes: edit?.notes ?? '',
    },
  });
  const e = formState.errors;

  const pick = (f: File | undefined) => {
    if (!f) return;
    const problem = validateUpload(f);
    if (problem) {
      setFileError(problem);
      setFile(null);
      return;
    }
    setFileError(undefined);
    setFile(f);
    if (!getValues('title')) setValue('title', f.name.replace(/\.[^.]+$/, ''));
    if (f.type.startsWith('image/') && getValues('category') === 'report') setValue('category', 'photo');
  };

  const onSubmit = handleSubmit(async (v) => {
    if (!edit && !file) {
      setFileError('Choose a file to upload');
      return;
    }
    setSaving(true);
    try {
      if (edit) await updateDocument(edit.id, v);
      else await addDocument(file!, v);
      toast.success(edit ? 'Document updated' : 'Document saved on this device');
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {!edit && (
        <div>
          <label
            htmlFor="doc-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-card px-4 py-8 text-center hover:border-primary/50 focus-within:ring-2 focus-within:ring-ring"
          >
            <FileUp className="h-6 w-6 text-primary" aria-hidden />
            {file ? (
              <span className="text-sm">
                <span className="font-semibold">{file.name}</span>
                <span className="text-muted-foreground"> · {formatBytes(file.size)}</span>
              </span>
            ) : (
              <span className="text-sm">
                <span className="font-semibold text-primary">Choose a file</span>
                <span className="block text-muted-foreground">PDF or image, up to 25 MB</span>
              </span>
            )}
            <input
              id="doc-file"
              type="file"
              className="sr-only"
              accept="application/pdf,image/*,text/plain"
              onChange={(ev) => pick(ev.target.files?.[0])}
              aria-invalid={fileError ? true : undefined}
              aria-describedby={fileError ? 'doc-file-error' : undefined}
            />
          </label>
          {fileError && (
            <p id="doc-file-error" role="alert" className="mt-1.5 text-[13px] text-destructive">
              {fileError}
            </p>
          )}
        </div>
      )}
      <FormSection>
        {!edit && <CatSelect {...register('catId')} error={e.catId?.message} />}
        <Field label="Title" htmlFor="doc-title" error={e.title?.message}>
          <Input {...register('title')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" htmlFor="doc-cat">
            <Select {...register('category')}>
              {options(DOCUMENT_CATEGORIES).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Document date" htmlFor="doc-date" error={e.date?.message}>
            <Input type="date" {...register('date')} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="doc-notes" optional>
          <Textarea {...register('notes')} />
        </Field>
      </FormSection>
      <SubmitBar saving={saving} onCancel={onDone} label={edit ? 'Save changes' : 'Upload'} />
    </form>
  );
}
