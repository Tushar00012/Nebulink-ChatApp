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
import { loginWithPhone } from '../services/auth';
import { useAuthStore } from '../store/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'Phone'>;

const COUNTRY_CODE = '+91';
const PHONE_DIGITS_LENGTH = 10;

function toFullPhone(digits: string): string {
  return `${COUNTRY_CODE}${digits}`;
}

function sanitizeDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, PHONE_DIGITS_LENGTH);
}

function sanitizeUsername(value: string): string {
  return value.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 32);
}

function isValidUsername(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 32 && /^[a-zA-Z0-9 ]+$/.test(trimmed);
}

export default function PhoneScreen({ navigation }: Props) {
  const [digits, setDigits] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleContinue = async () => {
    if (digits.length !== PHONE_DIGITS_LENGTH) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError('Enter a valid Indian mobile number');
      return;
    }
    if (!isValidUsername(username)) {
      setError('Enter a username (2–32 letters, numbers, or spaces)');
      return;
    }
    const formatted = toFullPhone(digits);
    const name = username.trim();
    setError('');
    setLoading(true);
    try {
      const result = await loginWithPhone(formatted, name);
      if (!result.requiresOtp) {
        await setAuth(result.accessToken, result.user);
        return;
      }
      navigation.navigate('Otp', { phone: formatted, name });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
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
          placeholder="Enter Mobile Number"
          keyboardType="number-pad"
          autoComplete="tel-national"
          maxLength={PHONE_DIGITS_LENGTH}
          value={digits}
          onChangeText={(text) => setDigits(sanitizeDigits(text))}
          editable={!loading}
        />
      </View>
      <Text style={styles.hint}>Existing users sign in instantly. New users receive an OTP.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
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
