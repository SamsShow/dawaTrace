import { useState } from 'react';
import { X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { RecallRecord } from '../lib/types';

interface Props {
  recall: RecallRecord;
  onDismiss?: () => void;
}

export default function RecallBanner({ recall, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="w-full border-b border-destructive/30 bg-destructive/5 px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-xs font-semibold text-destructive shrink-0">RECALLED</span>
        <span className="text-xs text-muted-foreground truncate">
          Batch {recall.batchId}
          {recall.reason ? ` — ${recall.reason}` : ''}
          {recall.timestamp ? ` · ${formatDistanceToNow(new Date(recall.timestamp * 1000), { addSuffix: true })}` : ''}
        </span>
      </div>
      <button
        onClick={() => { setDismissed(true); onDismiss?.(); }}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
