import { Download } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';
import { getToken } from '../lib/auth';

async function downloadExport(path: string) {
  const token = getToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || 'export';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Placeholder data — wire to Fabric via GraphQL in production
const MOCK_RECALLS = [
  { batchId: 'BATCH-2024-0891', drug: 'Amoxicillin 500mg', reason: 'Subpotent — failed dissolution test', issuedBy: 'CDSCO-REG-001', issuedAt: '2026-03-15', suiAnchored: true },
  { batchId: 'BATCH-2024-0742', drug: 'Paracetamol 650mg', reason: 'Contamination detected — microbial', issuedBy: 'CDSCO-REG-002', issuedAt: '2026-03-12', suiAnchored: true },
];

export default function Recalls() {
  const { user } = useAuth();
  const isRegulator = user?.orgRole === 'REGULATOR';

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h1 className="text-sm font-semibold">Recalls</h1>
          {isRegulator && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadExport('/api/exports/recalls?format=csv')}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadExport('/api/exports/recalls?format=json')}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export JSON
              </Button>
            </div>
          )}
        </div>

        <div className="px-6 py-6">
          <div className="border border-border">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-4 py-2 border-b border-border bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground">Batch</span>
              <span className="text-xs font-medium text-muted-foreground">Reason</span>
              <span className="text-xs font-medium text-muted-foreground">Issued by</span>
              <span className="text-xs font-medium text-muted-foreground">Date</span>
              <span className="text-xs font-medium text-muted-foreground">Sui</span>
            </div>

            {MOCK_RECALLS.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-muted-foreground">No active recalls</p>
              </div>
            ) : (
              MOCK_RECALLS.map((r, i) => (
                <div
                  key={r.batchId}
                  className={`grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-4 py-3 items-center ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-foreground">{r.batchId}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.drug}</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{r.reason}</p>
                  <p className="text-xs font-mono text-muted-foreground">{r.issuedBy}</p>
                  <p className="text-xs text-muted-foreground">{r.issuedAt}</p>
                  <span className={`text-xs ${r.suiAnchored ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {r.suiAnchored ? 'Anchored' : 'Pending'}
                  </span>
                </div>
              ))
            )}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Issue recalls from the batch detail page. Each recall is anchored to Sui within 60 s.
          </p>
        </div>
      </main>
    </div>
  );
}
