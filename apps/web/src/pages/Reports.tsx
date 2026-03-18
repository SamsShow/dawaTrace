import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface Report {
  id: string;
  batchId: string;
  reporterAddress: string;
  reason: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  createdAt: number;
  resolvedAt: number | null;
  pointsAwarded: number | null;
}

const STATUS_BADGE: Record<Report['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function Reports() {
  const { token } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: `query { reports { id batchId reporterAddress reason status createdAt resolvedAt pointsAwarded } }`,
        }),
      });
      const json = await res.json();
      setReports(json.data?.reports ?? []);
    } catch {
      // Silently handle — empty state will show
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolve = async (id: string, status: 'CONFIRMED' | 'REJECTED') => {
    setResolving(id);
    try {
      await fetch(`${API_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: `mutation ResolveReport($id: String!, $status: ReportStatus!) { resolveReport(id: $id, status: $status) { success message } }`,
          variables: { id, status },
        }),
      });
      await fetchReports();
    } catch {
      // Error handling
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-4 border-b border-border">
          <h1 className="text-sm font-semibold">Whistleblower Reports</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review suspicious batch reports from patients and chemists. Confirmed reports trigger DawaPoints rewards.
          </p>
        </div>

        <div className="px-6 py-6">
          {loading ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground">Loading reports...</p>
            </div>
          ) : (
            <div className="border border-border">
              {/* Table header */}
              <div className="grid grid-cols-[100px_120px_1fr_1fr_80px_100px_140px] gap-4 px-4 py-2 border-b border-border bg-muted/30">
                <span className="text-xs font-medium text-muted-foreground">ID</span>
                <span className="text-xs font-medium text-muted-foreground">Batch ID</span>
                <span className="text-xs font-medium text-muted-foreground">Reporter</span>
                <span className="text-xs font-medium text-muted-foreground">Reason</span>
                <span className="text-xs font-medium text-muted-foreground">Status</span>
                <span className="text-xs font-medium text-muted-foreground">Date</span>
                <span className="text-xs font-medium text-muted-foreground">Actions</span>
              </div>

              {reports.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-muted-foreground">No reports submitted yet</p>
                </div>
              ) : (
                reports.map((r, i) => (
                  <div
                    key={r.id}
                    className={`grid grid-cols-[100px_120px_1fr_1fr_80px_100px_140px] gap-4 px-4 py-3 items-center ${i > 0 ? 'border-t border-border' : ''}`}
                  >
                    <p className="text-xs font-mono text-foreground truncate" title={r.id}>
                      {r.id.slice(-8)}
                    </p>
                    <p className="text-xs font-mono text-foreground">{r.batchId}</p>
                    <p className="text-xs font-mono text-muted-foreground truncate" title={r.reporterAddress}>
                      {r.reporterAddress === 'anonymous'
                        ? 'Anonymous'
                        : `${r.reporterAddress.slice(0, 8)}...`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" title={r.reason}>
                      {r.reason}
                    </p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full text-center ${STATUS_BADGE[r.status]}`}>
                      {r.status}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-1.5">
                      {r.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => handleResolve(r.id, 'CONFIRMED')}
                            disabled={resolving === r.id}
                            className="text-[11px] px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleResolve(r.id, 'REJECTED')}
                            disabled={resolving === r.id}
                            className="text-[11px] px-2.5 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {r.status === 'CONFIRMED' && r.pointsAwarded
                            ? `+${r.pointsAwarded} pts`
                            : 'Resolved'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Confirmed reports award DawaPoints to the whistleblower via the Sui bridge.
          </p>
        </div>
      </main>
    </div>
  );
}
