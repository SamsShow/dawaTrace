import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

interface CustodyRecord {
  from: string;
  to: string;
  timestamp: number;
  gpsLocation?: string;
}

interface VerifyResult {
  batchId: string;
  drugName: string;
  manufacturerId: string;
  expiryDate: string;
  recalled: boolean;
  custodyChain: CustodyRecord[];
}

interface BatchVerifyCardProps {
  result: VerifyResult;
  onScanAnother: () => void;
  onReport: (batchId: string) => void;
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

export default function BatchVerifyCard({ result, onScanAnother, onReport }: BatchVerifyCardProps) {
  const { t } = useTranslation();
  const isRecalled = result.recalled;

  return (
    <View style={styles.container}>
      {/* Status banner */}
      <View style={[styles.banner, isRecalled ? styles.bannerRecalled : styles.bannerAuthentic]}>
        <Text style={[styles.bannerText, isRecalled ? styles.bannerTextRecalled : styles.bannerTextAuthentic]}>
          {isRecalled ? t('verify.recalled') : t('verify.authentic')}
        </Text>
      </View>

      {/* Batch details */}
      <View style={styles.details}>
        <InfoRow label="Drug" value={result.drugName} />
        <InfoRow label="Batch ID" value={result.batchId} mono />
        <InfoRow label="Manufacturer" value={result.manufacturerId} mono />
        <InfoRow label="Expiry" value={result.expiryDate} />
      </View>

      {/* Custody chain summary */}
      {result.custodyChain.length > 0 && (
        <View style={styles.custody}>
          <Text style={styles.custodyLabel}>Chain of custody ({result.custodyChain.length} transfers)</Text>
          {result.custodyChain.slice(-3).map((record, i) => (
            <View key={i} style={styles.custodyRow}>
              <View style={styles.custodyDot} />
              <Text style={styles.custodyText} numberOfLines={1}>
                {record.from} → {record.to}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnPrimary} onPress={onScanAnother}>
          <Text style={styles.btnPrimaryText}>{t('verify.scanAnother')}</Text>
        </TouchableOpacity>

        {!isRecalled && (
          <TouchableOpacity style={styles.btnSecondary} onPress={() => onReport(result.batchId)}>
            <Text style={styles.btnSecondaryText}>{t('verify.report')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    marginHorizontal: 16,
    marginTop: 16,
  },
  banner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerAuthentic: { backgroundColor: '#f0fdf4', borderBottomWidth: 1, borderBottomColor: '#bbf7d0' },
  bannerRecalled: { backgroundColor: '#fef2f2', borderBottomWidth: 1, borderBottomColor: '#fecaca' },
  bannerText: { fontSize: 15, fontWeight: '600', letterSpacing: 0.2 },
  bannerTextAuthentic: { color: '#15803d' },
  bannerTextRecalled: { color: '#dc2626' },
  details: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  rowLabel: { fontSize: 12, color: '#71717a', flexShrink: 0 },
  rowValue: { fontSize: 12, color: '#18181b', flex: 1, textAlign: 'right', marginLeft: 8 },
  mono: { fontFamily: 'monospace' },
  custody: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 10,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  custodyLabel: { fontSize: 11, color: '#71717a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  custodyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  custodyDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#18181b', marginRight: 8 },
  custodyText: { fontSize: 11, color: '#3f3f46', fontFamily: 'monospace', flex: 1 },
  actions: { flexDirection: 'row', gap: 8, padding: 16 },
  btnPrimary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#18181b',
    backgroundColor: '#18181b',
    paddingVertical: 9,
    alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 13, color: '#fff', fontWeight: '500' },
  btnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    paddingVertical: 9,
    alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 13, color: '#71717a' },
});
