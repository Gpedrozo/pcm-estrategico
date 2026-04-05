// ============================================================
// App.tsx v2.0 — Entry point for PCM Mecânico
// Simplified: no SQLite, no UpdateChecker, no edge functions
// ============================================================

import React, { useCallback } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
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
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
