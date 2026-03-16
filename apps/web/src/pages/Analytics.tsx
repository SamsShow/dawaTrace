import Sidebar from '../components/Sidebar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const PLACEHOLDER_DATA = [
  { month: 'Oct', batches: 45000 },
  { month: 'Nov', batches: 52000 },
  { month: 'Dec', batches: 61000 },
  { month: 'Jan', batches: 58000 },
  { month: 'Feb', batches: 72000 },
  { month: 'Mar', batches: 89000 },
];

export default function Analytics() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Analytics</h2>
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Batch Throughput</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={PLACEHOLDER_DATA}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="batches" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
