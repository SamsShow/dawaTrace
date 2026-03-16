import Sidebar from '../components/Sidebar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const THROUGHPUT_DATA = [
  { month: 'Oct', batches: 45000 },
  { month: 'Nov', batches: 52000 },
  { month: 'Dec', batches: 61000 },
  { month: 'Jan', batches: 58000 },
  { month: 'Feb', batches: 72000 },
  { month: 'Mar', batches: 89000 },
];

const RECALL_DATA = [
  { month: 'Oct', recalls: 3 },
  { month: 'Nov', recalls: 1 },
  { month: 'Dec', recalls: 5 },
  { month: 'Jan', recalls: 2 },
  { month: 'Feb', recalls: 4 },
  { month: 'Mar', recalls: 2 },
];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-medium">{title}</h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

export default function Analytics() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-4 border-b border-border">
          <h1 className="text-sm font-semibold">Analytics</h1>
        </div>

        <div className="px-6 py-6 space-y-4 max-w-3xl">
          <ChartCard title="Monthly batch throughput">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={THROUGHPUT_DATA} barCategoryGap="40%">
                <CartesianGrid vertical={false} stroke="hsl(240 5.9% 90%)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'hsl(240 3.8% 46.1%)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(240 3.8% 46.1%)' }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    border: '1px solid hsl(240 5.9% 90%)',
                    borderRadius: 0,
                    fontSize: 12,
                    boxShadow: 'none',
                  }}
                  cursor={{ fill: 'hsl(240 4.8% 95.9%)' }}
                />
                <Bar dataKey="batches" fill="hsl(240 5.9% 10%)" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Monthly recalls">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={RECALL_DATA} barCategoryGap="40%">
                <CartesianGrid vertical={false} stroke="hsl(240 5.9% 90%)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'hsl(240 3.8% 46.1%)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(240 3.8% 46.1%)' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    border: '1px solid hsl(240 5.9% 90%)',
                    borderRadius: 0,
                    fontSize: 12,
                    boxShadow: 'none',
                  }}
                  cursor={{ fill: 'hsl(240 4.8% 95.9%)' }}
                />
                <Bar dataKey="recalls" fill="hsl(0 72% 51%)" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Summary table */}
          <ChartCard title="System status">
            <div className="space-y-2">
              {[
                ['Fabric peers online', '4 / 4'],
                ['Bridge queue depth', '0 urgent · 3 normal'],
                ['Last Sui anchor', '12 seconds ago'],
                ['Recall SLA (90d avg)', '8.3 s'],
                ['Batches tracked (all-time)', '4,82,301'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-baseline py-1.5 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-mono text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </main>
    </div>
  );
}
