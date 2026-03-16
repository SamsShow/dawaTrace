import { useQuery, gql } from '@apollo/client';
import Sidebar from '../components/Sidebar';
import BatchCard from '../components/BatchCard';
import RecallBanner from '../components/RecallBanner';
import type { Batch, RecallRecord } from '../lib/types';

// Placeholder query — in production this would be paginated
const DASHBOARD_QUERY = gql`
  query DashboardData {
    anomalies(limit: 5) {
      batchId
      type
      description
      detectedAt
    }
  }
`;

// Static summary cards for the prototype
const SUMMARY_CARDS = [
  { label: 'Active Batches', value: '1,247', color: 'text-brand-600', bg: 'bg-brand-50' },
  { label: 'Recalls Today', value: '2', color: 'text-danger-600', bg: 'bg-danger-50' },
  { label: 'Flagged Chemists', value: '5', color: 'text-warning-600', bg: 'bg-warning-50' },
  { label: 'Sui Anchored', value: '99.8%', color: 'text-blue-600', bg: 'bg-blue-50' },
];

export default function Dashboard() {
  const { data } = useQuery(DASHBOARD_QUERY, { pollInterval: 30_000 });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Supply Chain Overview</h2>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {SUMMARY_CARDS.map((card) => (
            <div key={card.label} className={`${card.bg} rounded-xl p-4`}>
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Anomaly alerts */}
        {data?.anomalies?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Anomaly Alerts</h3>
            <div className="space-y-2">
              {data.anomalies.map((a: { batchId: string; type: string; description: string }) => (
                <div key={a.batchId} className="flex items-start gap-3 p-3 bg-warning-50 border border-warning-100 rounded-lg">
                  <span className="text-warning-600">⚠</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.type}</p>
                    <p className="text-xs text-gray-500">{a.description} — Batch {a.batchId}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* India supply chain map placeholder */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Batch Distribution Map</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 text-sm">
            Leaflet map — loads with active batch GPS coordinates from Fabric transfer records
          </div>
        </div>

        {/* Recent batches placeholder */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Batch Activity</h3>
          <p className="text-xs text-gray-400">
            Connect to Fabric to see live batch data. Use the GraphQL API at /graphql.
          </p>
        </div>
      </main>
    </div>
  );
}
