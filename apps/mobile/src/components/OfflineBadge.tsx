import { View, Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export default function OfflineBadge() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const check = async () => {
      const state = await Network.getNetworkStateAsync();
      setIsOffline(!state.isConnected || !state.isInternetReachable);
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>Offline — dispenses will sync when connected</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#f59e0b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
