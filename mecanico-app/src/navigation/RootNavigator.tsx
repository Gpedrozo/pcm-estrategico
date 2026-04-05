// ============================================================
// Navigation v2.0 — Root stack + 5-tab Main navigator
// ============================================================

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import { useAuth } from '../contexts/AuthContext';

import DeviceBindingScreen from '../screens/DeviceBindingScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreenV2 from '../screens/HomeScreenV2';
import OSDetailScreenV2 from '../screens/OSDetailScreenV2';
import FecharOSScreen from '../screens/FecharOSScreen';
import CriarOSScreenV2 from '../screens/CriarOSScreenV2';
import CriarSolicitacaoScreen from '../screens/CriarSolicitacaoScreen';
import SolicitacoesListScreenV2 from '../screens/SolicitacoesListScreenV2';
import SolicitacaoDetalheScreen from '../screens/SolicitacaoDetalheScreen';
import HistoricoScreenV2 from '../screens/HistoricoScreenV2';
import AgendaScreen from '../screens/AgendaScreen';

import { COLORS, SIZES } from '../theme';
import type { RootStackParamList, MainTabParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    HomeTab: '🏠',
    SolicitacaoTab: '⚠️',
    NovaOSTab: '📋',
    HistoricoTab: '📊',
    AgendaTab: '📅',
  };
  return (
    <Text style={{ fontSize: focused ? 26 : 22, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '•'}
    </Text>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textHint,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
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
      <Tab.Screen name="HomeTab" component={HomeScreenV2} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="SolicitacaoTab" component={SolicitacoesListScreenV2} options={{ tabBarLabel: 'Solicitações' }} />
      <Tab.Screen name="NovaOSTab" component={CriarOSScreenV2} options={{ tabBarLabel: 'Nova OS' }} />
      <Tab.Screen name="HistoricoTab" component={HistoricoScreenV2} options={{ tabBarLabel: 'Histórico' }} />
      <Tab.Screen name="AgendaTab" component={AgendaScreen} options={{ tabBarLabel: 'Agenda' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isLoading, isDeviceBound, isLoggedIn } = useAuth();

  if (isLoading) {
    return (
      <View style={loadStyles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={loadStyles.text}>Iniciando...</Text>
      </View>
    );
  }

  if (!isDeviceBound) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="DeviceBinding" component={DeviceBindingScreen} />
      </Stack.Navigator>
    );
  }

  if (!isLoggedIn) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.headerBg },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: '700', fontSize: SIZES.fontMD },
        headerBackTitle: 'Voltar',
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="OSDetail" component={OSDetailScreenV2} options={{ title: 'Detalhes da O.S.' }} />
      <Stack.Screen name="FecharOS" component={FecharOSScreen} options={{ title: 'Fechar O.S.' }} />
      <Stack.Screen name="CriarOS" component={CriarOSScreenV2} options={{ title: 'Emitir O.S.' }} />
      <Stack.Screen name="CriarSolicitacao" component={CriarSolicitacaoScreen} options={{ title: 'Nova Solicitação' }} />
      <Stack.Screen name="SolicitacaoDetalhe" component={SolicitacaoDetalheScreen} options={{ title: 'Solicitação' }} />
    </Stack.Navigator>
  );
}

const loadStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  text: { marginTop: 12, fontSize: SIZES.fontMD, color: COLORS.textSecondary },
});