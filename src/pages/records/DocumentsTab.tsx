import * as React from 'react';
import { FileText, Image as ImageIcon, Pencil, Search, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { DocumentCategory, DocumentFile } from '@/db/types';
import type { CatData } from '@/hooks/useData';
import { deleteDocument, downloadBlob, isImage } from '@/services/documents';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { formatDate } from '@/lib/dates';
import { formatBytes } from '@/lib/utils';
import { DOCUMENT_CATEGORIES, options } from '@/lib/labels';
import { useActions } from '@/components/forms/ActionsProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm';
import { EmptyState } from '@/components/ui/misc';
import { ItemMenu } from '@/components/shared/ItemMenu';
import { DocumentViewerDialog } from '@/components/shared/DocumentViewer';

function Thumb({ doc }: { doc: DocumentFile }) {
  const url = useObjectUrl(isImage(doc.mimeType) ? doc.blob : null);
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : doc.mimeType.startsWith('image/') ? <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden /> : <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />}
    </span>
  );
}

export function DocumentsTab({ catId, data }: { catId: string; data: CatData }) {
  const act = useActions();
  const confirm = useConfirm();
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<DocumentCategory | ''>('');
  const [open, setOpen] = React.useState<DocumentFile | null>(null);

  const q = query.trim().toLowerCase();
  const docs = data.documents
    .filter((d) => !category || d.category === category)
    .filter((d) => !q || [d.title, d.fileName, d.notes].filter(Boolean).join(' ').toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date));
  const totalBytes = data.documents.reduce((s, d) => s + (d.size ?? 0), 0);

  if (!data.documents.length) {
    return (
      <Card>
        <EmptyState
          icon={FileText}
          title="No documents"
          description="Upload lab reports, prescriptions, imaging, invoices and photos. Files are stored only in this browser."
          action={<Button onClick={() => act({ type: 'document', catId })}>Upload document</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" aria-label="Search documents" placeholder="Search documents" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        <Select aria-label="Filter by category" className="sm:w-56" value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory | '')}>
          <option value="">All categories</option>
          {options(DOCUMENT_CATEGORIES).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      {docs.length ? (
        <Card className="divide-y overflow-hidden">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-2 pr-1">
              <button type="button" onClick={() => setOpen(d)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-muted/60">
                <Thumb doc={d} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{d.title}</span>
                  <span className="block truncate text-[13px] text-muted-foreground">
                    {DOCUMENT_CATEGORIES[d.category]} · {formatDate(d.date)} · {formatBytes(d.size)}
                  </span>
                </span>
              </button>
              <ItemMenu
                label={`Options for ${d.title}`}
                items={[
                  { label: 'Download', icon: Download, onSelect: () => downloadBlob(d.blob, d.fileName) },
                  { label: 'Edit details', icon: Pencil, onSelect: () => act({ type: 'document', edit: d }) },
                  {
                    label: 'Delete',
                    icon: Trash2,
                    destructive: true,
                    onSelect: async () => {
                      if (await confirm({ title: 'Delete document?', description: `"${d.title}" will be removed from this device and unlinked from any records.`, confirmLabel: 'Delete', destructive: true })) {
                        await deleteDocument(d.id);
                        toast.success('Document deleted');
                      }
                    },
                  },
                ]}
              />
            </div>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState compact icon={Search} title="No documents match" />
        </Card>
      )}
      <p className="text-center text-[12px] text-muted-foreground">
        {data.documents.length} documents · {formatBytes(totalBytes)} stored on this device
      </p>
      <DocumentViewerDialog doc={open} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}
