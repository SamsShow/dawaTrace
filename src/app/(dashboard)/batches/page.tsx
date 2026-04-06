'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, gql } from '@apollo/client';
import { format } from 'date-fns';
import { PackagePlus, Download, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FileUpload } from '@/components/ui/file-upload';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import type { Batch, BatchStatus } from '@/lib/types';

const LIST_BATCHES = gql`query ListBatches { batches { batchId drugName manufacturerId quantity expiryDate currentCustodian status createdAt } }`;
const MINT_BATCH = gql`mutation MintBatch($batchId: String!, $drugName: String!, $composition: String!, $expiryDate: String!, $quantity: Int!, $details: String) { mintBatch(batchId: $batchId, drugName: $drugName, composition: $composition, expiryDate: $expiryDate, quantity: $quantity, details: $details) { success message } }`;

const STATUS_VARIANT: Record<BatchStatus, 'outline' | 'destructive' | 'secondary' | 'default'> = {
  ACTIVE: 'default',
  IN_TRANSIT: 'outline',
  DISPENSED: 'secondary',
  RECALLED: 'destructive',
  SUSPENDED_REVIEW: 'outline',
};

const STATUS_LABEL: Record<BatchStatus, string> = {
  ACTIVE: 'Active',
  IN_TRANSIT: 'In Transit',
  DISPENSED: 'Dispensed',
  RECALLED: 'Recalled',
  SUSPENDED_REVIEW: 'Under Review',
};

const EMPTY_FORM = { batchId: '', drugName: '', composition: '', expiryDate: '', quantity: '', licenseNo: '' };

async function downloadExport(path: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = match?.[1] || 'export';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function Batches() {
  const { user } = useAuth();
  const isRegulator = user?.orgRole === 'REGULATOR';
  const { data, loading, refetch } = useQuery<{ batches: Batch[] }>(LIST_BATCHES, { pollInterval: 15_000 });
  const [mintBatch, { loading: minting }] = useMutation(MINT_BATCH);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mintError, setMintError] = useState('');
  const [mintSuccess, setMintSuccess] = useState('');

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setMintError(''); setMintSuccess('');
    if (!form.batchId || !form.drugName || !form.composition || !form.expiryDate || !form.quantity) {
      setMintError('All fields except license number are required.'); return;
    }
    try {
      const details = form.licenseNo ? JSON.stringify({ licenseNo: form.licenseNo }) : '{}';
      const { data: result } = await mintBatch({
        variables: { batchId: form.batchId, drugName: form.drugName, composition: form.composition, expiryDate: form.expiryDate, quantity: parseInt(form.quantity, 10), details },
      });
      setMintSuccess(result.mintBatch.message);
      setForm(EMPTY_FORM);
      refetch();
    } catch (err: unknown) {
      setMintError(err instanceof Error ? err.message : 'Mint failed.');
    }
  };

  const batches = data?.batches ?? [];

  return (
    <>
      {/* Page header */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Batches</h1>
          <p className="text-xs text-muted-foreground mt-0.5">All pharmaceutical batches tracked on Sui</p>
        </div>
        <div className="flex items-center gap-2">
          {isRegulator && (
            <>
              <Button size="sm" variant="outline" onClick={() => downloadExport('/api/exports/batches?format=csv')}>
                <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadExport('/api/exports/batches?format=json')}>
                <Download className="h-3.5 w-3.5 mr-1.5" />Export JSON
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => { setOpen(true); setMintSuccess(''); setMintError(''); }}>
            <PackagePlus className="h-3.5 w-3.5 mr-1.5" />Mint Batch
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="px-6 py-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Batch Registry
              </CardTitle>
              {!loading && (
                <span className="text-xs text-muted-foreground">
                  {batches.length} {batches.length === 1 ? 'batch' : 'batches'}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!loading && batches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <PackagePlus className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No batches on chain yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">Mint the first batch to get started.</p>
                <Button size="sm" onClick={() => setOpen(true)}>
                  <PackagePlus className="h-3.5 w-3.5 mr-1.5" />Mint first batch
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 text-xs font-medium text-muted-foreground uppercase tracking-wide">Batch ID</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Drug Name</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Manufacturer</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custodian</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quantity</TableHead>
                    <TableHead className="pr-6 text-xs font-medium text-muted-foreground uppercase tracking-wide">Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableSkeleton />
                  ) : (
                    batches.map((b) => (
                      <TableRow
                        key={b.batchId}
                        className="cursor-pointer group"
                      >
                        <TableCell className="pl-6">
                          <Link href={`/batches/${b.batchId}`} className="block">
                            <span className="font-mono text-xs font-medium group-hover:text-primary transition-colors flex items-center gap-1.5">
                              {b.batchId}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </span>
                            <span className="text-[11px] text-muted-foreground mt-0.5 block">
                              {format(new Date(b.createdAt), 'd MMM yyyy')}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/batches/${b.batchId}`} className="block text-xs">
                            {b.drugName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/batches/${b.batchId}`} className="block font-mono text-xs text-muted-foreground">
                            {b.manufacturerId}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/batches/${b.batchId}`} className="block">
                            <Badge variant={STATUS_VARIANT[b.status]} className="text-[11px]">
                              {STATUS_LABEL[b.status]}
                            </Badge>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/batches/${b.batchId}`} className="block font-mono text-xs text-muted-foreground truncate max-w-[180px]">
                            {b.currentCustodian}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/batches/${b.batchId}`} className="block text-xs tabular-nums">
                            {b.quantity.toLocaleString()}
                          </Link>
                        </TableCell>
                        <TableCell className="pr-6">
                          <Link href={`/batches/${b.batchId}`} className="block text-xs text-muted-foreground">
                            {format(new Date(b.expiryDate), 'd MMM yyyy')}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mint batch modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold">Mint new batch</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Records the batch on Sui with a SHA-256 integrity hash.</p>
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
                <FileUpload accept="image/png,image/jpeg,image/webp,.pdf" multiple hint="Product image, GMP cert, lab report — PNG, JPG, PDF up to 10 MB each" />
              </div>
              {mintError && <p className="text-xs text-destructive">{mintError}</p>}
              {mintSuccess && <p className="text-xs text-green-600 font-medium">{mintSuccess}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={minting}>{minting ? 'Minting...' : 'Mint batch'}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
