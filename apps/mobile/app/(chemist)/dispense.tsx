import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Network from 'expo-network';
import { addToSyncQueue } from '../../src/store/syncQueue';
import { getOfflineBatch, cacheOfflineBatch } from '../../src/store/offlineCache';
import OfflineBadge from '../../src/components/OfflineBadge';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export default function DispenseScreen() {
  const { t } = useTranslation();
  const { batchId, suiObjectId } = useLocalSearchParams<{ batchId: string; suiObjectId: string }>();
  const [batch, setBatch] = useState<{ drugName: string; expiryDate: string; manufacturer: string } | null>(null);
  const [quantity, setQuantity] = useState('');
  const [patientHash, setPatientHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBatch();
  }, [batchId]);

  const loadBatch = async () => {
    setLoading(true);
    try {
      const netState = await Network.getNetworkStateAsync();

      if (netState.isConnected && netState.isInternetReachable) {
        // Online: fetch from API and cache
        const res = await fetch(`${API_URL}/api/batches/${batchId}`, {
          headers: { Authorization: `Bearer ${await getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBatch(data);
          await cacheOfflineBatch(batchId!, data);
          return;
        }
      }

      // Offline or API failed: try cache
      const cached = await getOfflineBatch(batchId!);
      if (cached) {
        setBatch(cached);
      } else {
        Alert.alert(t('error'), t('dispense.batchNotCached'));
      }
    } catch {
      const cached = await getOfflineBatch(batchId!);
      if (cached) setBatch(cached);
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async () => {
    if (!quantity || !patientHash) {
      Alert.alert(t('error'), t('dispense.requiredFields'));
      return;
    }
    if (patientHash.length !== 64) {
      Alert.alert(t('error'), t('dispense.invalidHash'));
      return;
    }

    setSubmitting(true);
    try {
      const netState = await Network.getNetworkStateAsync();

      if (netState.isConnected && netState.isInternetReachable) {
        // Online: submit directly
        const res = await fetch(`${API_URL}/api/batches/${batchId}/dispense`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
          body: JSON.stringify({ quantity: parseInt(quantity), patientHash }),
        });
        if (res.ok) {
          Alert.alert(t('success'), t('dispense.success'), [
            { text: t('ok'), onPress: () => router.back() },
          ]);
        } else {
          throw new Error('API error');
        }
      } else {
        // Offline: add to sync queue
        await addToSyncQueue({
          batchId: batchId!,
          quantity: parseInt(quantity),
          patientHash,
          timestamp: Date.now(),
        });
        Alert.alert(t('dispense.offlineTitle'), t('dispense.offlineQueued'), [
          { text: t('ok'), onPress: () => router.back() },
        ]);
      }
    } catch {
      Alert.alert(t('error'), t('dispense.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <OfflineBadge />

      {batch && (
        <View style={styles.batchCard}>
          <Text style={styles.drugName}>{batch.drugName}</Text>
          <Text style={styles.batchMeta}>Batch: {batchId}</Text>
          <Text style={styles.batchMeta}>Exp: {batch.expiryDate}</Text>
          <Text style={styles.batchMeta}>{batch.manufacturer}</Text>
        </View>
      )}

      <Text style={styles.label}>{t('dispense.quantity')}</Text>
      <TextInput
        style={styles.input}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        placeholder="Enter quantity"
      />

      <Text style={styles.label}>{t('dispense.patientHash')}</Text>
      <TextInput
        style={[styles.input, styles.monoInput]}
        value={patientHash}
        onChangeText={setPatientHash}
        placeholder="SHA-256 of Aadhaar+BatchId+Timestamp"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.hint}>{t('dispense.hashHint')}</Text>

      <TouchableOpacity
        style={[styles.btn, submitting && styles.btnDisabled]}
        onPress={handleDispense}
        disabled={submitting}
      >
        <Text style={styles.btnText}>
          {submitting ? t('loading') : t('dispense.confirm')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

async function getToken(): Promise<string> {
  const { default: SecureStore } = await import('expo-secure-store');
  return (await SecureStore.getItemAsync('token')) ?? '';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: '#6b7280', fontSize: 15 },
  batchCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#d1fae5' },
  drugName: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 6 },
  batchMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fff' },
  monoInput: { fontFamily: 'monospace', fontSize: 12 },
  hint: { fontSize: 11, color: '#9ca3af', marginTop: -8 },
  btn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
});
