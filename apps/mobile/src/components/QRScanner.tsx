import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';

interface QRScannerProps {
  onScanned: (batchId: string) => void;
  active?: boolean;
}

const DAWATRCE_PREFIX = 'dawaTrace://batch/';

export default function QRScanner({ onScanned, active = true }: QRScannerProps) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  // Reset scanned state when scanner becomes active again
  useEffect(() => {
    if (active) setScanned(false);
  }, [active]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#000" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>{t('scan.cameraPermission')}</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>{t('scan.grantPermission')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || !active) return;
    setScanned(true);

    // Accept both prefixed and bare batch IDs
    const batchId = data.startsWith(DAWATRCE_PREFIX)
      ? data.slice(DAWATRCE_PREFIX.length).trim()
      : data.trim();

    if (!batchId) {
      setScanned(false);
      return;
    }

    onScanned(batchId);

    // Allow re-scan after 3s
    cooldownRef.current = setTimeout(() => setScanned(false), 3000);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Viewfinder overlay */}
      <View style={styles.overlay}>
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
        <Text style={styles.hint}>{t('scan.hint')}</Text>
      </View>

      {scanned && (
        <View style={styles.scanningBadge}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      )}
    </View>
  );
}

const CORNER = 20;
const BORDER = 3;

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  permissionText: { fontSize: 14, color: '#374151', textAlign: 'center', marginBottom: 16 },
  btn: {
    borderWidth: 1,
    borderColor: '#111',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  btnText: { fontSize: 13, color: '#111' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: 220,
    height: 220,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#fff',
  },
  tl: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER },
  tr: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER },
  bl: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER },
  br: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER },
  hint: {
    marginTop: 24,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  scanningBadge: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
