import { useQuery, gql } from '@apollo/client';
import Sidebar from '../components/Sidebar';
import { Separator } from '../components/ui/separator';

const DASHBOARD_QUERY = gql`
  query DashboardData {
    anomalies(limit: 5) {
      batchId
      type
      description
      detectedAt
    }
  }
`;

const STATS = [
  { label: 'Active batches', value: '1,247' },
  { label: 'Recalls today', value: '2' },
  { label: 'Flagged chemists', value: '5' },
  { label: 'Sui anchored', value: '99.8%' },
];

export default function Dashboard() {
  const { data } = useQuery(DASHBOARD_QUERY, { pollInterval: 30_000 });

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
          {/* Anomalies */}
          {data?.anomalies?.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Anomalies
              </h2>
              <div className="border border-border">
                {data.anomalies.map((a: { batchId: string; type: string; description: string }, i: number) => (
                  <div key={a.batchId} className={`px-4 py-3 flex items-start gap-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                    <span className="text-xs font-medium text-destructive shrink-0 mt-0.5">
                      {a.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {a.description} · Batch <span className="font-mono">{a.batchId}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Map placeholder */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Batch Distribution
            </h2>
            <div className="border border-border h-56 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">
                Map renders here — Leaflet with Fabric transfer GPS coordinates
              </p>
            </div>
          </section>

          {/* Recent activity */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Recent Activity
            </h2>
            <div className="border border-border">
              <div className="px-4 py-8 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">
                  Connect to Fabric to see live batch activity
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
