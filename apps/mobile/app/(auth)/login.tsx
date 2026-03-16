import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [nodeId, setNodeId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!nodeId.trim()) {
      Alert.alert(t('error'), t('login.nodeIdRequired'));
      return;
    }

    setLoading(true);
    try {
      // TODO: integrate real Aadhaar zkLogin
      // For prototype: store mock session
      await SecureStore.setItemAsync('nodeId', nodeId);
      await SecureStore.setItemAsync('orgRole', 'CHEMIST');

      // Route based on role (prototype: assume chemist for mobile login)
      router.replace('/(chemist)/scan');
    } catch (err) {
      Alert.alert(t('error'), t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePatientMode = () => {
    // Patient verification doesn't require login
    router.replace('/(patient)/verify');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DawaTrace</Text>
        <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>{t('login.chemistId')}</Text>
        <TextInput
          style={styles.input}
          value={nodeId}
          onChangeText={setNodeId}
          placeholder="CHEM-001"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.btnPrimaryText}>
            {loading ? t('loading') : t('login.chemistLogin')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handlePatientMode}>
          <Text style={styles.btnSecondaryText}>{t('login.verifyAsPatient')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '700', color: '#15803d' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  form: { gap: 12 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1fae5', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#fff' },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnPrimary: { backgroundColor: '#16a34a' },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#d1fae5' },
  btnSecondaryText: { color: '#16a34a', fontWeight: '500', fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
});
