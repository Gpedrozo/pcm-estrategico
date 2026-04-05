// ============================================================
// OSListScreen — Lista de Ordens de Serviço com filtros
// Filtro por status e por equipamento
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { getOrdensServico, getOSStats } from '../lib/database';
import { runSyncCycle, onSyncComplete } from '../lib/syncEngine';
import OSCard from '../components/OSCard';
import EmptyState from '../components/EmptyState';
import { COLORS, SIZES } from '../theme';
import type { OrdemServico, RootStackParamList } from '../types';

const FILTROS_STATUS = [
  { key: 'todas', label: 'Todas' },
  { key: 'aberta', label: 'Abertas' },
  { key: 'em_andamento', label: 'Executando' },
  { key: 'programada', label: 'Programadas' },
  { key: 'concluida', label: 'Concluídas' },
  { key: 'cancelada', label: 'Canceladas' },
];

export default function OSListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId } = useAuth();

  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [filtroStatus, setFiltroStatus] = useState('todas');
  const [busca, setBusca] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ abertas: 0, programadas: 0, emAndamento: 0, finalizadasHoje: 0 });

  const loadData = useCallback(async () => {
    if (!empresaId) return;
    try {
      const [os, st] = await Promise.all([
        getOrdensServico(empresaId, filtroStatus === 'todas' ? undefined : filtroStatus),
        getOSStats(empresaId),
      ]);
      setOrdens(os);
      setStats(st);
    } catch { /* ignore */ }
  }, [empresaId, filtroStatus]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  // Reload when background sync completes
  useEffect(() => {
    const unsub = onSyncComplete(() => { loadData(); });
    return unsub;
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await runSyncCycle(true);
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const filtradas = busca.trim()
    ? ordens.filter((o) => {
        const term = busca.toLowerCase();
        return (
          o.equipamento?.toLowerCase().includes(term) ||
          o.tag?.toLowerCase().includes(term) ||
          o.problema?.toLowerCase().includes(term) ||
          String(o.numero_os).includes(term)
        );
      })
    : ordens;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 ORDENS DE SERVIÇO</Text>
        <Text style={styles.headerSub}>
          {stats.abertas} abertas · {stats.emAndamento} executando · {stats.programadas} programadas
        </Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar por equipamento, TAG, OS..."
          placeholderTextColor={COLORS.textHint}
          value={busca}
          onChangeText={setBusca}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        horizontal
        data={FILTROS_STATUS}
        keyExtractor={(i) => i.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filtroBtn, filtroStatus === item.key && styles.filtroBtnActive]}
            onPress={() => setFiltroStatus(item.key)}
          >
            <Text style={[styles.filtroText, filtroStatus === item.key && styles.filtroTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtrosRow}
      />

      <TouchableOpacity
        style={styles.criarBtn}
        onPress={() => navigation.navigate('CriarOS')}
        activeOpacity={0.7}
      >
        <Text style={styles.criarBtnText}>➕  ABRIR NOVA O.S.</Text>
      </TouchableOpacity>

      <FlatList
        data={filtradas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OSCard
            os={item}
            onPress={() => navigation.navigate('OSDetail', { osId: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="Nenhuma OS encontrada"
            subtitle={busca ? 'Tente outro termo de busca' : 'Puxe para baixo para atualizar'}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.headerBg, paddingTop: 50, paddingBottom: 12, paddingHorizontal: SIZES.paddingLG },
  headerTitle: { fontSize: SIZES.fontLG, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: SIZES.fontSM, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  searchRow: { paddingHorizontal: SIZES.paddingMD, paddingTop: SIZES.paddingMD },
  searchInput: {
    height: SIZES.inputHeight, backgroundColor: COLORS.surface, borderRadius: SIZES.radiusSM,
    paddingHorizontal: 16, fontSize: SIZES.fontMD, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border,
  },
  filtrosRow: { paddingHorizontal: SIZES.paddingMD, paddingVertical: 12, gap: 8 },
  filtroBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  filtroBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroText: { fontSize: SIZES.fontSM, fontWeight: '600', color: COLORS.textSecondary },
  filtroTextActive: { color: '#FFF' },
  criarBtn: {
    marginHorizontal: SIZES.paddingMD, marginBottom: 12, height: 52,
    borderRadius: SIZES.radiusMD, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center',
  },
  criarBtnText: { fontSize: SIZES.fontMD, fontWeight: '800', color: '#FFF' },
  listContent: { paddingBottom: 100 },
});