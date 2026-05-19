import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';
import { api } from '../services/api';
import {
  COUNTRY_CODE,
  PHONE_DIGITS_LENGTH,
  toFullPhone,
  sanitizeDigits,
  sanitizeUsername,
  isValidIndianPhone,
  isValidUsername,
} from '../utils/phoneInput';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const [digits, setDigits] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!isValidUsername(username)) {
      setError('Enter a username (2–32 letters, numbers, or spaces)');
      return;
    }
    if (!isValidIndianPhone(digits)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    const formatted = toFullPhone(digits);
    const name = username.trim();
    setError('');
    setLoading(true);
    try {
      await api.auth.signupSendOtp(formatted, name);
      navigation.navigate('Otp', { phone: formatted, name, mode: 'signup' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.field}
        placeholder="Your display name"
        autoCapitalize="words"
        maxLength={32}
        value={username}
        onChangeText={(text) => setUsername(sanitizeUsername(text))}
        editable={!loading}
      />
      <Text style={styles.label}>Phone number</Text>
      <View style={styles.inputRow}>
        <Text style={styles.prefix}>{COUNTRY_CODE}</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter mobile number"
          keyboardType="number-pad"
          autoComplete="tel-national"
          maxLength={PHONE_DIGITS_LENGTH}
          value={digits}
          onChangeText={(text) => setDigits(sanitizeDigits(text))}
          editable={!loading}
        />
      </View>
      <Text style={styles.hint}>Use a new number that is not already registered.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send OTP</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  field: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 16,
  },
  hint: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#dc2626',
    marginBottom: 12,
  },
});
