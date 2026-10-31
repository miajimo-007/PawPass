import type { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MedicalRecord, Medication, Vaccination } from '@/db/types';
import type { TimelineItem } from '@/services/records';
import { deleteRecord } from '@/services/records';
import { deleteVaccination } from '@/services/vaccinations';
import { deleteMedication } from '@/services/medications';
import { formatDate } from '@/lib/dates';
import { RECORD_CATEGORIES, ROUTE_LABELS } from '@/lib/labels';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { KeyValue } from '@/components/ui/misc';
import { useActions } from '@/components/forms/ActionsProvider';
import { LinkedDocuments } from './DocumentViewer';
import { SourceBadge } from './displays';

function TextBlock({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    </div>
  );
}

export function TimelineDetailDialog({ item, onClose }: { item: TimelineItem | null; onClose: () => void }) {
  const confirm = useConfirm();
  const act = useActions();
  if (!item) return <Dialog open={false} />;

  const onEdit = () => {
    onClose();
    if (item.kind === 'record') act({ type: 'record', edit: item.ref as MedicalRecord });
    if (item.kind === 'vaccination') act({ type: 'vaccination', edit: item.ref as Vaccination });
    if (item.kind === 'medication') act({ type: 'medication', edit: item.ref as Medication });
  };
  const onDelete = async () => {
    const ok = await confirm({
      title: 'Delete this entry?',
      description:
        item.kind === 'medication'
          ? 'The medication and its full dose history will be permanently removed from this device.'
          : 'This entry will be permanently removed from this device. Linked documents are kept.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    if (item.kind === 'record') await deleteRecord(item.id);
    if (item.kind === 'vaccination') await deleteVaccination(item.id);
    if (item.kind === 'medication') await deleteMedication(item.id);
    toast.success('Deleted');
    onClose();
  };

  let body: ReactNode = null;
  if (item.kind === 'record') {
    const r = item.ref as MedicalRecord;
    body = (
      <>
        <dl className="divide-y">
          <KeyValue label="Type" value={RECORD_CATEGORIES[r.category]} />
          <KeyValue label="Date" value={r.endDate ? `${formatDate(r.date)} – ${formatDate(r.endDate)}` : formatDate(r.date)} />
          <KeyValue label="Clinic" value={r.clinic} />
          <KeyValue label="Veterinarian" value={r.veterinarian} />
        </dl>
        <TextBlock label="Description" text={r.description} />
        <TextBlock label="Findings" text={r.findings} />
        <TextBlock label="Treatment" text={r.treatment} />
        <TextBlock label="Clinical notes" text={r.notes} />
        <LinkedDocuments ids={r.documentIds ?? []} />
      </>
    );
  } else if (item.kind === 'vaccination') {
    const v = item.ref as Vaccination;
    body = (
      <>
        <dl className="divide-y">
          <KeyValue label="Date given" value={formatDate(v.dateGiven)} />
          <KeyValue label="Next due (vet-confirmed)" value={v.nextDueDate ? formatDate(v.nextDueDate) : undefined} />
          <KeyValue label="Batch number" value={v.batchNumber} />
          <KeyValue label="Clinic" value={v.clinic} />
          <KeyValue label="Veterinarian" value={v.veterinarian} />
        </dl>
        <TextBlock label="Notes" text={v.notes} />
        <LinkedDocuments ids={v.documentIds ?? []} />
      </>
    );
  } else {
    const m = item.ref as Medication;
    body = (
      <>
        <dl className="divide-y">
          <KeyValue label="Prescribed dosage" value={m.dosage} />
          <KeyValue label="Route" value={ROUTE_LABELS[m.route]} />
          <KeyValue label="Frequency" value={m.frequency} />
          <KeyValue label="Dates" value={`${formatDate(m.startDate)}${m.endDate ? ` – ${formatDate(m.endDate)}` : ' – ongoing'}`} />
          <KeyValue label="Prescribed by" value={m.prescribedBy} />
          <KeyValue label="For condition" value={m.condition} />
        </dl>
        <TextBlock label="Instructions" text={m.instructions} />
        <LinkedDocuments ids={m.documentIds ?? []} />
      </>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={item.title} size="lg">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={item.source} />
            {item.ref.isDemo && <span className="text-xs text-muted-foreground">Fictional demo data</span>}
          </div>
          {body}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button variant="outline" onClick={onEdit}>
              <Pencil aria-hidden /> Edit
            </Button>
            <Button variant="destructive-outline" onClick={onDelete}>
              <Trash2 aria-hidden /> Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
