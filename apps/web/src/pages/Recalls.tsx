import Sidebar from '../components/Sidebar';

export default function Recalls() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Recall Management</h2>
        <p className="text-sm text-gray-500">
          Active recalls are shown here. Issue recalls from the batch detail page.
          Each recall is anchored to Sui within 60 seconds via the bridge relay.
        </p>
      </main>
    </div>
  );
}
