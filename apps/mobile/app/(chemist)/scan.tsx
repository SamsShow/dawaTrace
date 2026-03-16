import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import OfflineBadge from '../../src/components/OfflineBadge';

export default function ScanScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>{t('scan.cameraPermission')}</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>{t('scan.grantPermission')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // QR encodes: "dawaTrace:<fabricBatchId>:<suiObjectId>"
    const parts = data.split(':');
    if (parts[0] !== 'dawaTrace' || parts.length < 3) {
      Alert.alert(t('error'), t('scan.invalidQR'), [
        { text: t('ok'), onPress: () => setScanned(false) },
      ]);
      return;
    }

    const batchId = parts[1];
    const suiObjectId = parts[2];

    router.push({
      pathname: '/(chemist)/dispense',
      params: { batchId, suiObjectId },
    });

    setTimeout(() => setScanned(false), 2000);
  };

  return (
    <View style={styles.container}>
      <OfflineBadge />
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.hint}>{t('scan.hint')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', padding: 24 },
  btn: { backgroundColor: '#16a34a', padding: 14, borderRadius: 12, marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 220, height: 220, borderWidth: 2, borderColor: '#22c55e', borderRadius: 12 },
  hint: { color: '#fff', fontSize: 13, marginTop: 16, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
});
