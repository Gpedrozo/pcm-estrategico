// ============================================================
// SolicitacoesListScreen v2.0 — Lista de solicitações + ações
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../theme';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import type { SolicitacaoManutencao, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CHIPS = ['TODAS', 'PENDENTE', 'APROVADA', 'CONVERTIDA', 'REJEITADA'] as const;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDENTE: { bg: COLORS.warningBg, text: COLORS.warning },
  APROVADA: { bg: COLORS.successBg, text: COLORS.success },
  CONVERTIDA: { bg: COLORS.infoBg, text: COLORS.info },
  REJEITADA: { bg: COLORS.criticalBg, text: COLORS.critical },
  CANCELADA: { bg: '#F5F5F5', text: COLORS.textHint },
};

const CLASSIFICACAO_LABEL: Record<string, string> = {
  EMERGENCIAL: '🔴 Emergencial',
  URGENTE: '🟠 Urgente',
  PROGRAMAVEL: '🟢 Programável',
};

export default function SolicitacoesListScreenV2() {
  const nav = useNavigation<Nav>();
  const { empresaId } = useAuth();

  const [items, setItems] = useState<SolicitacaoManutencao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODAS');

  const load = useCallback(async () => {
    if (!empresaId) return;
    let query = supabase
      .from('solicitacoes_manutencao')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (statusFilter !== 'TODAS') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    setItems(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [empresaId, statusFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Auto-refresh on realtime changes
  useRealtimeRefresh('SolicitacoesScreen', load);

  const filtered = items.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.tag || '').toLowerCase().includes(q) ||
      (s.solicitante_nome || '').toLowerCase().includes(q) ||
      (s.descricao_falha || '').toLowerCase().includes(q) ||
      String(s.numero_solicitacao || '').includes(q)
    );
  });

  const formatDate = (d?: string) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
  };

  const renderItem = ({ item }: { item: SolicitacaoManutencao }) => {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.CANCELADA;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => nav.navigate('SolicitacaoDetalhe', { solicitacao: item })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardNum}>#{String(item.numero_solicitacao || 0).padStart(4, '0')}</Text>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.cardTag}>{item.tag}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.descricao_falha}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>{CLASSIFICACAO_LABEL[item.classificacao] || item.classificacao}</Text>
          <Text style={styles.footerText}>{formatDate(item.created_at)}</Text>
        </View>

        {item.data_limite && (
          <Text style={[styles.footerText, { marginTop: 4 }]}>
            Prazo SLA: {new Date(item.data_limite).toLocaleString('pt-BR')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar solicitação..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Status filter */}
      <FlatList
        horizontal
        data={STATUS_CHIPS}
        style={styles.filterRow}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        keyExtractor={(i) => i}
        renderItem={({ item: s }) => (
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => { setStatusFilter(s); setLoading(true); }}
          >
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
              {s === 'TODAS' ? 'Todas' : s}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* List */}
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma solicitação encontrada</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => nav.navigate('CriarSolicitacao')} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBox: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchInput: { height: 46, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radiusSM, paddingHorizontal: 14, fontSize: SIZES.fontSM, backgroundColor: COLORS.surface },
  filterRow: { maxHeight: 48, marginBottom: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8, backgroundColor: COLORS.surface },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: '#FFF', fontWeight: '700' },
  card: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD, padding: SIZES.paddingMD, marginBottom: 10, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardNum: { fontSize: SIZES.fontSM, fontWeight: '800', color: COLORS.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  cardTag: { fontSize: SIZES.fontSM, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 12, color: COLORS.textHint },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: SIZES.fontSM, color: COLORS.textHint },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
  fabText: { color: '#FFF', fontSize: 28, fontWeight: '300', marginTop: -2 },
});
