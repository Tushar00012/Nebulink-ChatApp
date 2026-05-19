import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import OtpScreen from '../screens/OtpScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator initialRouteName="Landing">
      <Stack.Screen
        name="Landing"
        component={LandingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Sign up' }} />
      <Stack.Screen name="Otp" component={OtpScreen} options={{ title: 'Verify OTP' }} />
    </Stack.Navigator>
  );
}
