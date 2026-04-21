// ============================================================
// App.tsx v2.0 — Entry point for PCM Mecânico
// Simplified: no SQLite, no UpdateChecker, no edge functions
// ============================================================

import React, { useCallback } from 'react';
import { StatusBar, LogBox, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { COLORS } from './src/theme';
import { hasSupabaseConfig } from './src/lib/supabase';

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

  if (!hasSupabaseConfig) {
    return (
      <SafeAreaProvider>
        <View style={styles.configErrorContainer} onLayout={onLayoutReady}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />
          <Text style={styles.configErrorTitle}>Configuração inválida do aplicativo</Text>
          <Text style={styles.configErrorText}>
            EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY não foram incluídas no build.
          </Text>
          <Text style={styles.configErrorText}>
            Gere um novo APK com as variáveis de ambiente configuradas no EAS.
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

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

const styles = StyleSheet.create({
  configErrorContainer: {
    flex: 1,
    backgroundColor: '#0B1020',
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 12,
  },
  configErrorTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  configErrorText: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
  },
});
