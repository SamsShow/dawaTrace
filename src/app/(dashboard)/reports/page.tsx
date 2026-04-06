'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
interface Report {
  id: string; batchId: string; reporterAddress: string; reason: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED'; createdAt: number;
  resolvedAt: number | null; pointsAwarded: number | null;
}

const STATUS_VARIANT: Record<Report['status'], 'default' | 'success' | 'destructive' | 'warning'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  REJECTED: 'destructive',
};

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query { reports { id batchId reporterAddress reason status createdAt resolvedAt pointsAwarded } }` }),
      });
      const json = await res.json();
      setReports(json.data?.reports ?? []);
    } catch { /* empty state */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleResolve = async (id: string, status: 'CONFIRMED' | 'REJECTED') => {
    setResolving(id);
    try {
      await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation ResolveReport($id: String!, $status: ReportStatus!) { resolveReport(id: $id, status: $status) { success message } }`,
          variables: { id, status },
        }),
      });
      await fetchReports();
    } catch { /* error handling */ } finally { setResolving(null); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Whistleblower Reports</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Review suspicious batch reports. Confirmed reports trigger DawaPoints rewards.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-4 py-10 text-center">
              <p className="text-xs text-muted-foreground">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <FileText className="h-10 w-10 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No reports submitted yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] uppercase">ID</TableHead>
                  <TableHead className="text-[11px] uppercase">Batch ID</TableHead>
                  <TableHead className="text-[11px] uppercase">Reporter</TableHead>
                  <TableHead className="text-[11px] uppercase">Reason</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase">Date</TableHead>
                  <TableHead className="text-[11px] uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-mono text-foreground" title={r.id}>{r.id.slice(-8)}</TableCell>
                    <TableCell className="text-xs font-mono text-foreground">{r.batchId}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground max-w-[120px] truncate" title={r.reporterAddress}>
                      {r.reporterAddress === 'anonymous' ? 'Anonymous' : `${r.reporterAddress.slice(0, 8)}...`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate" title={r.reason}>{r.reason}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {r.status === 'PENDING' ? (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleResolve(r.id, 'CONFIRMED')}
                            disabled={resolving === r.id}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-[11px] px-2.5"
                            onClick={() => handleResolve(r.id, 'REJECTED')}
                            disabled={resolving === r.id}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {r.status === 'CONFIRMED' && r.pointsAwarded ? `+${r.pointsAwarded} pts` : 'Resolved'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Confirmed reports award DawaPoints to the whistleblower on Sui.</p>
    </div>
  );
}
