'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Shield, AlertTriangle, Users, Package, Activity, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAdminOverview, useLiftSuspension, useBulkRecall } from '@/hooks/useAdmin';
import type { ChemistViolation } from '@/hooks/useAdmin';

export default function Admin() {
  const { t } = useTranslation();
  const { data, loading } = useAdminOverview();
  const [liftSuspension, { loading: liftLoading }] = useLiftSuspension();
  const [bulkRecall, { loading: recallLoading }] = useBulkRecall();

  const [confirmChemist, setConfirmChemist] = useState<ChemistViolation | null>(null);
  const [bulkBatchIds, setBulkBatchIds] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [showRecallConfirm, setShowRecallConfirm] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ text: string; success: boolean } | null>(null);

  const violations = data?.chemistViolations ?? [];
  const batches = data?.batches ?? [];
  const recalls = data?.recalls ?? [];
  const activeCount = batches.filter((b) => b.status === 'ACTIVE' || b.status === 'IN_TRANSIT').length;
  const suspendedCount = violations.filter((v) => v.suspended).length;

  const STATS = [
    { label: t('admin.stats.activeBatches'), value: activeCount, icon: Package, color: 'text-blue-500' },
    { label: t('admin.stats.recalledBatches'), value: recalls.length, icon: AlertTriangle, color: 'text-amber-500' },
    { label: t('admin.stats.suspendedChemists'), value: suspendedCount, icon: Users, color: 'text-rose-500' },
    { label: t('admin.stats.pendingTx'), value: 0, icon: Activity, color: 'text-emerald-500' },
  ];

  const handleLiftSuspension = async (chemistId: string) => {
    try {
      const { data: result } = await liftSuspension({ variables: { chemistId } });
      setResultMessage({ text: result?.liftSuspension.message ?? 'Done', success: result?.liftSuspension.success ?? false });
    } catch (err) {
      setResultMessage({ text: err instanceof Error ? err.message : 'Unknown error', success: false });
    }
    setConfirmChemist(null);
  };

  const handleBulkRecall = async () => {
    const batchIds = bulkBatchIds.split('\n').map((id) => id.trim()).filter((id) => id.length > 0);
    if (batchIds.length === 0 || !bulkReason.trim()) return;
    try {
      const { data: result } = await bulkRecall({ variables: { batchIds, reason: bulkReason.trim() } });
      setResultMessage({ text: result?.bulkRecall.message ?? 'Done', success: result?.bulkRecall.success ?? false });
      if (result?.bulkRecall.success) { setBulkBatchIds(''); setBulkReason(''); }
    } catch (err) {
      setResultMessage({ text: err instanceof Error ? err.message : 'Unknown error', success: false });
    }
    setShowRecallConfirm(false);
  };

  const parsedBatchIds = bulkBatchIds.split('\n').map((id) => id.trim()).filter((id) => id.length > 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold">{t('admin.title')}</h1>
          <p className="text-xs text-muted-foreground">Manage chemist violations and issue bulk recalls</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((s) => (
          <Card key={s.label} className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Result message */}
      {resultMessage && (
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${resultMessage.success ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400' : 'border-destructive/30 bg-destructive/8 text-destructive'}`}>
          {resultMessage.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{resultMessage.text}</span>
          <button onClick={() => setResultMessage(null)} className="text-xs underline opacity-60 hover:opacity-100 transition-opacity">{t('admin.dismiss')}</button>
        </div>
      )}

      {/* Flagged chemists table */}
      <Card className="rounded-xl">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{t('admin.flaggedChemists')}</CardTitle>
            {loading && <Skeleton className="h-4 w-24" />}
            {!loading && violations.length > 0 && (
              <Badge variant="secondary" className="text-xs">{violations.length} flagged</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-24" />
                </div>
              ))}
            </div>
          ) : violations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t('admin.noViolations')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 text-xs">{t('admin.columns.chemistId')}</TableHead>
                  <TableHead className="text-xs">{t('admin.columns.violations')}</TableHead>
                  <TableHead className="text-xs">{t('admin.columns.status')}</TableHead>
                  <TableHead className="text-xs">{t('admin.columns.lastViolation')}</TableHead>
                  <TableHead className="text-xs">{t('admin.columns.batchIds')}</TableHead>
                  <TableHead className="pr-4 text-xs text-right">{t('admin.columns.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.map((v) => (
                  <TableRow key={v.chemistId} className="group">
                    <TableCell className="pl-4">
                      <span className="font-mono text-xs">{v.chemistId}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.violationCount >= 3 ? 'destructive' : 'secondary'}>
                        {v.violationCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.suspended ? 'destructive' : 'outline'}>
                        {v.suspended ? t('admin.suspended') : t('admin.active')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.lastViolationAt > 0 ? format(new Date(v.lastViolationAt), 'd MMM yyyy') : '—'}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">
                        {v.violationBatchIds.join(', ')}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {v.suspended && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => setConfirmChemist(v)}
                        >
                          {t('admin.liftSuspension')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bulk recall form */}
      <Card className="rounded-xl">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm font-semibold">{t('admin.bulkRecall')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="max-w-xl space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('admin.batchIdsLabel')}</Label>
              <Textarea
                value={bulkBatchIds}
                onChange={(e) => setBulkBatchIds(e.target.value)}
                placeholder={t('admin.batchIdsPlaceholder')}
                rows={4}
                className="font-mono text-xs"
              />
              {parsedBatchIds.length > 0 && (
                <p className="text-[11px] text-muted-foreground">{parsedBatchIds.length} batch ID{parsedBatchIds.length !== 1 ? 's' : ''} entered</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('admin.reasonLabel')}</Label>
              <Input
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder={t('admin.reasonPlaceholder')}
                className="text-xs"
              />
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="text-xs"
              disabled={parsedBatchIds.length === 0 || !bulkReason.trim() || recallLoading}
              onClick={() => setShowRecallConfirm(true)}
            >
              <AlertTriangle className="mr-1.5 h-3 w-3" />
              {t('admin.issueRecall')} ({parsedBatchIds.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lift suspension dialog */}
      <Dialog open={!!confirmChemist} onOpenChange={(open) => !open && setConfirmChemist(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.confirmLiftTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.confirmLiftDescription', { chemistId: confirmChemist?.chemistId })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setConfirmChemist(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              disabled={liftLoading}
              onClick={() => confirmChemist && handleLiftSuspension(confirmChemist.chemistId)}
            >
              {liftLoading ? t('common.loading') : t('admin.confirmLift')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk recall confirmation dialog */}
      <Dialog open={showRecallConfirm} onOpenChange={setShowRecallConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.confirmRecallTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.confirmRecallDescription', { count: parsedBatchIds.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 rounded-lg border bg-muted/30 p-3 max-h-32 overflow-auto">
            {parsedBatchIds.map((id) => (
              <p key={id} className="text-xs font-mono text-muted-foreground">{id}</p>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-medium">{t('admin.reasonLabel')}:</span> {bulkReason}
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowRecallConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" size="sm" disabled={recallLoading} onClick={handleBulkRecall}>
              {recallLoading ? t('common.loading') : t('admin.confirmRecall')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
