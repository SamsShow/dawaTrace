import { useState } from 'react';
import { format } from 'date-fns';
import { Shield, AlertTriangle, Users, Package, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  useAdminOverview,
  useLiftSuspension,
  useBulkRecall,
} from '../hooks/useAdmin';
import type { ChemistViolation } from '../hooks/useAdmin';

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
  const recalledCount = recalls.length;
  const suspendedCount = violations.filter((v) => v.suspended).length;

  const STATS = [
    { label: t('admin.stats.activeBatches'), value: activeCount, icon: Package },
    { label: t('admin.stats.recalledBatches'), value: recalledCount, icon: AlertTriangle },
    { label: t('admin.stats.suspendedChemists'), value: suspendedCount, icon: Users },
    { label: t('admin.stats.bridgeQueue'), value: 0, icon: Activity },
  ];

  const handleLiftSuspension = async (chemistId: string) => {
    try {
      const { data: result } = await liftSuspension({ variables: { chemistId } });
      setResultMessage({
        text: result?.liftSuspension.message ?? 'Done',
        success: result?.liftSuspension.success ?? false,
      });
    } catch (err) {
      setResultMessage({
        text: err instanceof Error ? err.message : 'Unknown error',
        success: false,
      });
    }
    setConfirmChemist(null);
  };

  const handleBulkRecall = async () => {
    const batchIds = bulkBatchIds
      .split('\n')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (batchIds.length === 0 || !bulkReason.trim()) return;

    try {
      const { data: result } = await bulkRecall({
        variables: { batchIds, reason: bulkReason.trim() },
      });
      setResultMessage({
        text: result?.bulkRecall.message ?? 'Done',
        success: result?.bulkRecall.success ?? false,
      });
      if (result?.bulkRecall.success) {
        setBulkBatchIds('');
        setBulkReason('');
      }
    } catch (err) {
      setResultMessage({
        text: err instanceof Error ? err.message : 'Unknown error',
        success: false,
      });
    }
    setShowRecallConfirm(false);
  };

  const parsedBatchIds = bulkBatchIds
    .split('\n')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold">{t('admin.title')}</h1>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 border-b border-border divide-x divide-border">
          {STATS.map((s) => (
            <div key={s.label} className="px-6 py-4">
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-xl font-semibold tabular-nums">{loading ? '...' : s.value}</p>
            </div>
          ))}
        </div>

        {/* Result message */}
        {resultMessage && (
          <div
            className={`mx-6 mt-4 px-4 py-3 text-xs border ${
              resultMessage.success
                ? 'border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-400'
                : 'border-destructive/40 bg-destructive/5 text-destructive'
            }`}
          >
            {resultMessage.text}
            <button
              onClick={() => setResultMessage(null)}
              className="ml-3 underline opacity-70 hover:opacity-100"
            >
              {t('admin.dismiss')}
            </button>
          </div>
        )}

        <div className="px-6 py-6 space-y-8">
          {/* Section 1: Flagged Chemists */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('admin.flaggedChemists')}
            </h2>

            {violations.length === 0 ? (
              <div className="border border-border px-4 py-8 text-center">
                <p className="text-xs text-muted-foreground">{t('admin.noViolations')}</p>
              </div>
            ) : (
              <div className="border border-border">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_100px_120px_140px_1fr_100px] gap-2 px-4 py-2 border-b border-border bg-muted/30">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">{t('admin.columns.chemistId')}</span>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">{t('admin.columns.violations')}</span>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">{t('admin.columns.status')}</span>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">{t('admin.columns.lastViolation')}</span>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">{t('admin.columns.batchIds')}</span>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">{t('admin.columns.action')}</span>
                </div>

                {/* Table rows */}
                {violations.map((v) => (
                  <div
                    key={v.chemistId}
                    className="grid grid-cols-[1fr_100px_120px_140px_1fr_100px] gap-2 px-4 py-3 border-b border-border last:border-b-0 items-center"
                  >
                    <span className="text-xs font-mono truncate">{v.chemistId}</span>
                    <span>
                      <Badge variant={v.violationCount >= 3 ? 'destructive' : 'warning'}>
                        {v.violationCount}
                      </Badge>
                    </span>
                    <span>
                      <Badge variant={v.suspended ? 'destructive' : 'success'}>
                        {v.suspended ? t('admin.suspended') : t('admin.active')}
                      </Badge>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {v.lastViolationAt > 0
                        ? format(new Date(v.lastViolationAt), 'd MMM yyyy')
                        : '---'}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono truncate">
                      {v.violationBatchIds.join(', ')}
                    </span>
                    <span>
                      {v.suspended && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px] h-7"
                          onClick={() => setConfirmChemist(v)}
                        >
                          {t('admin.liftSuspension')}
                        </Button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Section 2: Bulk Recall */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('admin.bulkRecall')}
            </h2>

            <div className="border border-border p-4 space-y-4 max-w-xl">
              <div>
                <Label className="text-xs">{t('admin.batchIdsLabel')}</Label>
                <Textarea
                  value={bulkBatchIds}
                  onChange={(e) => setBulkBatchIds(e.target.value)}
                  placeholder={t('admin.batchIdsPlaceholder')}
                  rows={4}
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">{t('admin.reasonLabel')}</Label>
                <Input
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder={t('admin.reasonPlaceholder')}
                  className="mt-1 text-xs"
                />
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="text-xs"
                disabled={parsedBatchIds.length === 0 || !bulkReason.trim() || recallLoading}
                onClick={() => setShowRecallConfirm(true)}
              >
                <AlertTriangle className="h-3 w-3 mr-1.5" />
                {t('admin.issueRecall')} ({parsedBatchIds.length})
              </Button>
            </div>
          </section>
        </div>

        {/* Lift Suspension Confirmation Dialog */}
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

        {/* Bulk Recall Confirmation Dialog */}
        <Dialog open={showRecallConfirm} onOpenChange={setShowRecallConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.confirmRecallTitle')}</DialogTitle>
              <DialogDescription>
                {t('admin.confirmRecallDescription', { count: parsedBatchIds.length })}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 border border-border p-3 max-h-32 overflow-auto">
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
              <Button
                variant="destructive"
                size="sm"
                disabled={recallLoading}
                onClick={handleBulkRecall}
              >
                {recallLoading ? t('common.loading') : t('admin.confirmRecall')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
