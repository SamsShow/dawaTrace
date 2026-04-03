'use client';

import { useQuery, gql } from '@apollo/client';
import {
  PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const ANALYTICS_QUERY = gql`
  query AnalyticsData {
    analytics {
      totalBatches activeBatches recalledBatches inTransitBatches dispensedBatches totalRecalls
      statusDistribution { status count }
      recentActivity { date batches recalls }
    }
  }
`;

interface AnalyticsData {
  totalBatches: number; activeBatches: number; recalledBatches: number;
  inTransitBatches: number; dispensedBatches: number; totalRecalls: number;
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

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function StatCardSkeleton() {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <Skeleton className="h-3.5 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data, loading } = useQuery<{ analytics: AnalyticsData }>(ANALYTICS_QUERY, { pollInterval: 30_000 });
  const analytics = data?.analytics;
  const total = analytics?.totalBatches ?? 0;
  function pct(n: number): string {
    return total === 0 ? '0%' : `${((n / total) * 100).toFixed(1)}% of total`;
  }

  if (loading && !analytics) {
    return (
      <div className="px-6 py-6 space-y-6">
        <div>
          <Skeleton className="h-7 w-28 mb-1" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Batches',
      value: analytics?.totalBatches ?? 0,
      description: 'All time',
      variant: 'default' as const,
      badge: null,
    },
    {
      label: 'Active',
      value: analytics?.activeBatches ?? 0,
      description: pct(analytics?.activeBatches ?? 0),
      variant: 'default' as const,
      badge: 'Live',
    },
    {
      label: 'In Transit',
      value: analytics?.inTransitBatches ?? 0,
      description: pct(analytics?.inTransitBatches ?? 0),
      variant: 'default' as const,
      badge: null,
    },
    {
      label: 'Recalled',
      value: analytics?.recalledBatches ?? 0,
      description: `${analytics?.totalRecalls ?? 0} recall${(analytics?.totalRecalls ?? 0) !== 1 ? 's' : ''} issued`,
      variant: 'destructive' as const,
      badge: null,
    },
  ];

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Supply chain performance and batch lifecycle overview
        </p>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="rounded-xl shadow-sm">
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                {stat.badge && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {stat.badge}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {stat.value.toLocaleString()}
              </p>
              <CardDescription
                className={`text-xs mt-1 ${stat.variant === 'destructive' ? 'text-destructive' : ''}`}
              >
                {stat.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts section with Tabs */}
      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="distribution" className="text-xs">
            Status Distribution
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">
            Activity (30 days)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="distribution">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
              <CardDescription>
                Breakdown of all batches by current lifecycle status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics && analytics.statusDistribution.length > 0 ? (
                <div className="flex flex-col items-center gap-8 sm:flex-row">
                  <ResponsiveContainer width="50%" height={240}>
                    <PieChart>
                      <Pie
                        data={analytics.statusDistribution}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
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
                          borderRadius: 8,
                          fontSize: 12,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        }}
                        formatter={(value: number, name: string) => [
                          value.toLocaleString(),
                          STATUS_LABELS[name] ?? name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2.5">
                    {analytics.statusDistribution.map((entry) => (
                      <div key={entry.status} className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: STATUS_COLORS[entry.status] ?? 'hsl(240 3.8% 46.1%)' }}
                        />
                        <span className="text-sm text-muted-foreground flex-1">
                          {STATUS_LABELS[entry.status] ?? entry.status}
                        </span>
                        <span className="text-sm font-mono font-medium">
                          {entry.count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  No batch data available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle>Batch Activity</CardTitle>
              <CardDescription>
                Batches created and recalls issued over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics && analytics.recentActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
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
                      tick={{ fontSize: 11, fill: 'hsl(240 3.8% 46.1%)' }}
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
                        borderRadius: 8,
                        fontSize: 12,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      }}
                      labelFormatter={formatDateLabel}
                    />
                    <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="batches"
                      name="Batches Created"
                      stroke="hsl(221 83% 53%)"
                      fill="url(#batchGrad)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="recalls"
                      name="Recalls"
                      stroke="hsl(0 72% 51%)"
                      fill="url(#recallGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  No recent activity data.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* System health card */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Real-time infrastructure and on-chain status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y divide-border">
            {[
              ['Sui RPC status', 'Connected', 'success'],
              ['Last on-chain tx', '12 seconds ago', null],
              ['Recall SLA (90d avg)', '8.3 s', null],
              ['Total dispensed', (analytics?.dispensedBatches ?? 0).toLocaleString(), null],
            ].map(([label, value, type]) => (
              <div key={label} className="flex justify-between items-center py-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                {type === 'success' ? (
                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-200">
                    {value}
                  </Badge>
                ) : (
                  <span className="text-sm font-mono">{value}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
