import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

interface CustodyRecord {
  from: string;
  to: string;
  timestamp: number;
  sequence?: number;
  gpsLocation?: string;
}

interface VerifyResult {
  batchId: string;
  drugName: string;
  manufacturerId: string;
  expiryDate: string;
  quantity?: number;
  recalled: boolean;
  custodyChain: CustodyRecord[];
}

interface BatchVerifyCardProps {
  result: VerifyResult;
  onScanAnother: () => void;
  onReport: (batchId: string) => void;
}

function StatusBanner({ recalled }: { recalled: boolean }) {
  const { t } = useTranslation();

  return (
    <View style={[styles.banner, recalled ? styles.bannerRecalled : styles.bannerAuthentic]}>
      <View style={[styles.iconCircle, recalled ? styles.iconCircleRecalled : styles.iconCircleAuthentic]}>
        <Text style={[styles.iconText, recalled ? styles.iconTextRecalled : styles.iconTextAuthentic]}>
          {recalled ? '!' : '\u2713'}
        </Text>
      </View>
      <Text style={[styles.bannerText, recalled ? styles.bannerTextRecalled : styles.bannerTextAuthentic]}>
        {recalled ? t('verify.recalled') : t('verify.authentic')}
      </Text>
    </View>
  );
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

function CustodyChainSection({ chain }: { chain: CustodyRecord[] }) {
  const { t } = useTranslation();
  const lastThree = chain.slice(-3);

  if (lastThree.length === 0) return null;

  return (
    <View style={styles.custody}>
      <Text style={styles.custodyLabel}>
        {t('verify.custodyChain', { defaultValue: `Chain of custody (${chain.length} transfers)` })}
      </Text>
      {lastThree.map((record, i) => {
        const ts = record.timestamp > 0
          ? new Date(record.timestamp).toLocaleDateString()
          : '';

        return (
          <View key={`${record.from}-${record.to}-${i}`} style={styles.custodyRow}>
            <View style={styles.custodyTimeline}>
              <View style={styles.custodyDot} />
              {i < lastThree.length - 1 && <View style={styles.custodyLine} />}
            </View>
            <View style={styles.custodyContent}>
              <Text style={styles.custodyText} numberOfLines={1}>
                {record.from} {'\u2192'} {record.to}
              </Text>
              {ts !== '' && (
                <Text style={styles.custodyTimestamp}>{ts}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function BatchVerifyCard({ result, onScanAnother, onReport }: BatchVerifyCardProps) {
  const { t } = useTranslation();
  const isRecalled = result.recalled;

  return (
    <View style={styles.container}>
      <StatusBanner recalled={isRecalled} />

      {/* Batch details */}
      <View style={styles.details}>
        <InfoRow
          label={t('verify.drugName', { defaultValue: 'Drug Name' })}
          value={result.drugName}
        />
        <InfoRow
          label={t('verify.batchId', { defaultValue: 'Batch ID' })}
          value={result.batchId}
          mono
        />
        <InfoRow
          label={t('verify.manufacturer', { defaultValue: 'Manufacturer' })}
          value={result.manufacturerId}
          mono
        />
        <InfoRow
          label={t('verify.expiry', { defaultValue: 'Expiry' })}
          value={result.expiryDate}
        />
        {result.quantity != null && (
          <InfoRow
            label={t('verify.quantity', { defaultValue: 'Quantity' })}
            value={String(result.quantity)}
          />
        )}
      </View>

      {/* Custody chain (last 3 transfers) */}
      <CustodyChainSection chain={result.custodyChain} />

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btnPrimary, isRecalled ? styles.btnPrimaryRecalled : null]}
          onPress={onScanAnother}
          accessibilityLabel={t('verify.scanAnother')}
          accessibilityRole="button"
        >
          <Text style={styles.btnPrimaryText}>{t('verify.scanAnother')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => onReport(result.batchId)}
          accessibilityLabel={t('verify.report')}
          accessibilityRole="button"
        >
          <Text style={[styles.btnSecondaryText, isRecalled && styles.btnSecondaryTextRecalled]}>
            {t('verify.report')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
  },

  // Status banner
  banner: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerAuthentic: {
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  bannerRecalled: {
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconCircleAuthentic: {
    backgroundColor: '#dcfce7',
  },
  iconCircleRecalled: {
    backgroundColor: '#fee2e2',
  },
  iconText: {
    fontSize: 24,
    fontWeight: '700',
  },
  iconTextAuthentic: {
    color: '#15803d',
  },
  iconTextRecalled: {
    color: '#dc2626',
  },
  bannerText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bannerTextAuthentic: {
    color: '#15803d',
  },
  bannerTextRecalled: {
    color: '#dc2626',
  },

  // Details
  details: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  rowLabel: {
    fontSize: 13,
    color: '#71717a',
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 13,
    color: '#18181b',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 12,
  },

  // Custody chain
  custody: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
  },
  custodyLabel: {
    fontSize: 11,
    color: '#71717a',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  custodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  custodyTimeline: {
    alignItems: 'center',
    width: 16,
    marginRight: 8,
  },
  custodyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#18181b',
    marginTop: 2,
  },
  custodyLine: {
    width: 1,
    flex: 1,
    backgroundColor: '#d4d4d8',
    minHeight: 20,
  },
  custodyContent: {
    flex: 1,
    paddingBottom: 8,
  },
  custodyText: {
    fontSize: 12,
    color: '#3f3f46',
    fontFamily: 'monospace',
  },
  custodyTimestamp: {
    fontSize: 10,
    color: '#a1a1aa',
    marginTop: 2,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
  btnPrimary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#18181b',
    backgroundColor: '#18181b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnPrimaryRecalled: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  btnPrimaryText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  btnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  btnSecondaryTextRecalled: {
    color: '#dc2626',
  },
});
