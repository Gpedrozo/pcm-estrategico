// ============================================================
// Navigation — Root stack + Main tab navigator
// ============================================================

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useAuth } from '../contexts/AuthContext';

import DeviceBindingScreen from '../screens/DeviceBindingScreen';
import HomeScreen from '../screens/HomeScreen';
import OSDetailScreen from '../screens/OSDetailScreen';
import ExecutionScreen from '../screens/ExecutionScreen';
import QRScanScreen from '../screens/QRScanScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LoadingScreen from '../components/LoadingScreen';

import { COLORS, SIZES } from '../theme';
import type { RootStackParamList, MainTabParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Tab icons (emoji-based for simplicity) ───
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    HomeTab: '🏠',
    QRTab: '📷',
    HistoryTab: '📜',
  };
  return (
    <Text style={{ fontSize: focused ? 28 : 24, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '•'}
    </Text>
  );
}

// ─── Main Tab Navigator ───
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textHint,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: COLORS.divider,
          backgroundColor: COLORS.surface,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: 'Ordens' }}
      />
      <Tab.Screen
        name="QRTab"
        component={QRScanScreen}
        options={{ tabBarLabel: 'QR Scan' }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{ tabBarLabel: 'Histórico' }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Stack Navigator ───
export default function RootNavigator() {
  const { isLoading, isDeviceBound, isAuthenticated, error, retry, logout } = useAuth();

  // Still loading initial check
  if (isLoading) {
    return <LoadingScreen message="Iniciando..." />;
  }

  // Not bound — show binding flow
  if (!isDeviceBound) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="DeviceBinding" component={DeviceBindingScreen} />
      </Stack.Navigator>
    );
  }

  // Bound but auth failed — show error with retry
  if (!isAuthenticated && error) {
    return (
      <View style={errStyles.container}>
        <Text style={errStyles.icon}>⚠️</Text>
        <Text style={errStyles.title}>Erro de autenticação</Text>
        <Text style={errStyles.message}>{error}</Text>
        <TouchableOpacity style={errStyles.retryBtn} onPress={retry} activeOpacity={0.7}>
          <Text style={errStyles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={errStyles.unbindBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={errStyles.unbindText}>Desvincular dispositivo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Bound, no error, but not yet authenticated (authenticateDevice running)
  if (!isAuthenticated) {
    return <LoadingScreen message="Autenticando..." />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.header },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: '700', fontSize: SIZES.fontMD },
        headerBackTitle: 'Voltar',
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OSDetail"
        component={OSDetailScreen}
        options={{ title: 'Detalhes da OS' }}
      />
      <Stack.Screen
        name="Execution"
        component={ExecutionScreen}
        options={{ title: 'Registrar Execução' }}
      />
    </Stack.Navigator>
  );
}

const errStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 32,
  },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: SIZES.fontXL, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  message: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  retryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  retryText: { fontSize: SIZES.fontLG, fontWeight: '700', color: '#FFF' },
  unbindBtn: {
    width: '100%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unbindText: { fontSize: SIZES.fontSM, fontWeight: '600', color: COLORS.error || '#D32F2F' },
});
