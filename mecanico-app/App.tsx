// ============================================================
// App.tsx v2.1 — Entry point for PCM Mecânico
// With UpdateChecker, RealtimeProvider
// ============================================================

import React, { useCallback } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from './src/contexts/AuthContext';
import { RealtimeProvider } from './src/contexts/RealtimeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import UpdateChecker from './src/components/UpdateChecker';
import { COLORS } from './src/theme';

// Keep splash screen visible while we initialize
SplashScreen.preventAutoHideAsync().catch(() => {});

// Suppress known harmless warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  const onLayoutReady = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider onLayout={onLayoutReady}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />
      <AuthProvider>
        <RealtimeProvider>
          <UpdateChecker>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </UpdateChecker>
        </RealtimeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
