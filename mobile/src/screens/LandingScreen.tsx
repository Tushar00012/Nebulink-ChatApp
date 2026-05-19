import {
  View,
  Image,
  ImageBackground,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Landing'>;

export default function LandingScreen({ navigation }: Props) {
  return (
    <ImageBackground
      source={require('../../assets/wallpaper.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/landing-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Signup')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  logoWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 600,
    height: 600,
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
});
