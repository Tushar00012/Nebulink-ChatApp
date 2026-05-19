import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../store/authStore';

export default function ProfileHeader() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<'phone' | 'code' | null>(null);

  if (!user) {
    return null;
  }

  const copyValue = async (value: string, field: 'phone' | 'code') => {
    await Clipboard.setStringAsync(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  const avatarLetter = (user.name?.[0] ?? user.userCode?.[0] ?? '?').toUpperCase();

  return (
    <>
      <TouchableOpacity
        style={styles.avatar}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.avatarText}>{avatarLetter}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.panel}>
            <Text style={styles.panelName}>{user.name}</Text>
            <TouchableOpacity
              onPress={() => user.userCode && copyValue(user.userCode, 'code')}
              activeOpacity={0.9}
            >
              <Text style={styles.userCode}>{user.userCode}</Text>
              <Text style={styles.copyHint}>
                {copiedField === 'code' ? 'Copied!' : 'Tap to copy user code'}
              </Text>
            </TouchableOpacity>
            {user.phone ? (
              <>
                {/* <View style={styles.divider} /> */}
                {/* <TouchableOpacity
                  onPress={() => copyValue(user.phone!, 'phone')}
                  activeOpacity={0.9}
                >
                  <Text style={styles.phone}>{user.phone}</Text>
                  <Text style={styles.copyHint}>
                    {copiedField === 'phone' ? 'Copied!' : 'Tap to copy phone'}
                  </Text>
                </TouchableOpacity> */}
              </>
            ) : null}
            <View style={styles.divider} />
            <TouchableOpacity onPress={handleLogout} activeOpacity={0.7}>
              <Text style={styles.logout}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(33, 64, 135, 0.25)',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 12,
    zIndex: 1,
  },
  panel: {
    minWidth: 200,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  panelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  userCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  phone: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  copyHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  logout: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
});
