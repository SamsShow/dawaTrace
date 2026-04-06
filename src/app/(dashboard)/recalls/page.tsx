'use client';

import { AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';

async function downloadExport(path: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || 'export';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

const MOCK_RECALLS = [
  { batchId: 'BATCH-2024-0891', drug: 'Amoxicillin 500mg', reason: 'Subpotent — failed dissolution test', issuedBy: 'CDSCO-REG-001', issuedAt: '2026-03-15', suiAnchored: true },
  { batchId: 'BATCH-2024-0742', drug: 'Paracetamol 650mg', reason: 'Contamination detected — microbial', issuedBy: 'CDSCO-REG-002', issuedAt: '2026-03-12', suiAnchored: true },
];

export default function Recalls() {
  const { user } = useAuth();
  const isRegulator = user?.orgRole === 'REGULATOR';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Recalls</h1>
        </div>
        {isRegulator && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadExport('/api/exports/recalls?format=csv')}>
              <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadExport('/api/exports/recalls?format=json')}>
              <Download className="h-3.5 w-3.5 mr-1.5" />Export JSON
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Active Recalls</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {MOCK_RECALLS.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertTriangle className="h-10 w-10 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No active recalls.</p>
              <p className="text-xs text-muted-foreground">Issue recalls from the batch detail page.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] uppercase">Batch</TableHead>
                  <TableHead className="text-[11px] uppercase">Reason</TableHead>
                  <TableHead className="text-[11px] uppercase">Issued By</TableHead>
                  <TableHead className="text-[11px] uppercase">Date</TableHead>
                  <TableHead className="text-[11px] uppercase">Sui Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_RECALLS.map((r) => (
                  <TableRow key={r.batchId}>
                    <TableCell>
                      <p className="text-xs font-mono font-medium text-foreground">{r.batchId}</p>
                      <p className="text-xs text-muted-foreground">{r.drug}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">{r.reason}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{r.issuedBy}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.issuedAt}</TableCell>
                    <TableCell>
                      <Badge variant={r.suiAnchored ? 'secondary' : 'outline'}>
                        {r.suiAnchored ? 'Anchored' : 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Issue recalls from the batch detail page. Each recall is anchored to Sui within 60 s.</p>
    </div>
  );
}
