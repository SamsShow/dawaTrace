'use client';

import { useQuery, gql } from '@apollo/client';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Package,
  CheckCircle2,
  Truck,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  BarChart3,
  Bell,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorAlert from '@/components/ErrorAlert';
import type { Batch, BatchStatus, RecallRecord } from '@/lib/types';

const DASHBOARD_QUERY = gql`
  query DashboardData {
    batches { batchId drugName manufacturerId status currentCustodian updatedAt }
    recalls { batchId regulatorId reason timestamp }
    anomalies(limit: 5) { batchId type description detectedAt }
  }
`;

const STATUS_VARIANT: Record<BatchStatus, 'outline' | 'destructive' | 'secondary' | 'default'> = {
  ACTIVE: 'default', IN_TRANSIT: 'outline', DISPENSED: 'secondary', RECALLED: 'destructive', SUSPENDED_REVIEW: 'outline',
};

export default function Dashboard() {
  const { data, loading, error, refetch } = useQuery<{ batches: Batch[]; recalls: RecallRecord[] }>(DASHBOARD_QUERY, { pollInterval: 30_000 });

  const batches = data?.batches ?? [];
  const recalls = data?.recalls ?? [];

  const totalCount = batches.length;
  const activeCount = batches.filter((b) => b.status === 'ACTIVE').length;
  const inTransitCount = batches.filter((b) => b.status === 'IN_TRANSIT').length;
  const recalledCount = batches.filter((b) => b.status === 'RECALLED').length;

  const recalledBatchIds = new Set(recalls.map((r) => r.batchId));

  const STAT_CARDS = [
    {
      label: 'Total Batches',
      value: loading ? null : totalCount > 0 ? totalCount.toLocaleString() : '0',
      icon: Package,
      accent: 'text-blue-500',
      bg: 'bg-blue-500/10',
      description: 'All batches on-chain',
    },
    {
      label: 'Active',
      value: loading ? null : activeCount > 0 ? activeCount.toLocaleString() : '0',
      icon: CheckCircle2,
      accent: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      description: 'Currently active batches',
    },
    {
      label: 'In Transit',
      value: loading ? null : inTransitCount > 0 ? inTransitCount.toLocaleString() : '0',
      icon: Truck,
      accent: 'text-amber-500',
      bg: 'bg-amber-500/10',
      description: 'Moving through supply chain',
    },
    {
      label: 'Recalled',
      value: loading ? null : recalledCount > 0 ? recalledCount.toLocaleString() : '0',
      icon: AlertTriangle,
      accent: 'text-red-500',
      bg: 'bg-red-500/10',
      description: 'Recalled from circulation',
    },
  ];

  const recentActivity = [
    ...recalls.slice(0, 3).map((r) => ({
      id: r.batchId,
      type: 'recall' as const,
      label: `Recall issued for ${r.batchId}`,
      detail: r.reason,
      timestamp: r.timestamp,
    })),
    ...[...batches]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5)
      .map((b) => ({
        id: b.batchId,
        type: 'batch' as const,
        label: b.drugName,
        detail: b.batchId,
        timestamp: b.updatedAt,
      })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6);

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Real-time supply chain status across all registered nodes
        </p>
      </div>

      {error && (
        <ErrorAlert
          title="Failed to load dashboard data"
          message={error.message}
          retry={() => refetch()}
        />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-4 w-4 ${stat.accent}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {stat.value === null ? (
                  <Skeleton className="h-8 w-16 mb-1" />
                ) : (
                  <p className="text-3xl font-bold tabular-nums">{stat.value}</p>
                )}
                <CardDescription className="text-xs mt-1">{stat.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom row: Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              </div>
              <Link href="/batches">
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <CardDescription className="text-xs">Latest batch and recall events across the chain</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-0">
            {loading ? (
              <div className="space-y-3 px-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">No activity yet.</p>
                <Link href="/batches">
                  <Button variant="link" size="sm" className="mt-2 text-xs">
                    Mint the first batch
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentActivity.map((item) => (
                  <li key={`${item.type}-${item.id}-${item.timestamp}`}>
                    <Link
                      href={item.type === 'batch' ? `/batches/${item.id}` : '/recalls'}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div
                        className={`mt-0.5 flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                          item.type === 'recall' ? 'bg-red-500/10' : 'bg-blue-500/10'
                        }`}
                      >
                        {item.type === 'recall' ? (
                          <Bell className="h-3.5 w-3.5 text-red-500" />
                        ) : (
                          <Package className="h-3.5 w-3.5 text-blue-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{item.detail}</p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        {item.type === 'recall' && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Recall</Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(item.timestamp), 'd MMM, HH:mm')}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </div>
            <CardDescription className="text-xs">Common regulatory operations</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <Link href="/batches" className="block">
              <Button variant="outline" className="w-full justify-start gap-2 h-9 text-sm">
                <Package className="h-4 w-4 text-blue-500" />
                View Batches
              </Button>
            </Link>
            <Link href="/recalls" className="block">
              <Button variant="outline" className="w-full justify-start gap-2 h-9 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Issue Recall
              </Button>
            </Link>
            <Link href="/analytics" className="block">
              <Button variant="outline" className="w-full justify-start gap-2 h-9 text-sm">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                View Analytics
              </Button>
            </Link>
            {recalls.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-red-500" />
                  Active Recalls ({recalls.length})
                </p>
                <ul className="space-y-1.5">
                  {recalls.slice(0, 3).map((r) => (
                    <li key={r.batchId} className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
                      <p className="text-[11px] font-mono font-medium text-destructive">{r.batchId}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{r.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
