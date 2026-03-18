import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { useZkLogin } from '../../src/hooks/useZkLogin';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [nodeId, setNodeId] = useState('');
  const [loading, setLoading] = useState(false);
  const { state: zkState, startLogin, getStoredAddress, clearSession } = useZkLogin();

  // Check for existing zkLogin session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const storedAddress = await getStoredAddress();
      if (storedAddress && !cancelled) {
        await SecureStore.setItemAsync('orgRole', 'CHEMIST');
        await SecureStore.setItemAsync('suiAddress', storedAddress);
        router.replace('/(chemist)/scan');
      }
    })();
    return () => { cancelled = true; };
  }, [getStoredAddress]);

  // React to zkLogin state changes
  useEffect(() => {
    if (zkState.step === 'done' && zkState.suiAddress) {
      (async () => {
        await SecureStore.setItemAsync('orgRole', 'CHEMIST');
        await SecureStore.setItemAsync('suiAddress', zkState.suiAddress!);
        if (nodeId.trim()) {
          await SecureStore.setItemAsync('nodeId', nodeId);
        }
        router.replace('/(chemist)/scan');
      })();
    } else if (zkState.step === 'error' && zkState.error) {
      Alert.alert(t('error'), zkState.error);
    }
  }, [zkState.step, zkState.suiAddress, zkState.error, nodeId, t]);

  const handleGoogleLogin = async () => {
    await startLogin('google');
  };

  const handleManualLogin = async () => {
    if (!nodeId.trim()) {
      Alert.alert(t('error'), t('login.nodeIdRequired'));
      return;
    }

    setLoading(true);
    try {
      await SecureStore.setItemAsync('nodeId', nodeId);
      await SecureStore.setItemAsync('orgRole', 'CHEMIST');
      router.replace('/(chemist)/scan');
    } catch {
      Alert.alert(t('error'), t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePatientMode = () => {
    router.replace('/(patient)/verify');
  };

  const isZkLoading =
    zkState.step === 'generating_nonce' ||
    zkState.step === 'oauth_redirect' ||
    zkState.step === 'proving';

  const getZkButtonLabel = (): string => {
    switch (zkState.step) {
      case 'generating_nonce':
        return t('login.preparingAuth', { defaultValue: 'Preparing authentication...' });
      case 'oauth_redirect':
        return t('login.waitingForGoogle', { defaultValue: 'Waiting for Google...' });
      case 'proving':
        return t('login.verifyingIdentity', { defaultValue: 'Verifying identity...' });
      default:
        return t('login.signInWithGoogle', { defaultValue: 'Sign in with Google (zkLogin)' });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DawaTrace</Text>
        <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
      </View>

      <View style={styles.form}>
        {/* Primary: Google zkLogin */}
        <TouchableOpacity
          style={[styles.btn, styles.btnGoogle, isZkLoading && styles.btnDisabled]}
          onPress={handleGoogleLogin}
          disabled={isZkLoading || loading}
        >
          {isZkLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.btnGoogleText}>{getZkButtonLabel()}</Text>
            </View>
          ) : (
            <Text style={styles.btnGoogleText}>{getZkButtonLabel()}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>
            {t('login.orDivider', { defaultValue: 'or' })}
          </Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Fallback: Manual chemist ID login */}
        <Text style={styles.label}>{t('login.chemistId')}</Text>
        <TextInput
          style={styles.input}
          value={nodeId}
          onChangeText={setNodeId}
          placeholder="CHEM-001"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isZkLoading}
        />

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, (loading || isZkLoading) && styles.btnDisabled]}
          onPress={handleManualLogin}
          disabled={loading || isZkLoading}
        >
          <Text style={styles.btnPrimaryText}>
            {loading ? t('loading') : t('login.chemistLogin')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={handlePatientMode}
          disabled={isZkLoading}
        >
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
  input: {
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnGoogle: { backgroundColor: '#4285F4' },
  btnGoogleText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnPrimary: { backgroundColor: '#16a34a' },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#d1fae5' },
  btnSecondaryText: { color: '#16a34a', fontWeight: '500', fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#d1fae5' },
  dividerText: { marginHorizontal: 12, color: '#9ca3af', fontSize: 13 },
});
