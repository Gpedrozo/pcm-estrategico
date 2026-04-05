// ============================================================
// HistoricoScreen v2.0 — Histórico de O.S. com filtros
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../theme';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import type { OrdemServico, ExecucaoOS } from '../types';

const STATUS_OPTIONS = ['TODAS', 'ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_MATERIAL', 'FECHADA', 'CANCELADA'] as const;
const TIPO_OPTIONS = ['TODOS', 'CORRETIVA', 'PREVENTIVA', 'PREDITIVA', 'INSPECAO', 'MELHORIA'] as const;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ABERTA: { bg: COLORS.warningBg, text: COLORS.warning },
  EM_ANDAMENTO: { bg: COLORS.infoBg, text: COLORS.info },
  AGUARDANDO_MATERIAL: { bg: '#FFF3E0', text: '#E65100' },
  FECHADA: { bg: COLORS.successBg, text: COLORS.success },
  CANCELADA: { bg: '#F5F5F5', text: COLORS.textHint },
};

const PRIO_COLORS: Record<string, string> = {
  URGENTE: COLORS.prioridadeEmergencial,
  ALTA: COLORS.prioridadeAlta,
  MEDIA: COLORS.prioridadeMedia,
  BAIXA: COLORS.prioridadeBaixa,
};

export default function HistoricoScreenV2() {
  const { empresaId } = useAuth();

  const [items, setItems] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODAS');
  const [tipoFilter, setTipoFilter] = useState('TODOS');

  // Detail modal
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);
  const [execucoes, setExecucoes] = useState<ExecucaoOS[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    if (!empresaId) return;
    let query = supabase
      .from('ordens_servico')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(300);

    if (statusFilter !== 'TODAS') query = query.eq('status', statusFilter);
    if (tipoFilter !== 'TODOS') query = query.eq('tipo', tipoFilter);

    const { data } = await query;
    setItems(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [empresaId, statusFilter, tipoFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Auto-refresh on realtime changes
  useRealtimeRefresh('HistoricoScreen', load);

  const filtered = items.filter((os) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(os.numero_os || '').includes(q) ||
      (os.tag || '').toLowerCase().includes(q) ||
      (os.equipamento || '').toLowerCase().includes(q) ||
      (os.problema || '').toLowerCase().includes(q) ||
      (os.solicitante || '').toLowerCase().includes(q)
    );
  });

  const openDetail = async (os: OrdemServico) => {
    setSelectedOS(os);
    setLoadingDetail(true);
    const { data } = await supabase
      .from('execucoes_os')
      .select('*')
      .eq('os_id', os.id)
      .order('created_at', { ascending: false });
    setExecucoes(data || []);
    setLoadingDetail(false);
  };

  const formatDate = (d?: string) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
  };

  const renderItem = ({ item }: { item: OrdemServico }) => {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.CANCELADA;
    const pc = PRIO_COLORS[item.prioridade] || COLORS.textHint;

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => openDetail(item)}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.cardNum}>#{String(item.numero_os).padStart(4, '0')}</Text>
            <View style={[styles.prioDot, { backgroundColor: pc }]} />
          </View>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>
        <Text style={styles.cardTag}>{item.tag} — {item.equipamento}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.problema}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>{item.tipo}</Text>
          <Text style={styles.footerText}>{formatDate(item.data_solicitacao)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nº, TAG, equipamento..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Status filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
      >
        {STATUS_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => { setStatusFilter(s); setLoading(true); }}
          >
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
              {s === 'TODAS' ? 'Todas' : s.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tipo filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterRow, { marginBottom: 4 }]}
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
      >
        {TIPO_OPTIONS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.filterChip, tipoFilter === t && styles.filterChipActive]}
            onPress={() => { setTipoFilter(t); setLoading(true); }}
          >
            <Text style={[styles.filterChipText, tipoFilter === t && styles.filterChipTextActive]}>
              {t === 'TODOS' ? 'Todos' : t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Count */}
      <Text style={styles.countText}>{filtered.length} registro(s)</Text>

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
              <Text style={styles.emptyText}>Nenhuma O.S. encontrada</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />
          }
        />
      )}

      {/* Detail Modal */}
      <Modal animationType="slide" visible={!!selectedOS} onRequestClose={() => setSelectedOS(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              O.S. #{String(selectedOS?.numero_os || 0).padStart(4, '0')}
            </Text>
            <TouchableOpacity onPress={() => setSelectedOS(null)}>
              <Text style={{ fontSize: 20, color: COLORS.textSecondary }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {selectedOS && (
              <>
                <View style={styles.detailCard}>
                  <InfoRow label="TAG" value={selectedOS.tag} />
                  <InfoRow label="Equipamento" value={selectedOS.equipamento} />
                  <InfoRow label="Tipo" value={selectedOS.tipo} />
                  <InfoRow label="Prioridade" value={selectedOS.prioridade} />
                  <InfoRow label="Status" value={selectedOS.status} />
                  <InfoRow label="Solicitante" value={selectedOS.solicitante || '-'} />
                  <InfoRow label="Data Abertura" value={formatDate(selectedOS.data_solicitacao)} />
                  {selectedOS.data_fechamento && (
                    <InfoRow label="Data Fechamento" value={formatDate(selectedOS.data_fechamento)} />
                  )}
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.sectionTitle}>Problema</Text>
                  <Text style={styles.descText}>{selectedOS.problema}</Text>
                </View>

                {/* Execuções */}
                {loadingDetail ? (
                  <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
                ) : execucoes.length > 0 ? (
                  <View style={styles.detailCard}>
                    <Text style={styles.sectionTitle}>Execuções ({execucoes.length})</Text>
                    {execucoes.map((ex, i) => (
                      <View key={ex.id || i} style={styles.execItem}>
                        <InfoRow label="Mecânico" value={ex.mecanico_nome || '-'} />
                        <InfoRow label="Período" value={`${ex.data_inicio || ''} ${ex.hora_inicio || ''} → ${ex.data_fim || ''} ${ex.hora_fim || ''}`} />
                        {ex.tempo_execucao_liquido != null && (
                          <InfoRow label="Tempo Líquido" value={`${ex.tempo_execucao_liquido} min`} />
                        )}
                        {ex.custo_total != null && (
                          <InfoRow label="Custo Total" value={`R$ ${ex.custo_total.toFixed(2)}`} />
                        )}
                        {ex.servico_executado && (
                          <>
                            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Serviço</Text>
                            <Text style={styles.descText}>{ex.servico_executado}</Text>
                          </>
                        )}
                        {i < execucoes.length - 1 && <View style={styles.execDivider} />}
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={3}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBox: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchInput: { height: 46, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radiusSM, paddingHorizontal: 14, fontSize: SIZES.fontSM, backgroundColor: COLORS.surface },
  filterRow: { height: 44, flexGrow: 0, flexShrink: 0, marginTop: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8, backgroundColor: COLORS.surface, minHeight: 36, justifyContent: 'center' },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: '#FFF', fontWeight: '700' },
  countText: { paddingHorizontal: 16, paddingVertical: 4, fontSize: 12, color: COLORS.textHint },
  card: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD, padding: SIZES.paddingMD, marginBottom: 10, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardNum: { fontSize: SIZES.fontSM, fontWeight: '800', color: COLORS.primary },
  prioDot: { width: 10, height: 10, borderRadius: 5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardTag: { fontSize: SIZES.fontSM, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 12, color: COLORS.textHint },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: SIZES.fontSM, color: COLORS.textHint },
  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background, paddingTop: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalTitle: { fontSize: SIZES.fontLG, fontWeight: '800', color: COLORS.textPrimary },
  detailCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD, padding: SIZES.paddingMD, marginBottom: 12, ...SHADOWS.small },
  sectionTitle: { fontSize: SIZES.fontSM, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  descText: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, lineHeight: 22 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: COLORS.divider },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', flex: 1 },
  infoValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '700', flex: 1.2, textAlign: 'right' },
  execItem: { marginBottom: 8 },
  execDivider: { height: 1, backgroundColor: COLORS.divider, marginVertical: 12 },
});
