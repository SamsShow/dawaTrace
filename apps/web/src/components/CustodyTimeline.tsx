import { formatDistanceToNow } from 'date-fns';
import type { CustodyRecord } from '../lib/types';

const NODE_COLORS: Record<string, string> = {
  MFG: 'bg-green-500',
  DIST: 'bg-blue-500',
  CF: 'bg-purple-500',
  STOCK: 'bg-yellow-500',
  CHEM: 'bg-orange-500',
  CDSCO: 'bg-red-500',
};

function getNodeColor(nodeId: string): string {
  for (const [prefix, color] of Object.entries(NODE_COLORS)) {
    if (nodeId.startsWith(prefix)) return color;
  }
  return 'bg-gray-500';
}

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
      <div className="text-sm text-gray-400 italic py-4">
        No custody records found on Sui — bridge may be syncing
      </div>
    );
  }

  return (
    <div className="relative">
      {recalled && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
          ⚠ Batch has been recalled — all transfers invalidated
        </div>
      )}
      <div className="space-y-0">
        {records.map((record, idx) => (
          <div key={record.objectId} className="flex items-start gap-4">
            {/* Timeline spine */}
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full mt-1 ${getNodeColor(record.toNode)}`} />
              {idx < records.length - 1 && (
                <div className="w-0.5 bg-gray-200 flex-1 min-h-[2rem]" />
              )}
            </div>
            {/* Card */}
            <div className="pb-6 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {getNodeLabel(record.fromNode)} → {getNodeLabel(record.toNode)}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  #{record.sequence}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>Qty: <span className="font-mono">{record.quantity.toLocaleString()}</span></div>
                <div>
                  {record.timestamp
                    ? formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })
                    : 'Unknown time'}
                </div>
                <div className="font-mono text-gray-300 truncate">{record.objectId.slice(0, 20)}...</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
