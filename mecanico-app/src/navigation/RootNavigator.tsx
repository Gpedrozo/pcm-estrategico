// ============================================================
// Navigation — Root stack + Main tab navigator
// ============================================================

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

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
  const { isLoading, isDeviceBound } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Iniciando..." />;
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
      {!isDeviceBound ? (
        // Not bound — show binding screen
        <Stack.Screen
          name="DeviceBinding"
          component={DeviceBindingScreen}
          options={{ headerShown: false }}
        />
      ) : (
        // Bound & authenticated — show main app
        <>
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
        </>
      )}
    </Stack.Navigator>
  );
}
