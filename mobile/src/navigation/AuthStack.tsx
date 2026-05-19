import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';
import PhoneScreen from '../screens/PhoneScreen';
import OtpScreen from '../screens/OtpScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="Phone" component={PhoneScreen} options={{ title: 'Login' }} />
      <Stack.Screen name="Otp" component={OtpScreen} options={{ title: 'Verify OTP' }} />
    </Stack.Navigator>
  );
}
