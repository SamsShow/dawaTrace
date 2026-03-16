import { useEffect, useRef } from 'react';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import { getPendingItems, markSynced } from '../store/syncQueue';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000';

/**
 * Subscribes to network state changes. When the device comes back online,
 * flushes the offline sync queue by submitting each pending dispense record to the API.
 *
 * This hook should be mounted once at the root chemist layout level.
 */
export function useOfflineSync(): void {
  const flushingRef = useRef(false);

  useEffect(() => {
    // Poll network state every 10 seconds
    const interval = setInterval(async () => {
      if (flushingRef.current) return;

      const netState = await Network.getNetworkStateAsync();
      if (!netState.isConnected || !netState.isInternetReachable) return;

      const pending = await getPendingItems();
      if (pending.length === 0) return;

      flushingRef.current = true;
      const token = await SecureStore.getItemAsync('token');

      for (const item of pending) {
        try {
          const res = await fetch(`${API_URL}/api/batches/${item.batchId}/dispense`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token ?? ''}`,
            },
            body: JSON.stringify({ quantity: item.quantity, patientHash: item.patientHash }),
          });
          if (res.ok) {
            await markSynced(item.id);
          }
        } catch {
          // Will retry on next interval
        }
      }

      flushingRef.current = false;
    }, 10_000);

    return () => clearInterval(interval);
  }, []);
}
