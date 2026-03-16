import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import { format } from 'date-fns';
import { PackagePlus, ArrowRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog } from '../components/ui/dialog';
import { FileUpload } from '../components/ui/file-upload';
import type { Batch, BatchStatus } from '../lib/types';

const LIST_BATCHES = gql`
  query ListBatches {
    batches {
      batchId
      drugName
      manufacturerId
      quantity
      expiryDate
      currentCustodian
      status
      createdAt
    }
  }
`;

const MINT_BATCH = gql`
  mutation MintBatch(
    $batchId: String!
    $drugName: String!
    $composition: String!
    $expiryDate: String!
    $quantity: Int!
    $details: String
  ) {
    mintBatch(
      batchId: $batchId
      drugName: $drugName
      composition: $composition
      expiryDate: $expiryDate
      quantity: $quantity
      details: $details
    ) {
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

const EMPTY_FORM = {
  batchId: '',
  drugName: '',
  composition: '',
  expiryDate: '',
  quantity: '',
  licenseNo: '',
};

type UploadedFiles = {
  productImage: File[];
  gmpCert: File[];
  labReport: File[];
};

const EMPTY_FILES: UploadedFiles = { productImage: [], gmpCert: [], labReport: [] };

export default function Batches() {
  const { data, loading, refetch } = useQuery<{ batches: Batch[] }>(LIST_BATCHES, {
    pollInterval: 15_000,
  });

  const [mintBatch, { loading: minting }] = useMutation(MINT_BATCH);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState<UploadedFiles>(EMPTY_FILES);
  const [mintError, setMintError] = useState('');
  const [mintSuccess, setMintSuccess] = useState('');

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setMintError('');
    setMintSuccess('');
    if (!form.batchId || !form.drugName || !form.composition || !form.expiryDate || !form.quantity) {
      setMintError('All fields except license number are required.');
      return;
    }
    try {
      const details = form.licenseNo ? JSON.stringify({ licenseNo: form.licenseNo }) : '{}';
      const { data: result } = await mintBatch({
        variables: {
          batchId: form.batchId,
          drugName: form.drugName,
          composition: form.composition,
          expiryDate: form.expiryDate,
          quantity: parseInt(form.quantity, 10),
          details,
        },
      });
      setMintSuccess(result.mintBatch.message);
      setForm(EMPTY_FORM);
      setFiles(EMPTY_FILES);
      refetch();
    } catch (err: unknown) {
      setMintError(err instanceof Error ? err.message : 'Mint failed.');
    }
  };

  const batches = data?.batches ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h1 className="text-sm font-semibold">Batches</h1>
          <Button size="sm" onClick={() => { setOpen(true); setMintSuccess(''); setMintError(''); }}>
            <PackagePlus className="h-3.5 w-3.5 mr-1.5" />
            Mint batch
          </Button>
        </div>

        {/* Batch table */}
        <div className="px-6 py-6">
          {loading && batches.length === 0 ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : batches.length === 0 ? (
            <div className="border border-border px-4 py-10 text-center">
              <p className="text-xs text-muted-foreground">No batches on chain yet.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setOpen(true)}>
                Mint the first batch
              </Button>
            </div>
          ) : (
            <div className="border border-border divide-y divide-border">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1fr_1fr_80px_100px_32px] gap-4 px-4 py-2 bg-muted/40">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Batch ID</span>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Drug</span>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Custodian</span>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Qty</span>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                <span />
              </div>

              {batches.map((b) => (
                <div
                  key={b.batchId}
                  className="grid grid-cols-[1fr_1fr_1fr_80px_100px_32px] gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono truncate">{b.batchId}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(b.createdAt), 'd MMM yyyy')}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs truncate">{b.drugName}</p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">{b.manufacturerId}</p>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground truncate">{b.currentCustodian}</p>
                  <p className="text-xs tabular-nums">{b.quantity.toLocaleString()}</p>
                  <Badge variant={STATUS_VARIANT[b.status]}>{b.status.replace('_', ' ')}</Badge>
                  <Link to={`/batches/${b.batchId}`} className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mint Batch dialog */}
        {open && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-border w-full max-w-md shadow-lg flex flex-col max-h-[90vh]">
              <div className="px-5 py-4 border-b border-border shrink-0">
                <h2 className="text-sm font-semibold">Mint new batch</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Records the batch on Hyperledger Fabric and anchors the hash to Sui.
                </p>
              </div>

              <form onSubmit={handleMint} className="px-5 py-4 space-y-3.5 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="batchId">Batch ID</Label>
                    <Input id="batchId" placeholder="BATCH-2026-004" value={form.batchId} onChange={set('batchId')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quantity">Quantity (units)</Label>
                    <Input id="quantity" type="number" min="1" placeholder="10000" value={form.quantity} onChange={set('quantity')} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="drugName">Drug name</Label>
                  <Input id="drugName" placeholder="Amoxicillin 500mg" value={form.drugName} onChange={set('drugName')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="composition">Composition</Label>
                  <Input id="composition" placeholder="Amoxicillin trihydrate 574mg eq. to..." value={form.composition} onChange={set('composition')} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="expiryDate">Expiry date</Label>
                    <Input id="expiryDate" type="date" value={form.expiryDate} onChange={set('expiryDate')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="licenseNo">Mfg. license no.</Label>
                    <Input id="licenseNo" placeholder="MFG-DL-2024-1182" value={form.licenseNo} onChange={set('licenseNo')} />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-border">
                  <Label>Attachments</Label>
                  <FileUpload
                    accept="image/png,image/jpeg,image/webp,.pdf"
                    multiple
                    hint="Product image, GMP cert, lab report — PNG, JPG, PDF up to 10 MB each"
                    onChange={(f) => setFiles((prev) => ({ ...prev, productImage: f }))}
                  />
                </div>

                {mintError && <p className="text-xs text-destructive">{mintError}</p>}
                {mintSuccess && (
                  <p className="text-xs text-green-600 font-medium">✓ {mintSuccess}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button type="submit" size="sm" disabled={minting}>
                    {minting ? 'Minting...' : 'Mint batch'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
