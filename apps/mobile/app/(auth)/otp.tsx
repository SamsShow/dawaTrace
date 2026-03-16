import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';

const OTP_LENGTH = 6;

export default function OTPScreen() {
  const { t } = useTranslation();
  const { nodeId, orgRole } = useLocalSearchParams<{ nodeId: string; orgRole: string }>();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const handleChange = (val: string, idx: number) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < OTP_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      Alert.alert(t('error'), t('otp.incomplete'));
      return;
    }

    setLoading(true);
    try {
      // TODO: validate OTP against API / Aadhaar zkLogin proof
      // Prototype: accept any 6-digit code
      await SecureStore.setItemAsync('nodeId', nodeId ?? '');
      await SecureStore.setItemAsync('orgRole', orgRole ?? 'CHEMIST');
      await SecureStore.setItemAsync('sessionToken', `mock-token-${Date.now()}`);

      const role = orgRole ?? 'CHEMIST';
      if (role === 'CHEMIST') {
        router.replace('/(chemist)/scan');
      } else {
        router.replace('/(patient)/verify');
      }
    } catch {
      Alert.alert(t('error'), t('otp.verifyFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    // TODO: trigger OTP resend via API
    setOtp(Array(OTP_LENGTH).fill(''));
    setResendTimer(30);
    inputs.current[0]?.focus();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>{t('otp.sentTo', { id: nodeId ?? '—' })}</Text>
      </View>

      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
            value={digit}
            onChangeText={(v) => handleChange(v, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        <Text style={styles.btnPrimaryText}>
          {loading ? t('loading') : t('otp.verify')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.resend, resendTimer > 0 && styles.resendDisabled]}
        onPress={handleResend}
        disabled={resendTimer > 0}
      >
        <Text style={styles.resendText}>
          {resendTimer > 0
            ? t('otp.resendIn', { seconds: resendTimer })
            : t('otp.resend')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>{t('back')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 36 },
  title: { fontSize: 24, fontWeight: '700', color: '#15803d' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 6, textAlign: 'center' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 28 },
  otpBox: {
    width: 44, height: 52, borderWidth: 1.5, borderColor: '#d1fae5',
    borderRadius: 10, textAlign: 'center', fontSize: 20, fontWeight: '600',
    backgroundColor: '#fff', color: '#111827',
  },
  otpBoxFilled: { borderColor: '#16a34a' },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#16a34a' },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
  resend: { alignItems: 'center', marginTop: 16 },
  resendDisabled: { opacity: 0.4 },
  resendText: { fontSize: 13, color: '#16a34a', fontWeight: '500' },
  back: { alignItems: 'center', marginTop: 12 },
  backText: { fontSize: 13, color: '#9ca3af' },
});
