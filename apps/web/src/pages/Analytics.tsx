import { useQuery, gql } from '@apollo/client';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import Sidebar from '../components/Sidebar';

const ANALYTICS_QUERY = gql`
  query AnalyticsData {
    analytics {
      totalBatches
      activeBatches
      recalledBatches
      inTransitBatches
      dispensedBatches
      totalRecalls
      statusDistribution {
        status
        count
      }
      recentActivity {
        date
        batches
        recalls
      }
    }
  }
`;

interface AnalyticsData {
  totalBatches: number;
  activeBatches: number;
  recalledBatches: number;
  inTransitBatches: number;
  dispensedBatches: number;
  totalRecalls: number;
  statusDistribution: { status: string; count: number }[];
  recentActivity: { date: string; batches: number; recalls: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'hsl(142 71% 45%)',
  IN_TRANSIT: 'hsl(221 83% 53%)',
  DISPENSED: 'hsl(240 3.8% 46.1%)',
  RECALLED: 'hsl(0 72% 51%)',
  SUSPENDED_REVIEW: 'hsl(38 92% 50%)',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  IN_TRANSIT: 'In Transit',
  DISPENSED: 'Dispensed',
  RECALLED: 'Recalled',
  SUSPENDED_REVIEW: 'Under Review',
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-medium">{title}</h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  percentage,
  variant,
}: {
  label: string;
  value: number;
  percentage: string;
  variant?: 'default' | 'destructive';
}) {
  return (
    <div className="px-6 py-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      <p
        className={`text-[11px] mt-1 ${
          variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground'
        }`}
      >
        {percentage}
      </p>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Analytics() {
  const { data, loading } = useQuery<{ analytics: AnalyticsData }>(ANALYTICS_QUERY, {
    pollInterval: 30_000,
  });

  const analytics = data?.analytics;
  const total = analytics?.totalBatches ?? 0;

  function pct(n: number): string {
    if (total === 0) return '0%';
    return `${((n / total) * 100).toFixed(1)}% of total`;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-4 border-b border-border">
          <h1 className="text-sm font-semibold">Analytics</h1>
        </div>

        {loading && !analytics ? (
          <div className="px-6 py-12 text-center">
            <p className="text-xs text-muted-foreground">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-4 border-b border-border divide-x divide-border">
              <StatCard
                label="Total Batches"
                value={analytics?.totalBatches ?? 0}
                percentage="All time"
              />
              <StatCard
                label="Active"
                value={analytics?.activeBatches ?? 0}
                percentage={pct(analytics?.activeBatches ?? 0)}
              />
              <StatCard
                label="In Transit"
                value={analytics?.inTransitBatches ?? 0}
                percentage={pct(analytics?.inTransitBatches ?? 0)}
              />
              <StatCard
                label="Recalled"
                value={analytics?.recalledBatches ?? 0}
                percentage={`${analytics?.totalRecalls ?? 0} recall${(analytics?.totalRecalls ?? 0) !== 1 ? 's' : ''} issued`}
                variant="destructive"
              />
            </div>

            <div className="px-6 py-6 space-y-4 max-w-4xl">
              {/* Status distribution pie chart */}
              <ChartCard title="Status distribution">
                {analytics && analytics.statusDistribution.length > 0 ? (
                  <div className="flex items-center gap-8">
                    <ResponsiveContainer width="50%" height={220}>
                      <PieChart>
                        <Pie
                          data={analytics.statusDistribution}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {analytics.statusDistribution.map((entry) => (
                            <Cell
                              key={entry.status}
                              fill={STATUS_COLORS[entry.status] ?? 'hsl(240 3.8% 46.1%)'}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            border: '1px solid hsl(240 5.9% 90%)',
                            borderRadius: 0,
                            fontSize: 12,
                            boxShadow: 'none',
                          }}
                          formatter={(value: number, name: string) => [
                            value.toLocaleString(),
                            STATUS_LABELS[name] ?? name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {analytics.statusDistribution.map((entry) => (
                        <div key={entry.status} className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 shrink-0"
                            style={{
                              backgroundColor:
                                STATUS_COLORS[entry.status] ?? 'hsl(240 3.8% 46.1%)',
                            }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {STATUS_LABELS[entry.status] ?? entry.status}
                          </span>
                          <span className="text-xs font-mono text-foreground ml-auto">
                            {entry.count.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-8 text-center">
                    No batch data available.
                  </p>
                )}
              </ChartCard>

              {/* Activity timeline area chart */}
              <ChartCard title="Activity (last 30 days)">
                {analytics && analytics.recentActivity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart
                      data={analytics.recentActivity}
                      margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
                    >
                      <defs>
                        <linearGradient id="batchGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(221 83% 53%)" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="recallGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(0 72% 51%)" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="hsl(240 5.9% 90%)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: 'hsl(240 3.8% 46.1%)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatDateLabel}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'hsl(240 3.8% 46.1%)' }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          border: '1px solid hsl(240 5.9% 90%)',
                          borderRadius: 0,
                          fontSize: 12,
                          boxShadow: 'none',
                        }}
                        labelFormatter={formatDateLabel}
                      />
                      <Legend
                        iconType="square"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="batches"
                        name="Batches Created"
                        stroke="hsl(221 83% 53%)"
                        fill="url(#batchGrad)"
                        strokeWidth={1.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="recalls"
                        name="Recalls"
                        stroke="hsl(0 72% 51%)"
                        fill="url(#recallGrad)"
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground py-8 text-center">
                    No recent activity data.
                  </p>
                )}
              </ChartCard>

              {/* System health */}
              <ChartCard title="System health">
                <div className="space-y-2">
                  {[
                    ['Fabric peers online', '4 / 4'],
                    ['Bridge queue depth', '0 urgent · 3 normal'],
                    ['Last Sui anchor', '12 seconds ago'],
                    ['Recall SLA (90d avg)', '8.3 s'],
                    [
                      'Total dispensed',
                      (analytics?.dispensedBatches ?? 0).toLocaleString(),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between items-baseline py-1.5 border-b border-border last:border-0"
                    >
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-xs font-mono text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
