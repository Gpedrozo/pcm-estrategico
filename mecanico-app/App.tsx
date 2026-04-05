// ============================================================
// App.tsx — Entry point for PCM Mecânico
// ============================================================

import React, { useEffect, useCallback } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import UpdateChecker from './src/components/UpdateChecker';
import { initDatabase } from './src/lib/database';
import { COLORS } from './src/theme';

// Keep splash screen visible while we initialize
SplashScreen.preventAutoHideAsync().catch(() => {});

// Suppress known harmless warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
      } catch (e) {
        console.error('DB init failed:', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const onLayoutReady = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider onLayout={onLayoutReady}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />
      <UpdateChecker>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </UpdateChecker>
    </SafeAreaProvider>
  );
}
