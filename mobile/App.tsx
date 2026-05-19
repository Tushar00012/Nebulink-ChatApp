import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}
