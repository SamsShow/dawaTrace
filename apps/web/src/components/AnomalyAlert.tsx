import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Anomaly {
  batchId: string;
  type: 'QUANTITY_MISMATCH' | 'EXPIRED_DISPENSED' | 'SUSPENDED_CHEMIST' | 'RAPID_TRANSFER' | 'UNKNOWN';
  description: string;
  detectedAt: number;
}

interface Props {
  anomaly: Anomaly;
  onDismiss?: (batchId: string) => void;
}

const TYPE_LABEL: Record<Anomaly['type'], string> = {
  QUANTITY_MISMATCH: 'Qty mismatch',
  EXPIRED_DISPENSED: 'Expired dispensed',
  SUSPENDED_CHEMIST: 'Suspended chemist',
  RAPID_TRANSFER: 'Rapid transfer',
  UNKNOWN: 'Anomaly',
};

export default function AnomalyAlert({ anomaly, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex items-start justify-between gap-3 border border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-700/40 px-4 py-3">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          {TYPE_LABEL[anomaly.type]}
          <span className="font-mono font-normal text-muted-foreground ml-2">{anomaly.batchId}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{anomaly.description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(anomaly.detectedAt * 1000), { addSuffix: true })}
        </span>
        <button
          onClick={() => { setDismissed(true); onDismiss?.(anomaly.batchId); }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
