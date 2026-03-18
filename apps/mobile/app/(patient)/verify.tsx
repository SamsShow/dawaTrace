import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SuiClient } from '@mysten/sui/client';
import QRScanner from '../../src/components/QRScanner';
import BatchVerifyCard from '../../src/components/BatchVerifyCard';

const SUI_RPC = process.env['EXPO_PUBLIC_SUI_RPC_URL'] ?? 'https://fullnode.devnet.sui.io:443';
const SUI_PACKAGE_ID = process.env['EXPO_PUBLIC_SUI_PACKAGE_ID'] ?? '';
const suiClient = new SuiClient({ url: SUI_RPC });

interface CustodyRecord {
  from: string;
  to: string;
  timestamp: number;
  sequence: number;
}

interface VerifyResult {
  batchId: string;
  drugName: string;
  manufacturer: string;
  composition: string;
  expiryDate: string;
  quantity: number;
  recalled: boolean;
  custodyChain: CustodyRecord[];
}

export default function VerifyScreen() {
  const { t } = useTranslation();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleScanned = useCallback(async (rawData: string) => {
    if (loading) return;

    setScannerActive(false);
    setLoading(true);
    setErrorMsg(null);

    // Parse QR: dawaTrace:<fabricBatchId>:<suiObjectId>
    const parts = rawData.split(':');
    if (parts[0] !== 'dawaTrace' || parts.length < 3) {
      Alert.alert(t('error'), t('scan.invalidQR'), [
        { text: t('ok'), onPress: () => { setLoading(false); setScannerActive(true); } },
      ]);
      return;
    }

    const suiObjectId = parts[2]!;

    try {
      // Read batch object directly from Sui (public RPC, no auth needed)
      const object = await suiClient.getObject({
        id: suiObjectId,
        options: { showContent: true },
      });

      if (!object.data?.content || object.data.content.dataType !== 'moveObject') {
        throw new Error('Object not found');
      }

      const fields = object.data.content.fields as Record<string, unknown>;

      // Query CustodyTransferred events for this batch
      const custodyChain = await fetchCustodyChain(fields['batch_id'] as string);

      setResult({
        batchId: fields['batch_id'] as string,
        drugName: fields['drug_name'] as string,
        manufacturer: fields['manufacturer'] as string,
        composition: fields['composition'] as string,
        expiryDate: fields['expiry_date'] as string,
        quantity: Number(fields['quantity']),
        recalled: fields['recalled'] as boolean,
        custodyChain,
      });
    } catch {
      Alert.alert(t('error'), t('verify.failed'), [
        { text: t('ok'), onPress: () => { setScannerActive(true); } },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, t]);

  const handleScanAnother = useCallback(() => {
    setResult(null);
    setErrorMsg(null);
    setScannerActive(true);
  }, []);

  const handleReport = useCallback((batchId: string) => {
    router.push({ pathname: '/(patient)/report', params: { batchId } });
  }, []);

  // Show result card
  if (result) {
    return (
      <ScrollView
        style={styles.resultContainer}
        contentContainerStyle={styles.resultContent}
      >
        <BatchVerifyCard
          result={{
            batchId: result.batchId,
            drugName: result.drugName,
            manufacturerId: result.manufacturer,
            expiryDate: result.expiryDate,
            quantity: result.quantity,
            recalled: result.recalled,
            custodyChain: result.custodyChain,
          }}
          onScanAnother={handleScanAnother}
          onReport={handleReport}
        />
      </ScrollView>
    );
  }

  // Show scanner with loading overlay
  return (
    <View style={styles.container}>
      <QRScanner onScanned={handleScanned} active={scannerActive} />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      )}
      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Fetch custody chain by querying CustodyTransferred events from Sui.
 * Returns the transfers sorted by sequence number.
 */
async function fetchCustodyChain(batchId: string): Promise<CustodyRecord[]> {
  if (!SUI_PACKAGE_ID) return [];

  try {
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${SUI_PACKAGE_ID}::custody::CustodyTransferred`,
      },
      limit: 50,
    });

    return events.data
      .filter((e) => {
        const f = e.parsedJson as Record<string, unknown>;
        return f['batch_id'] === batchId;
      })
      .map((e) => {
        const f = e.parsedJson as Record<string, unknown>;
        return {
          from: f['from_node'] as string,
          to: f['to_node'] as string,
          sequence: Number(f['sequence']),
          timestamp: Number(e.timestampMs ?? 0),
        };
      })
      .sort((a, b) => a.sequence - b.sequence);
  } catch {
    // Non-critical: return empty chain if events can't be fetched
    return [];
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  resultContent: {
    paddingBottom: 32,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 12,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});
