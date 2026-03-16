import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export default function ReportScreen() {
  const { t } = useTranslation();
  const [batchId, setBatchId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!batchId.trim() || reason.length < 10) {
      Alert.alert(t('error'), t('report.requiredFields'));
      return;
    }

    setSubmitting(true);
    try {
      // TODO: submit to API → Sui awardDawaPoints flow
      // Anchor the report on Sui as permanent, timestamped evidence
      Alert.alert(
        t('report.submitted'),
        t('report.dawaPointsInfo'),
        [{ text: t('ok'), onPress: () => router.back() }]
      );
    } catch {
      Alert.alert(t('error'), t('report.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('report.title')}</Text>
      <Text style={styles.subtitle}>{t('report.subtitle')}</Text>

      <Text style={styles.label}>{t('report.batchId')}</Text>
      <TextInput
        style={styles.input}
        value={batchId}
        onChangeText={setBatchId}
        placeholder="BATCH-001"
        autoCapitalize="characters"
      />

      <Text style={styles.label}>{t('report.reason')}</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={reason}
        onChangeText={setReason}
        placeholder={t('report.reasonPlaceholder')}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <View style={styles.pointsInfo}>
        <Text style={styles.pointsIcon}>🎁</Text>
        <Text style={styles.pointsText}>{t('report.dawaPointsInfo')}</Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, submitting && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.btnText}>
          {submitting ? t('loading') : t('report.submit')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fff' },
  textarea: { minHeight: 100 },
  pointsInfo: { flexDirection: 'row', gap: 10, backgroundColor: '#d1fae5', padding: 14, borderRadius: 10, alignItems: 'flex-start' },
  pointsIcon: { fontSize: 20 },
  pointsText: { flex: 1, fontSize: 13, color: '#065f46' },
  btn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
});
