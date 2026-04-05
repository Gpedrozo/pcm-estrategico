// ============================================================
// Navigation — Root stack + Main tab navigator
// ============================================================

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useAuth } from '../contexts/AuthContext';

import DeviceBindingScreen from '../screens/DeviceBindingScreen';
import MecanicoSelectScreen from '../screens/MecanicoSelectScreen';
import HomeScreen from '../screens/HomeScreen';
import OSListScreen from '../screens/OSListScreen';
import OSDetailScreen from '../screens/OSDetailScreen';
import CriarOSScreen from '../screens/CriarOSScreen';
import ExecutionScreen from '../screens/ExecutionScreen';
import ParadaScreen from '../screens/ParadaScreen';
import SolicitarServicoScreen from '../screens/SolicitarServicoScreen';
import SolicitacoesListScreen from '../screens/SolicitacoesListScreen';
import EquipamentoDetalheScreen from '../screens/EquipamentoDetalheScreen';
import RequisicaoMaterialScreen from '../screens/RequisicaoMaterialScreen';
import ChecklistScreen from '../screens/ChecklistScreen';
import CatalogoScreen from '../screens/CatalogoScreen';
import QRScanScreen from '../screens/QRScanScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LoadingScreen from '../components/LoadingScreen';

import { COLORS, SIZES } from '../theme';
import type { RootStackParamList, MainTabParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    HomeTab: '\uD83C\uDFE0',
    OrdensTab: '\uD83D\uDCCB',
    SolicitacoesTab: '\u26A0\uFE0F',
    MaisTab: '\u2699\uFE0F',
  };
  return (
    <Text style={{ fontSize: focused ? 28 : 24, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '\u2022'}
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
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: 'In\u00EDcio' }} />
      <Tab.Screen name="OrdensTab" component={OSListScreen} options={{ tabBarLabel: 'Ordens' }} />
      <Tab.Screen name="SolicitacoesTab" component={SolicitacoesListScreen} options={{ tabBarLabel: 'Solicita\u00E7\u00F5es' }} />
      <Tab.Screen name="MaisTab" component={HistoryScreen} options={{ tabBarLabel: 'Hist\u00F3rico' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isLoading, isDeviceBound, isAuthenticated, mecanicoSelected, error, authExhausted, retry, logout } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Iniciando..." />;
  }

  if (!isDeviceBound) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="DeviceBinding" component={DeviceBindingScreen} />
      </Stack.Navigator>
    );
  }

  if (!isAuthenticated && (error || authExhausted)) {
    return (
      <View style={errStyles.container}>
        <Text style={errStyles.icon}>{'\u26A0\uFE0F'}</Text>
        <Text style={errStyles.title}>Erro de autentica\u00E7\u00E3o</Text>
        <Text style={errStyles.message}>{error || 'N\u00E3o foi poss\u00EDvel autenticar. Verifique sua conex\u00E3o.'}</Text>
        <TouchableOpacity style={errStyles.retryBtn} onPress={retry} activeOpacity={0.7}>
          <Text style={errStyles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={errStyles.unbindBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={errStyles.unbindText}>Desvincular dispositivo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoadingScreen message="Autenticando..." />;
  }

  if (!mecanicoSelected) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MecanicoSelect" component={MecanicoSelectScreen} />
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
      <Stack.Screen name="OSDetail" component={OSDetailScreen} options={{ title: 'Detalhes da OS' }} />
      <Stack.Screen name="CriarOS" component={CriarOSScreen} options={{ title: 'Abrir OS' }} />
      <Stack.Screen name="Execution" component={ExecutionScreen} options={({ route }) => ({ title: (route.params as any)?.mode === 'auto' ? 'Finalizar Atividade' : 'Apontamento Manual' })} />
      <Stack.Screen name="Parada" component={ParadaScreen} options={{ title: 'Registrar Parada' }} />
      <Stack.Screen name="SolicitarServico" component={SolicitarServicoScreen} options={{ title: 'Solicitar Servi\u00E7o' }} />
      <Stack.Screen name="SolicitacoesList" component={SolicitacoesListScreen} options={{ title: 'Solicita\u00E7\u00F5es' }} />
      <Stack.Screen name="EquipamentoDetalhe" component={EquipamentoDetalheScreen} options={{ title: 'Equipamento' }} />
      <Stack.Screen name="RequisicaoMaterial" component={RequisicaoMaterialScreen} options={{ title: 'Solicitar Material' }} />
      <Stack.Screen name="Checklist" component={ChecklistScreen} options={{ title: 'Checklist' }} />
      <Stack.Screen name="Catalogo" component={CatalogoScreen} options={{ title: 'Cat\u00E1logos T\u00E9cnicos' }} />
    </Stack.Navigator>
  );
}

const errStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 32 },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: SIZES.fontXL, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  message: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  retryBtn: { width: '100%', height: 52, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  retryText: { fontSize: SIZES.fontLG, fontWeight: '700', color: '#FFF' },
  unbindBtn: { width: '100%', height: 44, justifyContent: 'center', alignItems: 'center' },
  unbindText: { fontSize: SIZES.fontSM, fontWeight: '600', color: COLORS.error || '#D32F2F' },
});