import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { getSyncQueue } from '../../src/store/syncQueue';

interface HistoryItem {
  batchId: string;
  quantity: number;
  timestamp: number;
  synced: boolean;
}

export default function HistoryScreen() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    getSyncQueue().then(setItems);
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item, idx) => `${item.batchId}-${idx}`}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.row}>
              <Text style={styles.batchId}>{item.batchId}</Text>
              <View style={[styles.badge, item.synced ? styles.badgeSynced : styles.badgePending]}>
                <Text style={styles.badgeText}>{item.synced ? 'Synced' : 'Pending'}</Text>
              </View>
            </View>
            <Text style={styles.meta}>Qty: {item.quantity} · {new Date(item.timestamp).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No dispense history yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  item: { backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 6, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  batchId: { fontSize: 14, fontWeight: '600', color: '#111827', fontFamily: 'monospace' },
  meta: { fontSize: 12, color: '#9ca3af' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  badgeSynced: { backgroundColor: '#d1fae5' },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
});
