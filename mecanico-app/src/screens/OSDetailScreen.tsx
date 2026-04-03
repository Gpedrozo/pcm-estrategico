// ============================================================
// OSDetailScreen — Full OS info, execution history, action button
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { getOrdemServicoById, getExecucoesByOS } from '../lib/database';
import LoadingScreen from '../components/LoadingScreen';
import { COLORS, SIZES, prioridadeColor, statusLabel, statusColor } from '../theme';
import type { OrdemServico, ExecucaoOS, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'OSDetail'>;

export default function OSDetailScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { osId } = route.params;

  const [os, setOS] = useState<OrdemServico | null>(null);
  const [execucoes, setExecucoes] = useState<ExecucaoOS[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [osData, execData] = await Promise.all([
        getOrdemServicoById(osId),
        getExecucoesByOS(osId),
      ]);
      setOS(osData);
      setExecucoes(execData);
    } finally {
      setLoading(false);
    }
  }, [osId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <LoadingScreen message="Carregando OS..." />;
  if (!os) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>OS não encontrada</Text>
      </View>
    );
  }

  const canExecute = os.status === 'aberta' || os.status === 'em_andamento';
  const prColor = prioridadeColor(os.prioridade);
  const stColor = statusColor(os.status);
  const stLabel = statusLabel(os.status);

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
          <Text style={styles.tipo}>{os.tipo?.toUpperCase()}</Text>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <InfoRow label="Equipamento" value={os.equipamento || '—'} />
          <InfoRow label="Prioridade" value={os.prioridade?.toUpperCase()} color={prColor} />
          <InfoRow label="Solicitante" value={os.solicitante || '—'} />
          <InfoRow label="Data Solicitação" value={formatDate(os.data_solicitacao)} />
          {os.data_fechamento && <InfoRow label="Data Fechamento" value={formatDate(os.data_fechamento)} />}
          {os.tempo_estimado != null && <InfoRow label="Tempo Estimado" value={`${os.tempo_estimado} min`} />}
        </View>

        {/* Problem */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Problema / Descrição</Text>
          <Text style={styles.problemText}>{os.problema || 'Nenhuma descrição informada.'}</Text>
        </View>

        {/* Execution history */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Execuções ({execucoes.length})
          </Text>
          {execucoes.length === 0 ? (
            <Text style={styles.emptyExec}>Nenhuma execução registrada.</Text>
          ) : (
            execucoes.map((ex) => (
              <View key={ex.id} style={styles.execRow}>
                <View style={styles.execHeader}>
                  <Text style={styles.execMecanico}>{ex.mecanico_nome || 'Mecânico'}</Text>
                  <Text style={styles.execDate}>{formatDate(ex.data_execucao)}</Text>
                </View>
                <Text style={styles.execServico} numberOfLines={2}>
                  {ex.servico_executado || '—'}
                </Text>
                {(ex.hora_inicio || ex.hora_fim) && (
                  <Text style={styles.execTime}>
                    {formatTime(ex.hora_inicio)} → {formatTime(ex.hora_fim)}
                    {ex.tempo_execucao ? `  (${ex.tempo_execucao} min)` : ''}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Action button */}
      {canExecute && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.executeButton}
            onPress={() => navigation.navigate('Execution', { osId: os.id })}
            activeOpacity={0.7}
          >
            <Text style={styles.executeButtonIcon}>🔧</Text>
            <Text style={styles.executeButtonText}>EXECUTAR SERVIÇO</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Helpers ───

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

function formatTime(iso?: string | null): string {
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: SIZES.fontLG,
    color: COLORS.textSecondary,
  },
  scrollContent: {
    padding: SIZES.paddingMD,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  osNumber: {
    fontSize: SIZES.fontXL,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tipo: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  infoLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: SIZES.fontSM,
    color: COLORS.textPrimary,
    fontWeight: '600',
    maxWidth: '55%',
    textAlign: 'right',
  },
  problemText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  emptyExec: {
    fontSize: SIZES.fontSM,
    color: COLORS.textHint,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  execRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  execHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  execMecanico: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  execDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  execServico: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  execTime: {
    fontSize: 12,
    color: COLORS.textHint,
    marginTop: 4,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SIZES.paddingMD,
    paddingBottom: 32,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  executeButton: {
    height: SIZES.buttonXL,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  executeButtonIcon: {
    fontSize: 26,
  },
  executeButtonText: {
    fontSize: SIZES.fontLG,
    fontWeight: '800',
    color: '#FFF',
  },
});
