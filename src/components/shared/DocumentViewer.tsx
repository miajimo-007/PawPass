import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import { db } from '@/db/database';
import type { DocumentFile } from '@/db/types';
import { downloadBlob, isImage, isPdf } from '@/services/documents';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { formatDate } from '@/lib/dates';
import { DOCUMENT_CATEGORIES } from '@/lib/labels';
import { formatBytes } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function DocumentPreview({ doc }: { doc: DocumentFile }) {
  const url = useObjectUrl(doc.blob);
  if (!url) return null;
  return (
    <div className="space-y-4">
      {isImage(doc.mimeType) ? (
        <img src={url} alt={doc.title} className="mx-auto max-h-[60dvh] w-auto rounded-lg border object-contain" />
      ) : isPdf(doc.mimeType) ? (
        <iframe src={url} title={doc.title} className="h-[60dvh] w-full rounded-lg border bg-white" />
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-card py-10 text-sm text-muted-foreground">
          <FileText className="h-8 w-8" aria-hidden />
          Preview is not available for this file type. Download it to open.
        </div>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Category</dt>
        <dd>{DOCUMENT_CATEGORIES[doc.category]}</dd>
        <dt className="text-muted-foreground">Date</dt>
        <dd>{formatDate(doc.date)}</dd>
        <dt className="text-muted-foreground">File</dt>
        <dd className="truncate">
          {doc.fileName} · {formatBytes(doc.size)}
        </dd>
      </dl>
      {doc.notes && <p className="whitespace-pre-wrap text-sm">{doc.notes}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => window.open(url, '_blank', 'noopener')}>
          <ExternalLink aria-hidden /> Open
        </Button>
        <Button variant="outline" onClick={() => downloadBlob(doc.blob, doc.fileName)}>
          <Download aria-hidden /> Download
        </Button>
      </div>
    </div>
  );
}

export function DocumentViewerDialog({ doc, onOpenChange }: { doc: DocumentFile | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!doc} onOpenChange={onOpenChange}>
      {doc && (
        <DialogContent title={doc.title} size="lg">
          <DocumentPreview doc={doc} />
        </DialogContent>
      )}
    </Dialog>
  );
}

/** Compact list of documents linked to a record, opening the viewer on tap. */
export function LinkedDocuments({ ids }: { ids: string[] }) {
  const docs = useLiveQuery(() => (ids.length ? db.documents.bulkGet(ids) : Promise.resolve([])), [ids.join(',')]) ?? [];
  const [open, setOpen] = React.useState<DocumentFile | null>(null);
  const present = docs.filter((d): d is DocumentFile => !!d);
  if (!present.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="eyebrow">Documents</p>
      <ul className="space-y-1.5">
        {present.map((d) => (
          <li key={d.id}>
            <button type="button" onClick={() => setOpen(d)} className="flex min-h-11 w-full items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-left text-sm hover:bg-muted">
              {isImage(d.mimeType) ? <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden /> : <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />}
              <span className="min-w-0 flex-1 truncate font-medium">{d.title}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(d.size)}</span>
            </button>
          </li>
        ))}
      </ul>
      <DocumentViewerDialog doc={open} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}
