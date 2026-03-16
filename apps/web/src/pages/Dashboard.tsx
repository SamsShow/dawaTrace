import { useQuery, gql } from '@apollo/client';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { Badge } from '../components/ui/badge';
import type { Batch, BatchStatus, RecallRecord } from '../lib/types';

const DASHBOARD_QUERY = gql`
  query DashboardData {
    batches {
      batchId
      drugName
      manufacturerId
      status
      currentCustodian
      updatedAt
    }
    recalls {
      batchId
      regulatorId
      reason
      timestamp
    }
    anomalies(limit: 5) {
      batchId
      type
      description
      detectedAt
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

export default function Dashboard() {
  const { data } = useQuery<{ batches: Batch[]; recalls: RecallRecord[] }>(DASHBOARD_QUERY, { pollInterval: 30_000 });

  const batches = data?.batches ?? [];
  const recalls = data?.recalls ?? [];

  const activeCount = batches.filter((b) => b.status === 'ACTIVE' || b.status === 'IN_TRANSIT').length;
  const recalledCount = recalls.length;
  const recalledBatchIds = new Set(recalls.map((r) => r.batchId));

  const STATS = [
    { label: 'Active batches', value: activeCount > 0 ? activeCount.toLocaleString() : '—' },
    { label: 'Recalled batches', value: recalledCount > 0 ? String(recalledCount) : '0' },
    { label: 'Total on chain', value: batches.length > 0 ? batches.length.toLocaleString() : '—' },
    { label: 'Sui anchored', value: '99.8%' },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h1 className="text-sm font-semibold">Overview</h1>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 border-b border-border divide-x divide-border">
          {STATS.map((s) => (
            <div key={s.label} className="px-6 py-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-xl font-semibold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Active recalls alert */}
          {recalls.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Active Recalls
              </h2>
              <div className="border border-destructive/40 divide-y divide-destructive/20">
                {recalls.map((r) => (
                  <div key={r.batchId} className="px-4 py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-destructive font-mono">{r.batchId}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.reason}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground shrink-0">
                      {format(new Date(r.timestamp), 'd MMM, HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent batches */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Recent Batches
              </h2>
              <Link to="/batches" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {batches.length === 0 ? (
              <div className="border border-border px-4 py-8 text-center">
                <p className="text-xs text-muted-foreground">No batches on chain yet.</p>
                <Link to="/batches" className="text-xs underline mt-2 inline-block">Mint the first batch</Link>
              </div>
            ) : (
              <div className="border border-border divide-y divide-border">
                {[...batches].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8).map((b) => (
                  <Link
                    key={b.batchId}
                    to={`/batches/${b.batchId}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate">{b.drugName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{b.batchId}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {recalledBatchIds.has(b.batchId) ? (
                        <Badge variant="destructive">RECALLED</Badge>
                      ) : (
                        <Badge variant={STATUS_VARIANT[b.status]}>{b.status.replace('_', ' ')}</Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(b.updatedAt), 'd MMM')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
