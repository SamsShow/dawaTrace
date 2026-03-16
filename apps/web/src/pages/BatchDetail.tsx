import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useBatch, useVerifyBatch } from '../hooks/useBatch';
import { useRecall } from '../hooks/useRecall';
import Sidebar from '../components/Sidebar';
import CustodyTimeline from '../components/CustodyTimeline';
import RecallBanner from '../components/RecallBanner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import type { BatchStatus } from '../lib/types';

const STATUS_VARIANT: Record<BatchStatus, 'outline' | 'destructive' | 'warning' | 'success' | 'secondary'> = {
  ACTIVE: 'success',
  IN_TRANSIT: 'outline',
  DISPENSED: 'secondary',
  RECALLED: 'destructive',
  SUSPENDED_REVIEW: 'warning',
};

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="py-2.5 border-b border-border last:border-0 flex items-baseline justify-between gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs text-foreground text-right truncate ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function BatchDetail() {
  const { batchId } = useParams<{ batchId: string }>();
  const { data, loading } = useBatch(batchId ?? '');
  const batch = data?.batch;
  const { data: verifyData } = useVerifyBatch(batch?.suiObjectId ?? '');
  const verification = verifyData?.verifyBatch;
  const { recall, loading: recalling } = useRecall();
  const [showRecallForm, setShowRecallForm] = useState(false);
  const [reason, setReason] = useState('');

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Loading...</span>
        </main>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Batch not found</span>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {batch.status === 'RECALLED' && (
          <RecallBanner
            recall={{ batchId: batch.batchId, regulatorId: '', reason: '', timestamp: batch.updatedAt, suiTxDigest: '' }}
          />
        )}

        {/* Page header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{batch.drugName}</h1>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{batch.batchId}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge variant={STATUS_VARIANT[batch.status]}>
              {batch.status.replace('_', ' ')}
            </Badge>
            {batch.status !== 'RECALLED' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowRecallForm((v) => !v)}
              >
                Issue Recall
              </Button>
            )}
          </div>
        </div>

        <div className="px-6 py-6 max-w-2xl space-y-6">
          {/* Recall form */}
          {showRecallForm && (
            <section className="border border-destructive/30 p-4 space-y-3">
              <h2 className="text-xs font-semibold text-destructive">Confirm recall</h2>
              <p className="text-xs text-muted-foreground">
                This action is irreversible. The recall will be anchored to the Sui public layer within 60 seconds.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  rows={3}
                  placeholder="Contamination detected, labeling error..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={reason.length < 10 || recalling}
                  onClick={async () => {
                    await recall(batch.batchId, reason);
                    setShowRecallForm(false);
                  }}
                >
                  {recalling ? 'Issuing...' : 'Confirm'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowRecallForm(false)}>
                  Cancel
                </Button>
              </div>
            </section>
          )}

          {/* Batch metadata */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Batch details
            </h2>
            <div className="border border-border px-4">
              <Field label="Drug name" value={batch.drugName} />
              <Field label="Composition" value={batch.composition} />
              <Field label="Expiry date" value={batch.expiryDate} />
              <Field label="Quantity" value={batch.quantity.toLocaleString()} />
              <Field label="Manufacturer" value={batch.manufacturerId} mono />
              <Field label="Current custodian" value={batch.currentCustodian} mono />
              <Field label="Sui Object ID" value={batch.suiObjectId} mono />
              <Field label="Data hash" value={batch.dataHash} mono />
            </div>
          </section>

          {/* Custody timeline */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Chain of custody
              <span className="ml-2 font-normal normal-case text-muted-foreground/60">
                via Sui public layer
              </span>
            </h2>
            <CustodyTimeline
              records={verification?.custodyChain ?? []}
              recalled={verification?.recalled}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
