// ============================================================
// OSDetailScreen — Centro de comando da OS
// Botões: INICIAR / FINALIZAR / APONTAMENTO / PARADA / MATERIAL
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import uuid from 'react-native-uuid';
import { useAuth } from '../contexts/AuthContext';
import {
  getOrdemServicoById,
  getExecucoesByOS,
  getExecucaoEmAndamento,
  upsertExecucao,
  upsertOrdemServico,
  addToSyncQueue,
} from '../lib/database';
import { runSyncCycle } from '../lib/syncEngine';
import LoadingScreen from '../components/LoadingScreen';
import { COLORS, SIZES } from '../theme';
import type { OrdemServico, ExecucaoOS, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'OSDetail'>;

const PRIORIDADE_COLORS: Record<string, string> = {
  emergencial: '#B71C1C',
  alta: '#D32F2F',
  media: '#F57C00',
  baixa: '#2E7D32',
};

const STATUS_LABELS: Record<string, string> = {
  aberta: 'ABERTA',
  solicitada: 'SOLICITADA',
  emitida: 'EMITIDA',
  em_andamento: 'EM ANDAMENTO',
  em_execucao: 'EXECUTANDO',
  programada: 'PROGRAMADA',
  concluida: 'CONCLUÍDA',
  cancelada: 'CANCELADA',
  pausada: 'PAUSADA',
  aguardando_materiais: 'AGUARD. MATERIAL',
};

const STATUS_COLORS: Record<string, string> = {
  aberta: '#D32F2F',
  solicitada: '#F57C00',
  emitida: '#F57C00',
  em_andamento: '#1565C0',
  em_execucao: '#1565C0',
  programada: '#F57C00',
  concluida: '#2E7D32',
  cancelada: '#757575',
  pausada: '#F57C00',
  aguardando_materiais: '#F57C00',
};

export default function OSDetailScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId, mecanicoId, mecanicoNome } = useAuth();
  const { osId } = route.params;

  const [os, setOS] = useState<OrdemServico | null>(null);
  const [execucoes, setExecucoes] = useState<ExecucaoOS[]>([]);
  const [minhaExecAberta, setMinhaExecAberta] = useState<ExecucaoOS | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [osData, execData] = await Promise.all([
        getOrdemServicoById(osId),
        getExecucoesByOS(osId),
      ]);
      setOS(osData);
      setExecucoes(execData);

      // Verificar se EU tenho atividade em andamento nesta OS
      if (mecanicoId) {
        const emAndamento = execData.find(
          (e: any) => e.mecanico_id === mecanicoId && e.hora_inicio && !e.hora_fim
        );
        setMinhaExecAberta(emAndamento || null);
      }
    } finally {
      setLoading(false);
    }
  }, [osId, mecanicoId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await runSyncCycle(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  // ── INICIAR ATIVIDADE ──
  const handleIniciar = async () => {
    if (!empresaId || !mecanicoId) return;

    // Verificar se já tem atividade aberta em qualquer OS
    const emAndamento = await getExecucaoEmAndamento(mecanicoId);
    if (emAndamento && emAndamento.os_id !== osId) {
      Alert.alert(
        'Atividade em andamento',
        'Você já tem uma atividade aberta em outra OS. Deseja finalizar a anterior?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Finalizar anterior', onPress: () => navigation.navigate('Execution', { osId: emAndamento.os_id, execucaoId: emAndamento.id, mode: 'auto' }) },
        ]
      );
      return;
    }

    setActionLoading(true);
    try {
      const execId = uuid.v4() as string;
      const now = new Date().toISOString();

      const execucao = {
        id: execId,
        empresa_id: empresaId,
        os_id: osId,
        mecanico_id: mecanicoId,
        mecanico_nome: mecanicoNome,
        hora_inicio: now,
        hora_fim: null,
        tempo_execucao: null,
        servico_executado: null,
        causa: null,
        observacoes: null,
        data_execucao: now,
        custo_mao_obra: null,
        custo_materiais: null,
        custo_total: null,
        created_at: now,
        sync_status: 'pending',
      };

      await upsertExecucao(execucao);

      // Atualizar status da OS para em_andamento
      if (os && ['aberta', 'solicitada', 'emitida'].includes(os.status)) {
        const updated = { ...os, status: 'em_andamento', updated_at: now };
        await upsertOrdemServico(updated);
        await addToSyncQueue({
          id: uuid.v4() as string,
          table_name: 'ordens_servico',
          record_id: osId,
          operation: 'UPDATE',
          payload: { id: osId, status: 'em_andamento', updated_at: now },
        });
      }

      await addToSyncQueue({
        id: uuid.v4() as string,
        table_name: 'execucoes_os',
        record_id: execId,
        operation: 'INSERT',
        payload: execucao,
      });

      Alert.alert('✅ Atividade iniciada!', `Início registrado às ${formatTime(now)}`);
      await load();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Erro ao iniciar atividade');
    } finally {
      setActionLoading(false);
    }
  };

  // ── FINALIZAR ATIVIDADE → abre ExecutionScreen em modo auto ──
  const handleFinalizar = () => {
    if (minhaExecAberta) {
      navigation.navigate('Execution', { osId, execucaoId: minhaExecAberta.id, mode: 'auto' });
    }
  };

  if (loading) return <LoadingScreen message="Carregando OS..." />;
  if (!os) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>OS não encontrada</Text>
      </View>
    );
  }

  const prColor = PRIORIDADE_COLORS[os.prioridade] || COLORS.textSecondary;
  const stColor = STATUS_COLORS[os.status] || COLORS.textSecondary;
  const stLabel = STATUS_LABELS[os.status] || os.status?.toUpperCase();
  const canAct = ['aberta', 'solicitada', 'emitida', 'em_andamento', 'em_execucao'].includes(os.status);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Header card */}
        <View style={[styles.card, { borderLeftColor: prColor, borderLeftWidth: 5 }]}>
          <View style={styles.headerRow}>
            <Text style={styles.osNumber}>OS {os.numero_os}</Text>
            <View style={[styles.statusBadge, { backgroundColor: stColor }]}>
              <Text style={styles.statusBadgeText}>{stLabel}</Text>
            </View>
          </View>
          <Text style={styles.tipo}>{os.tipo?.toUpperCase()} — {os.prioridade?.toUpperCase()}</Text>
          {os.equipamento && <Text style={styles.equipamento}>🏭 {os.equipamento}</Text>}
        </View>

        {/* Problema */}
        {os.problema && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📝 Problema</Text>
            <Text style={styles.problemText}>{os.problema}</Text>
          </View>
        )}

        {/* ── BOTÕES DE AÇÃO ── */}
        {canAct && (
          <View style={styles.actionsCard}>
            {!minhaExecAberta ? (
              <TouchableOpacity
                style={[styles.bigButton, { backgroundColor: COLORS.success }]}
                onPress={handleIniciar}
                disabled={actionLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.bigButtonText}>
                  {actionLoading ? '⏳ Aguarde...' : '▶️  INICIAR ATIVIDADE'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.bigButton, { backgroundColor: COLORS.critical }]}
                onPress={handleFinalizar}
                activeOpacity={0.7}
              >
                <Text style={styles.bigButtonText}>✅  FINALIZAR ATIVIDADE</Text>
                <Text style={styles.bigButtonSub}>
                  Iniciado às {formatTime(minhaExecAberta.hora_inicio)}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Execution', { osId, mode: 'manual' })}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>➕</Text>
                <Text style={styles.actionLabel}>APONTAR{'\n'}MANUAL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Parada', { osId, equipamentoNome: os.equipamento })}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>⛔</Text>
                <Text style={styles.actionLabel}>REGISTRAR{'\n'}PARADA</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('RequisicaoMaterial', { osId })}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>🔩</Text>
                <Text style={styles.actionLabel}>SOLICITAR{'\n'}MATERIAL</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Info */}
        <View style={styles.card}>
          <InfoRow label="Solicitante" value={os.solicitante || '—'} />
          <InfoRow label="Data Solicitação" value={formatDate(os.data_solicitacao)} />
          {os.tempo_estimado != null && <InfoRow label="Tempo Estimado" value={`${os.tempo_estimado} min`} />}
        </View>

        {/* Apontamentos anteriores */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            📋 Apontamentos ({execucoes.length})
          </Text>
          {execucoes.length === 0 ? (
            <Text style={styles.emptyExec}>Nenhum apontamento registrado.</Text>
          ) : (
            execucoes.map((ex) => (
              <View key={ex.id} style={styles.execRow}>
                <View style={styles.execHeader}>
                  <Text style={styles.execMecanico}>👤 {ex.mecanico_nome || 'Mecânico'}</Text>
                  <Text style={styles.execTime}>
                    {formatTime(ex.hora_inicio)} → {ex.hora_fim ? formatTime(ex.hora_fim) : '⏳'}
                  </Text>
                </View>
                {ex.servico_executado && (
                  <Text style={styles.execServico} numberOfLines={2}>{ex.servico_executado}</Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Helpers ───

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch { return String(iso); }
}

function formatTime(iso?: string | null): string {
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch { return String(iso); }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  errorText: { fontSize: SIZES.fontLG, color: COLORS.textSecondary },
  scrollContent: { padding: SIZES.paddingMD, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  osNumber: { fontSize: SIZES.fontXL, fontWeight: '800', color: COLORS.textPrimary },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  tipo: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  equipamento: { fontSize: SIZES.fontMD, fontWeight: '600', color: COLORS.textPrimary, marginTop: 8 },
  sectionTitle: { fontSize: SIZES.fontMD, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  problemText: { fontSize: SIZES.fontSM, color: COLORS.textPrimary, lineHeight: 22 },
  actionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bigButton: {
    height: SIZES.buttonHeightLG,
    borderRadius: SIZES.radiusLG,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  bigButtonText: { fontSize: SIZES.fontLG, fontWeight: '800', color: '#FFF' },
  bigButtonSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionButton: {
    flex: 1,
    height: 80,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMD,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  actionIcon: { fontSize: 26, marginBottom: 4 },
  actionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  infoLabel: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: SIZES.fontSM, color: COLORS.textPrimary, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  emptyExec: { fontSize: SIZES.fontSM, color: COLORS.textHint, fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  execRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  execHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  execMecanico: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  execTime: { fontSize: 13, color: COLORS.textSecondary },
  execServico: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 20 },
});
