// ============================================================
// SolicitacoesListScreen — Lista de Solicitações de Manutenção
// Mecânico pode ver, aceitar ou recusar solicitações
// Usa tabela solicitacoes_manutencao do sistema web
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import uuid from 'react-native-uuid';
import { useAuth } from '../contexts/AuthContext';
import { getSolicitacoes, upsertSolicitacao, addToSyncQueue, getSolicitacoesStats } from '../lib/database';
import { runSyncCycle, isOnline } from '../lib/syncEngine';
import EmptyState from '../components/EmptyState';
import { COLORS, SIZES } from '../theme';
import type { RootStackParamList, SolicitacaoManutencao } from '../types';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  PENDENTE: { label: 'PENDENTE', color: '#F59E0B', icon: '⏳' },
  APROVADA: { label: 'APROVADA', color: '#0EA5E9', icon: '✅' },
  CONVERTIDA: { label: 'CONVERTIDA EM OS', color: '#10B981', icon: '📋' },
  REJEITADA: { label: 'REJEITADA', color: '#EF4444', icon: '❌' },
  CANCELADA: { label: 'CANCELADA', color: '#6B7280', icon: '🚫' },
};

const IMPACTO_CONFIG: Record<string, { label: string; color: string }> = {
  ALTO: { label: 'ALTO', color: '#EF4444' },
  MEDIO: { label: 'MÉDIO', color: '#F59E0B' },
  BAIXO: { label: 'BAIXO', color: '#10B981' },
};

const CLASSIF_CONFIG: Record<string, { label: string; color: string }> = {
  EMERGENCIAL: { label: '🚨 EMERGENCIAL', color: '#EF4444' },
  URGENTE: { label: '⚡ URGENTE', color: '#F59E0B' },
  PROGRAMAVEL: { label: '📅 PROGRAMÁVEL', color: '#10B981' },
};

const FILTROS = ['todas', 'PENDENTE', 'APROVADA', 'CONVERTIDA', 'REJEITADA'];

export default function SolicitacoesListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId, mecanicoNome, mecanicoId } = useAuth();

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoManutencao[]>([]);
  const [filtro, setFiltro] = useState('todas');
  const [stats, setStats] = useState({ pendentes: 0, aprovadas: 0, total: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [initialSyncDone, setInitialSyncDone] = useState(false);

  const loadData = useCallback(async () => {
    if (!empresaId) return;
    try {
      const [list, st] = await Promise.all([
        getSolicitacoes(empresaId, filtro === 'todas' ? undefined : filtro),
        getSolicitacoesStats(empresaId),
      ]);
      setSolicitacoes(list);
      setStats(st);

      if (list.length === 0 && !initialSyncDone) {
        const online = await isOnline();
        if (online) {
          setInitialSyncDone(true);
          await runSyncCycle(true);
          const [list2, st2] = await Promise.all([
            getSolicitacoes(empresaId, filtro === 'todas' ? undefined : filtro),
            getSolicitacoesStats(empresaId),
          ]);
          setSolicitacoes(list2);
          setStats(st2);
        }
      }
    } catch { /* ignore */ }
  }, [empresaId, filtro, initialSyncDone]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await runSyncCycle(true);
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAceitar = async (solic: SolicitacaoManutencao) => {
    Alert.alert(
      'Aceitar Solicitação?',
      `Deseja aprovar a solicitação #${solic.numero_solicitacao || ''}?\n\n${solic.descricao_falha}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprovar',
          onPress: async () => {
            const now = new Date().toISOString();
            const updated: SolicitacaoManutencao = {
              ...solic,
              status: 'APROVADA',
              usuario_aprovacao: mecanicoId,
              data_aprovacao: now,
              updated_at: now,
              sync_status: 'pending',
            };
            await upsertSolicitacao(updated);
            await addToSyncQueue({
              id: uuid.v4() as string,
              table_name: 'solicitacoes_manutencao',
              record_id: solic.id,
              operation: 'UPDATE',
              payload: updated,
            });
            Alert.alert('✅ Solicitação aprovada!');
            loadData();
          },
        },
      ]
    );
  };

  const handleRejeitar = async (solic: SolicitacaoManutencao) => {
    setRejectingId(solic.id);
    setMotivoRejeicao('');
  };

  const confirmRejeitar = async (solic: SolicitacaoManutencao) => {
    if (!motivoRejeicao.trim()) {
      Alert.alert('Obrigatório', 'Informe o motivo da rejeição.');
      return;
    }
    const now = new Date().toISOString();
    const updated: SolicitacaoManutencao = {
      ...solic,
      status: 'REJEITADA',
      observacoes: motivoRejeicao.trim(),
      usuario_aprovacao: mecanicoId,
      data_aprovacao: now,
      updated_at: now,
      sync_status: 'pending',
    };
    await upsertSolicitacao(updated);
    await addToSyncQueue({
      id: uuid.v4() as string,
      table_name: 'solicitacoes_manutencao',
      record_id: solic.id,
      operation: 'UPDATE',
      payload: updated,
    });
    setRejectingId(null);
    Alert.alert('❌ Solicitação rejeitada.');
    loadData();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return ''; }
  };

  const renderItem = ({ item }: { item: SolicitacaoManutencao }) => {
    const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDENTE;
    const imp = IMPACTO_CONFIG[item.impacto] || IMPACTO_CONFIG.MEDIO;
    const cls = CLASSIF_CONFIG[item.classificacao] || CLASSIF_CONFIG.PROGRAMAVEL;
    const isPendente = item.status === 'PENDENTE';
    const isRejecting = rejectingId === item.id;

    return (
      <View style={[styles.card, { borderLeftColor: st.color }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardNumber}>
              {st.icon} {item.numero_solicitacao ? `#${item.numero_solicitacao}` : 'Nova'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
              <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>
          <View style={[styles.impactBadge, { backgroundColor: imp.color + '20' }]}>
            <Text style={[styles.impactText, { color: imp.color }]}>{imp.label}</Text>
          </View>
        </View>

        <Text style={styles.cardTag}>🔧 {item.tag || 'Sem tag'}</Text>
        <Text style={styles.cardDesc} numberOfLines={3}>{item.descricao_falha}</Text>

        <View style={styles.cardMeta}>
          <Text style={[styles.classifLabel, { color: cls.color }]}>{cls.label}</Text>
          <Text style={styles.metaText}>👤 {item.solicitante_nome}</Text>
          <Text style={styles.metaDate}>{formatDate(item.created_at)}</Text>
        </View>

        {item.status === 'REJEITADA' && item.observacoes && (
          <View style={styles.rejectReason}>
            <Text style={styles.rejectReasonText}>Motivo: {item.observacoes}</Text>
          </View>
        )}

        {item.status === 'CONVERTIDA' && item.os_id && (
          <TouchableOpacity
            style={styles.osLink}
            onPress={() => navigation.navigate('OSDetail', { osId: item.os_id })}
          >
            <Text style={styles.osLinkText}>📋 Ver Ordem de Serviço →</Text>
          </TouchableOpacity>
        )}

        {isPendente && !isRejecting && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleAceitar(item)} activeOpacity={0.7}>
              <Text style={styles.approveBtnText}>✅ ACEITAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleRejeitar(item)} activeOpacity={0.7}>
              <Text style={styles.rejectBtnText}>❌ RECUSAR</Text>
            </TouchableOpacity>
          </View>
        )}

        {isRejecting && (
          <View style={styles.rejectForm}>
            <TextInput
              style={styles.rejectInput}
              placeholder="Motivo da rejeição..."
              value={motivoRejeicao}
              onChangeText={setMotivoRejeicao}
              multiline
              numberOfLines={2}
              placeholderTextColor={COLORS.textHint}
            />
            <View style={styles.rejectFormBtns}>
              <TouchableOpacity style={styles.rejectConfirmBtn} onPress={() => confirmRejeitar(item)}>
                <Text style={styles.rejectConfirmText}>Confirmar Rejeição</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectCancelBtn} onPress={() => setRejectingId(null)}>
                <Text style={styles.rejectCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>⚠️ SOLICITAÇÕES</Text>
        <Text style={styles.headerSub}>
          {stats.pendentes} pendentes · {stats.aprovadas} aprovadas · {stats.total} total
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.pendentes}</Text>
          <Text style={styles.statLabel}>PENDENTES</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#0EA5E9' }]}>
          <Text style={[styles.statNumber, { color: '#0EA5E9' }]}>{stats.aprovadas}</Text>
          <Text style={styles.statLabel}>APROVADAS</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#6B7280' }]}>
          <Text style={[styles.statNumber, { color: '#6B7280' }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>TOTAL</Text>
        </View>
      </View>

      <View style={styles.filtroRow}>
        {FILTROS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filtroBtn, filtro === f && styles.filtroBtnActive]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[styles.filtroText, filtro === f && styles.filtroTextActive]}>
              {f === 'todas' ? 'Todas' : f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.newBtn}
        onPress={() => navigation.navigate('SolicitarServico', {})}
        activeOpacity={0.7}
      >
        <Text style={styles.newBtnText}>➕ NOVA SOLICITAÇÃO</Text>
      </TouchableOpacity>

      <FlatList
        data={solicitacoes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="Nenhuma solicitação"
            subtitle="Não há solicitações de manutenção. Crie uma nova!"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerBar: { backgroundColor: COLORS.headerBg, paddingTop: 50, paddingBottom: 12, paddingHorizontal: SIZES.paddingLG },
  headerTitle: { fontSize: SIZES.fontLG, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: SIZES.fontSM, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: SIZES.paddingMD, paddingTop: SIZES.paddingMD, gap: 8 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD,
    paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', borderLeftWidth: 4, elevation: 1,
  },
  statNumber: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, marginTop: 2 },
  filtroRow: { flexDirection: 'row', paddingHorizontal: SIZES.paddingMD, paddingTop: 12, gap: 6, flexWrap: 'wrap' },
  filtroBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  filtroBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filtroTextActive: { color: '#FFF' },
  newBtn: {
    marginHorizontal: SIZES.paddingMD, marginTop: 12, height: 48,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusMD, justifyContent: 'center', alignItems: 'center',
  },
  newBtnText: { fontSize: SIZES.fontMD, fontWeight: '800', color: '#FFF' },
  listContent: { paddingBottom: 100, paddingTop: 12 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD, padding: SIZES.cardPadding,
    marginHorizontal: SIZES.paddingMD, marginBottom: 12, borderLeftWidth: 4, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardNumber: { fontSize: SIZES.fontLG, fontWeight: '800', color: COLORS.textPrimary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  impactBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  impactText: { fontSize: 11, fontWeight: '700' },
  cardTag: { fontSize: SIZES.fontMD, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  cardDesc: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 },
  classifLabel: { fontSize: 11, fontWeight: '700' },
  metaText: { fontSize: 12, color: COLORS.textSecondary },
  metaDate: { fontSize: 12, color: COLORS.textHint },
  rejectReason: { backgroundColor: '#FEE2E2', borderRadius: SIZES.radiusSM, padding: 10, marginBottom: 8 },
  rejectReasonText: { fontSize: 13, color: '#991B1B' },
  osLink: { backgroundColor: '#D1FAE5', borderRadius: SIZES.radiusSM, padding: 10, marginBottom: 8 },
  osLinkText: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, height: 44, borderRadius: SIZES.radiusSM, justifyContent: 'center', alignItems: 'center' },
  approveBtn: { backgroundColor: '#10B981' },
  approveBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  rejectBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444' },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  rejectForm: { marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 10 },
  rejectInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radiusSM,
    padding: 10, fontSize: 14, color: COLORS.textPrimary, minHeight: 60, textAlignVertical: 'top',
  },
  rejectFormBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  rejectConfirmBtn: {
    flex: 1, height: 40, backgroundColor: '#EF4444', borderRadius: SIZES.radiusSM, justifyContent: 'center', alignItems: 'center',
  },
  rejectConfirmText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  rejectCancelBtn: {
    flex: 1, height: 40, backgroundColor: COLORS.surface, borderRadius: SIZES.radiusSM,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  rejectCancelText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
});