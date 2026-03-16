import { useState } from 'react';
import type { RecallRecord } from '../lib/types';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  recall: RecallRecord;
  onDismiss?: () => void;
}

export default function RecallBanner({ recall, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="w-full bg-red-600 text-white px-4 py-3 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">🚨</span>
        <div>
          <p className="font-semibold text-sm">
            RECALL ISSUED: Batch {recall.batchId}
          </p>
          <p className="text-xs text-red-100 mt-0.5">
            {recall.reason} — by {recall.regulatorId},{' '}
            {formatDistanceToNow(new Date(recall.timestamp * 1000), { addSuffix: true })}
          </p>
        </div>
      </div>
      <button
        onClick={() => {
          setDismissed(true);
          onDismiss?.();
        }}
        className="text-red-100 hover:text-white shrink-0 text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
