import { formatDistanceToNow } from 'date-fns';
import type { CustodyRecord } from '../lib/types';

function getNodeLabel(nodeId: string): string {
  if (nodeId.startsWith('MFG')) return 'Manufacturer';
  if (nodeId.startsWith('DIST')) return 'Distributor';
  if (nodeId.startsWith('CF')) return 'C&F Agent';
  if (nodeId.startsWith('STOCK')) return 'Stockist';
  if (nodeId.startsWith('CHEM')) return 'Chemist';
  return nodeId;
}

interface Props {
  records: CustodyRecord[];
  recalled?: boolean;
}

export default function CustodyTimeline({ records, recalled }: Props) {
  if (records.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4">
        No custody records on Sui yet — bridge may be syncing.
      </p>
    );
  }

  return (
    <div>
      {recalled && (
        <p className="text-xs text-destructive mb-4 pb-3 border-b border-border">
          This batch has been recalled. All transfers are invalidated.
        </p>
      )}
      <div>
        {records.map((record, idx) => (
          <div key={record.objectId} className="flex gap-3">
            {/* Spine */}
            <div className="flex flex-col items-center pt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground mt-0.5 shrink-0" />
              {idx < records.length - 1 && (
                <div className="w-px bg-border flex-1 min-h-[1.75rem] mt-1" />
              )}
            </div>
            {/* Content */}
            <div className="pb-5 min-w-0 flex-1">
              <p className="text-sm text-foreground">
                {getNodeLabel(record.fromNode)}
                <span className="text-muted-foreground mx-1.5">→</span>
                {getNodeLabel(record.toNode)}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {record.quantity.toLocaleString()} units
                </span>
                <span className="text-xs text-muted-foreground">
                  {record.timestamp
                    ? formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })
                    : '—'}
                </span>
                <span className="text-xs font-mono text-muted-foreground/60">
                  #{record.sequence}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
