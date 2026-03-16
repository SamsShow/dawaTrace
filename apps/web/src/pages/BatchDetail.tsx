import { useParams } from 'react-router-dom';
import { useBatch, useVerifyBatch } from '../hooks/useBatch';
import { useRecall } from '../hooks/useRecall';
import Sidebar from '../components/Sidebar';
import CustodyTimeline from '../components/CustodyTimeline';
import RecallBanner from '../components/RecallBanner';
import { useState } from 'react';

export default function BatchDetail() {
  const { batchId } = useParams<{ batchId: string }>();
  const { data, loading } = useBatch(batchId ?? '');
  const batch = data?.batch;
  const { data: verifyData } = useVerifyBatch(batch?.suiObjectId ?? '');
  const verification = verifyData?.verifyBatch;
  const { recall, loading: recalling } = useRecall();
  const [showRecallForm, setShowRecallForm] = useState(false);
  const [reason, setReason] = useState('');

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 flex items-center justify-center text-gray-400">Loading...</main>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 flex items-center justify-center text-gray-400">Batch not found</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {batch.status === 'RECALLED' && verification && (
          <RecallBanner
            recall={{ batchId: batch.batchId, regulatorId: '', reason: '', timestamp: batch.updatedAt, suiTxDigest: '' }}
          />
        )}
        <div className="p-6 max-w-3xl">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{batch.drugName}</h2>
              <p className="text-sm font-mono text-gray-400 mt-0.5">{batch.batchId}</p>
            </div>
            {batch.status !== 'RECALLED' && (
              <button
                onClick={() => setShowRecallForm(true)}
                className="px-4 py-2 bg-danger-600 text-white text-sm font-medium rounded-lg hover:bg-danger-700 transition-colors"
              >
                Issue Recall
              </button>
            )}
          </div>

          {/* Batch details grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              ['Composition', batch.composition],
              ['Expiry Date', batch.expiryDate],
              ['Quantity', batch.quantity.toLocaleString()],
              ['Status', batch.status],
              ['Manufacturer', batch.manufacturerId],
              ['Custodian', batch.currentCustodian],
              ['Sui Object ID', batch.suiObjectId.slice(0, 20) + '...'],
              ['Data Hash', batch.dataHash.slice(0, 20) + '...'],
            ].map(([label, value]) => (
              <div key={label} className="bg-white rounded-lg border border-gray-100 p-3">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Recall form */}
          {showRecallForm && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl">
              <h3 className="text-sm font-semibold text-danger-800 mb-3">Confirm Recall</h3>
              <textarea
                className="w-full p-3 border border-danger-200 rounded-lg text-sm resize-none"
                rows={3}
                placeholder="Reason for recall (required, min 10 chars)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-2 mt-3">
                <button
                  disabled={reason.length < 10 || recalling}
                  onClick={async () => {
                    await recall(batch.batchId, reason);
                    setShowRecallForm(false);
                  }}
                  className="px-4 py-2 bg-danger-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {recalling ? 'Issuing...' : 'Confirm Recall'}
                </button>
                <button
                  onClick={() => setShowRecallForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Custody timeline from Sui */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Chain of Custody (Sui Public Layer)
            </h3>
            <CustodyTimeline
              records={verification?.custodyChain ?? []}
              recalled={verification?.recalled}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
