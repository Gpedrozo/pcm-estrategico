// ============================================================
// HomeScreen v2.0 — Lista de OS abertas (tela principal)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  TextInput, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../theme';
import type { OrdemServico, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_OPEN = ['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_MATERIAL'];
const PRIORIDADE_ORDER: Record<string, number> = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };
const PRIORIDADE_COLORS: Record<string, string> = {
  URGENTE: COLORS.prioridadeEmergencial,
  ALTA: COLORS.prioridadeAlta,
  MEDIA: COLORS.prioridadeMedia,
  BAIXA: COLORS.prioridadeBaixa,
};
const STATUS_COLORS: Record<string, string> = {
  ABERTA: COLORS.success,
  EM_ANDAMENTO: COLORS.primary,
  AGUARDANDO_MATERIAL: COLORS.warning,
};

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { empresaId, mecanicoId, mecanicoCodigo, mecanicoNome, logout } = useAuth();
  const [orders, setOrders] = useState<OrdemServico[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!empresaId) return;
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*')
      .eq('empresa_id', empresaId)
      .in('status', STATUS_OPEN)
      .order('data_solicitacao', { ascending: false })
      .limit(200);

    if (!error && data) {
      // Sort: prioridade asc, then date desc
      const sorted = [...data].sort((a, b) => {
        const pa = PRIORIDADE_ORDER[a.prioridade] ?? 9;
        const pb = PRIORIDADE_ORDER[b.prioridade] ?? 9;
        if (pa !== pb) return pa - pb;
        return new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime();
      });
      setOrders(sorted);
    }
  }, [empresaId]);

  useEffect(() => { fetchOrders().finally(() => setLoading(false)); }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const isMyOS = (os: OrdemServico) =>
    (mecanicoId && os.mecanico_responsavel_id === mecanicoId) ||
    (mecanicoCodigo && os.mecanico_responsavel_codigo === mecanicoCodigo);

  const filtered = orders.filter((os) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(os.numero_os).includes(q) ||
      (os.tag || '').toLowerCase().includes(q) ||
      (os.equipamento || '').toLowerCase().includes(q) ||
      (os.problema || '').toLowerCase().includes(q)
    );
  });

  const formatDate = (d: string) => {
    try {
      const dt = new Date(d);
      return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getFullYear()}`;
    } catch { return d; }
  };

  const renderOS = ({ item }: { item: OrdemServico }) => {
    const mine = isMyOS(item);
    return (
      <TouchableOpacity
        style={[styles.card, mine && styles.cardMine]}
        onPress={() => nav.navigate('OSDetail', { osId: item.id })}
        activeOpacity={0.7}
      >
        {mine && (
          <View style={styles.mineBadge}>
            <Text style={styles.mineBadgeText}>★ Designada para você</Text>
          </View>
        )}
        <View style={styles.cardHeader}>
          <Text style={styles.osNumber}>O.S. {String(item.numero_os).padStart(4, '0')}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || '#999' }]}>
            <Text style={styles.statusText}>{item.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={[styles.prioBadge, { backgroundColor: PRIORIDADE_COLORS[item.prioridade] || '#999' }]}>
            <Text style={styles.prioText}>{item.prioridade}</Text>
          </View>
          <Text style={styles.tipo}>{item.tipo}</Text>
        </View>

        <Text style={styles.tag}>{item.tag || 'Sem TAG'}</Text>
        <Text style={styles.equip} numberOfLines={1}>{item.equipamento}</Text>
        <Text style={styles.problema} numberOfLines={2}>{item.problema}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>Solicitante: {item.solicitante}</Text>
          <Text style={styles.footerText}>{formatDate(item.data_solicitacao)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>PCM Mecânico</Text>
          <Text style={styles.headerUser}>{mecanicoNome || 'Mecânico'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => Alert.alert('Logout', 'Deseja sair?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sair', onPress: logout },
          ])}
          style={styles.logoutBtn}
        >
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar OS, TAG, equipamento..."
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      {/* Counter */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          {filtered.length} ordem(ns) aberta(s)
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderOS}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>
              {loading ? 'Carregando...' : 'Nenhuma O.S. aberta'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.headerBg, paddingTop: 50, paddingBottom: 16,
    paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center',
  },
  headerTitle: { fontSize: SIZES.fontLG, fontWeight: '800', color: '#FFF' },
  headerUser: { fontSize: SIZES.fontSM, color: COLORS.primaryLight, marginTop: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: SIZES.radiusSM,
  },
  logoutText: { color: '#FFF', fontWeight: '600', fontSize: SIZES.fontSM },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.surface },
  searchInput: {
    height: 48, backgroundColor: COLORS.background, borderRadius: SIZES.radiusMD,
    paddingHorizontal: 16, fontSize: SIZES.fontSM, borderWidth: 1, borderColor: COLORS.border,
  },
  counterRow: { paddingHorizontal: 16, paddingVertical: 8 },
  counterText: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, fontWeight: '600' },
  list: { paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD, marginHorizontal: 16, marginVertical: 6,
    ...SHADOWS.small,
  },
  cardMine: { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  mineBadge: {
    backgroundColor: COLORS.infoBg, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8,
  },
  mineBadgeText: { color: COLORS.info, fontSize: 12, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  osNumber: { fontSize: SIZES.fontMD, fontWeight: '700', color: COLORS.textPrimary },
  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  prioBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  prioText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  tipo: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, fontWeight: '600' },
  tag: { fontSize: SIZES.fontSM, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  equip: { fontSize: SIZES.fontSM, color: COLORS.textPrimary, marginBottom: 4 },
  problema: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 12, color: COLORS.textHint },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: SIZES.fontMD, color: COLORS.textSecondary, marginTop: 12 },
});
