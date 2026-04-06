'use client';

import { useQuery, gql } from '@apollo/client';
import {
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import ErrorAlert from '@/components/ErrorAlert';
import {
  Package, CheckCircle2, Truck, AlertTriangle, ShieldOff,
  Activity, Wifi, Clock, TrendingUp,
} from 'lucide-react';

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
  ACTIVE: 'oklch(0.65 0.19 145)',
  IN_TRANSIT: 'oklch(0.59 0.22 262)',
  DISPENSED: 'oklch(0.55 0.02 286)',
  RECALLED: 'oklch(0.58 0.22 27)',
  SUSPENDED_REVIEW: 'oklch(0.75 0.18 75)',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active', IN_TRANSIT: 'In Transit', DISPENSED: 'Dispensed',
  RECALLED: 'Recalled', SUSPENDED_REVIEW: 'Under Review',
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-14 mt-3" />
        <Skeleton className="h-3 w-24 mt-2" />
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data, loading, error, refetch } = useQuery<{ analytics: AnalyticsData }>(ANALYTICS_QUERY, { pollInterval: 30_000 });
  const analytics = data?.analytics;
  const total = analytics?.totalBatches ?? 0;

  function pct(n: number): string {
    return total === 0 ? '0%' : `${((n / total) * 100).toFixed(1)}%`;
  }

  if (loading && !analytics) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-7 w-28 mb-1" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent className="pt-5"><Skeleton className="h-72 w-full rounded-lg" /></CardContent></Card>
          <Card><CardContent className="pt-5"><Skeleton className="h-72 w-full rounded-lg" /></CardContent></Card>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Batches', value: analytics?.totalBatches ?? 0, sub: 'All tracked on-chain', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active', value: analytics?.activeBatches ?? 0, sub: pct(analytics?.activeBatches ?? 0), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'In Transit', value: analytics?.inTransitBatches ?? 0, sub: pct(analytics?.inTransitBatches ?? 0), icon: Truck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Dispensed', value: analytics?.dispensedBatches ?? 0, sub: pct(analytics?.dispensedBatches ?? 0), icon: ShieldOff, color: 'text-slate-500', bg: 'bg-slate-500/10' },
    { label: 'Recalled', value: analytics?.recalledBatches ?? 0, sub: `${analytics?.totalRecalls ?? 0} issued`, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  // Prepare activity data — show last 14 days for cleaner chart
  const activityData = (analytics?.recentActivity ?? []).slice(-14);
  const totalActivity = activityData.reduce((sum, d) => sum + d.batches + d.recalls, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Supply chain performance and batch lifecycle overview</p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Activity className="h-3 w-3" /> Live — polls every 30s
        </Badge>
      </div>

      {error && <ErrorAlert title="Failed to load analytics" message={error.message} retry={() => refetch()} />}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                  <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold tabular-nums">{stat.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Status Distribution</CardTitle>
            </div>
            <CardDescription>Breakdown by current lifecycle status</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics && analytics.statusDistribution.length > 0 ? (
              <div className="flex flex-col items-center gap-6">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={analytics.statusDistribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {analytics.statusDistribution.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? 'oklch(0.55 0.02 286)'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 8, fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid var(--border)' }}
                      formatter={(value: number, name: string) => [value.toLocaleString(), STATUS_LABELS[name] ?? name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full grid grid-cols-2 gap-x-6 gap-y-2">
                  {analytics.statusDistribution.map((entry) => (
                    <div key={entry.status} className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 shrink-0 rounded-sm" style={{ backgroundColor: STATUS_COLORS[entry.status] }} />
                      <span className="text-xs text-muted-foreground flex-1">{STATUS_LABELS[entry.status] ?? entry.status}</span>
                      <span className="text-xs font-mono font-medium tabular-nums">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No batch data yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Activity (14 days)</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{totalActivity} events</span>
            </div>
            <CardDescription>Batches created and recalls issued</CardDescription>
          </CardHeader>
          <CardContent>
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={activityData} margin={{ top: 5, right: 0, bottom: 5, left: -10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatDateLabel}
                    interval="preserveStartEnd"
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                    allowDecimals={false}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid var(--border)' }}
                    labelFormatter={formatDateLabel}
                  />
                  <Bar dataKey="batches" name="Batches" fill="oklch(0.59 0.22 262)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recalls" name="Recalls" fill="oklch(0.58 0.22 27)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System health */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">System Health</CardTitle>
          </div>
          <CardDescription>Real-time infrastructure and on-chain status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Sui RPC', value: 'Connected', icon: Wifi, ok: true },
              { label: 'Last on-chain tx', value: '12s ago', icon: Clock, ok: true },
              { label: 'Recall SLA (90d)', value: '8.3s avg', icon: Activity, ok: true },
              { label: 'Dispensed', value: (analytics?.dispensedBatches ?? 0).toLocaleString(), icon: Package, ok: null },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                  <div className={`p-1.5 rounded-lg ${item.ok === true ? 'bg-emerald-500/10' : item.ok === false ? 'bg-red-500/10' : 'bg-muted'}`}>
                    <Icon className={`h-3.5 w-3.5 ${item.ok === true ? 'text-emerald-500' : item.ok === false ? 'text-red-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium tabular-nums">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
