import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SuiClient } from '@mysten/sui/client';

const SUI_RPC = process.env['EXPO_PUBLIC_SUI_RPC_URL'] ?? 'https://fullnode.devnet.sui.io:443';
const suiClient = new SuiClient({ url: SUI_RPC });

interface VerifyResult {
  batchId: string;
  recalled: boolean;
  drugName: string;
  expiryDate: string;
  manufacturer: string;
}

export default function VerifyScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>{t('scan.cameraPermission')}</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>{t('scan.grantPermission')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    const parts = data.split(':');
    if (parts[0] !== 'dawaTrace' || parts.length < 3) {
      Alert.alert(t('error'), t('scan.invalidQR'), [
        { text: t('ok'), onPress: () => { setScanned(false); setLoading(false); } },
      ]);
      return;
    }

    const suiObjectId = parts[2]!;

    try {
      // Read directly from Sui (public RPC — no API gateway needed)
      const object = await suiClient.getObject({
        id: suiObjectId,
        options: { showContent: true },
      });

      if (!object.data?.content || object.data.content.dataType !== 'moveObject') {
        throw new Error('Not found');
      }

      const fields = object.data.content.fields as Record<string, unknown>;
      setResult({
        batchId: fields['batch_id'] as string,
        recalled: fields['recalled'] as boolean,
        drugName: fields['drug_name'] as string,
        expiryDate: fields['expiry_date'] as string,
        manufacturer: fields['manufacturer'] as string,
      });
    } catch {
      Alert.alert(t('error'), t('verify.failed'), [
        { text: t('ok'), onPress: () => { setScanned(false); setLoading(false); } },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const isValid = !result.recalled;
    return (
      <ScrollView style={styles.resultContainer}>
        <View style={[styles.resultCard, isValid ? styles.resultValid : styles.resultRecalled]}>
          <Text style={styles.resultIcon}>{isValid ? '✅' : '🚨'}</Text>
          <Text style={styles.resultStatus}>
            {isValid ? t('verify.authentic') : t('verify.recalled')}
          </Text>
        </View>

        <View style={styles.detailsCard}>
          {[
            ['Drug Name', result.drugName],
            ['Batch ID', result.batchId],
            ['Expiry', result.expiryDate],
            ['Manufacturer', result.manufacturer],
          ].map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => { setResult(null); setScanned(false); }}
        >
          <Text style={[styles.btnText, { color: '#16a34a' }]}>{t('verify.scanAnother')}</Text>
        </TouchableOpacity>

        {!isValid && (
          <TouchableOpacity
            style={[styles.btn, styles.btnDanger]}
            onPress={() => router.push('/(patient)/report')}
          >
            <Text style={styles.btnText}>{t('verify.report')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.hint}>{loading ? t('loading') : t('verify.scanHint')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', padding: 24 },
  btn: { margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnSecondary: { borderWidth: 1, borderColor: '#16a34a', backgroundColor: 'transparent' },
  btnDanger: { backgroundColor: '#dc2626' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 220, height: 220, borderWidth: 2, borderColor: '#22c55e', borderRadius: 12 },
  hint: { color: '#fff', fontSize: 13, marginTop: 16, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  resultContainer: { flex: 1, backgroundColor: '#f9fafb' },
  resultCard: { margin: 16, padding: 24, borderRadius: 16, alignItems: 'center' },
  resultValid: { backgroundColor: '#d1fae5' },
  resultRecalled: { backgroundColor: '#fee2e2' },
  resultIcon: { fontSize: 48, marginBottom: 8 },
  resultStatus: { fontSize: 20, fontWeight: '700', color: '#111827' },
  detailsCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 13, color: '#6b7280' },
  detailValue: { fontSize: 13, fontWeight: '500', color: '#111827', flex: 1, textAlign: 'right', marginLeft: 12 },
});
