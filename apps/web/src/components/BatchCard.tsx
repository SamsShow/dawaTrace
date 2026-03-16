import { Link } from 'react-router-dom';
import type { Batch } from '../lib/types';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  DISPENSED: 'bg-gray-100 text-gray-600',
  RECALLED: 'bg-red-100 text-red-800',
  SUSPENDED_REVIEW: 'bg-yellow-100 text-yellow-800',
};

interface Props {
  batch: Batch;
}

export default function BatchCard({ batch }: Props) {
  return (
    <Link
      to={`/batches/${batch.batchId}`}
      className="block p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm text-gray-900 truncate">{batch.drugName}</h3>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[batch.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {batch.status}
        </span>
      </div>
      <p className="text-xs text-gray-500 font-mono truncate">{batch.batchId}</p>
      <div className="mt-2 text-xs text-gray-400 flex gap-3">
        <span>Qty: {batch.quantity.toLocaleString()}</span>
        <span>Exp: {batch.expiryDate}</span>
      </div>
    </Link>
  );
}
