import { Link } from 'react-router-dom';
import { Badge } from './ui/badge';
import type { Batch, BatchStatus } from '../lib/types';

const STATUS_VARIANT: Record<BatchStatus, 'outline' | 'destructive' | 'warning' | 'success' | 'secondary'> = {
  ACTIVE: 'success',
  IN_TRANSIT: 'outline',
  DISPENSED: 'secondary',
  RECALLED: 'destructive',
  SUSPENDED_REVIEW: 'warning',
};

interface Props {
  batch: Batch;
}

export default function BatchCard({ batch }: Props) {
  return (
    <Link
      to={`/batches/${batch.batchId}`}
      className="flex items-center justify-between px-4 py-3 border-b border-border hover:bg-accent/40 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm text-foreground truncate">{batch.drugName}</p>
        <p className="text-xs font-mono text-muted-foreground mt-0.5">{batch.batchId}</p>
      </div>
      <div className="flex items-center gap-4 shrink-0 ml-4">
        <span className="text-xs text-muted-foreground hidden sm:block">
          {batch.expiryDate}
        </span>
        <Badge variant={STATUS_VARIANT[batch.status]}>
          {batch.status.replace('_', ' ')}
        </Badge>
      </div>
    </Link>
  );
}
