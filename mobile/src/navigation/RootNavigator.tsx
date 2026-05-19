import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { setOnUnauthorized } from '../services/api';
import { useRealtime } from '../hooks/useRealtime';
import AuthStack from './AuthStack';
import MainStack from './MainStack';

export default function RootNavigator() {
  const { isLoading, isAuthenticated, initialize, logout } = useAuthStore();
  useRealtime();

  useEffect(() => {
    initialize();
    setOnUnauthorized(() => {
      logout();
    });
  }, [initialize, logout]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
