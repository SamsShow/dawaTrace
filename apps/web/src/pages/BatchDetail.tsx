import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useBatch, useVerifyBatch } from '../hooks/useBatch';
import { useRecall } from '../hooks/useRecall';
import Sidebar from '../components/Sidebar';
import CustodyTimeline from '../components/CustodyTimeline';
import RecallBanner from '../components/RecallBanner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { FileUpload } from '../components/ui/file-upload';
import type { BatchStatus } from '../lib/types';

const TRANSFER_BATCH = gql`
  mutation TransferBatch($batchId: String!, $toNode: String!, $quantity: Int!, $gpsLocation: String) {
    transferBatch(batchId: $batchId, toNode: $toNode, quantity: $quantity, gpsLocation: $gpsLocation) {
      success
      message
    }
  }
`;

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
  const [transferBatch, { loading: transferring }] = useMutation(TRANSFER_BATCH);

  const [showRecallForm, setShowRecallForm] = useState(false);
  const [reason, setReason] = useState('');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferForm, setTransferForm] = useState({ toNode: '', quantity: '', gpsLocation: '' });
  const [transferMsg, setTransferMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferMsg(null);
    try {
      const res = await transferBatch({
        variables: {
          batchId: batchId ?? '',
          toNode: transferForm.toNode,
          quantity: parseInt(transferForm.quantity, 10),
          gpsLocation: transferForm.gpsLocation || undefined,
        },
      });
      setTransferMsg({ ok: true, text: res.data.transferBatch.message });
      setTransferForm({ toNode: '', quantity: '', gpsLocation: '' });
    } catch (err: unknown) {
      setTransferMsg({ ok: false, text: err instanceof Error ? err.message : 'Transfer failed.' });
    }
  };

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
            {batch.status !== 'RECALLED' && batch.status !== 'DISPENSED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowTransferForm((v) => !v); setShowRecallForm(false); setTransferMsg(null); }}
              >
                Transfer custody
              </Button>
            )}
            {batch.status !== 'RECALLED' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setShowRecallForm((v) => !v); setShowTransferForm(false); }}
              >
                Issue Recall
              </Button>
            )}
          </div>
        </div>

        <div className="px-6 py-6 max-w-2xl space-y-6">
          {/* Transfer custody form */}
          {showTransferForm && (
            <section className="border border-border p-4 space-y-3">
              <h2 className="text-xs font-semibold">Transfer custody</h2>
              <p className="text-xs text-muted-foreground">
                Moves custodianship to another supply chain node and records the transfer on Fabric.
              </p>
              <form onSubmit={handleTransfer} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="toNode">Destination node ID</Label>
                    <Input
                      id="toNode"
                      placeholder="DIST-DELHI-002"
                      value={transferForm.toNode}
                      onChange={(e) => setTransferForm((f) => ({ ...f, toNode: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="transferQty">Quantity</Label>
                    <Input
                      id="transferQty"
                      type="number"
                      min="1"
                      placeholder={String(batch.quantity)}
                      value={transferForm.quantity}
                      onChange={(e) => setTransferForm((f) => ({ ...f, quantity: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gps">GPS coordinates <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    id="gps"
                    placeholder="28.6139,77.2090"
                    value={transferForm.gpsLocation}
                    onChange={(e) => setTransferForm((f) => ({ ...f, gpsLocation: e.target.value }))}
                  />
                </div>
                {transferMsg && (
                  <p className={`text-xs ${transferMsg.ok ? 'text-green-600' : 'text-destructive'}`}>
                    {transferMsg.ok ? '✓ ' : ''}{transferMsg.text}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={!transferForm.toNode || !transferForm.quantity || transferring}>
                    {transferring ? 'Transferring...' : 'Confirm transfer'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowTransferForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </section>
          )}

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

          {/* Documents */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Documents
            </h2>
            <div className="border border-border divide-y divide-border">
              <div className="px-4 py-3">
                <p className="text-[11px] text-muted-foreground mb-1.5">Product image</p>
                <FileUpload
                  accept="image/png,image/jpeg,image/webp"
                  hint="PNG, JPG up to 5 MB"
                  maxSizeMB={5}
                />
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] text-muted-foreground mb-1.5">GMP / manufacturing certificate</p>
                <FileUpload
                  accept=".pdf,image/png,image/jpeg"
                  hint="PDF or image, up to 10 MB"
                />
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] text-muted-foreground mb-1.5">Lab test report</p>
                <FileUpload
                  accept=".pdf,image/png,image/jpeg"
                  hint="PDF or image, up to 10 MB"
                />
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] text-muted-foreground mb-1.5">Additional documents</p>
                <FileUpload
                  accept=".pdf,image/png,image/jpeg,.doc,.docx"
                  multiple
                  hint="Multiple files, up to 10 MB each"
                />
              </div>
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
