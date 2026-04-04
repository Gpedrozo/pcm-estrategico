// ============================================================
// HistoryScreen — Chronological list of executions
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import SyncStatusBar from '../components/SyncStatusBar';
import EmptyState from '../components/EmptyState';
import { getExecucoesHistorico } from '../lib/database';
import { runSyncCycle } from '../lib/syncEngine';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../theme';
import type { ExecucaoOS } from '../types';

export default function HistoryScreen() {
  const navigation = useNavigation();
  const { empresaId } = useAuth();
  const [execucoes, setExecucoes] = useState<(ExecucaoOS & { numero_os?: string; equipamento?: string })[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      if (!empresaId) return;
      const rows = await getExecucoesHistorico(empresaId, 100);
      setExecucoes(rows);
    } catch {
      /* ignore */
    }
  }, [empresaId]);

  useEffect(() => {
    load();
  }, [load]);

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

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return iso;
    }
  };

  const renderItem = ({ item }: { item: typeof execucoes[0] }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.osNumber}>OS {item.numero_os || '—'}</Text>
        <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
      </View>
      {item.equipamento ? <Text style={styles.equip}>📦 {item.equipamento}</Text> : null}
      <Text style={styles.servico} numberOfLines={3}>
        {item.servico_executado || 'Sem descrição'}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.mecanico}>👤 {item.mecanico_nome || 'Mecânico'}</Text>
        {item.tempo_execucao ? (
          <Text style={styles.tempo}>⏱ {item.tempo_execucao} min</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SyncStatusBar />
      <FlatList
        data={execucoes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          <Text style={styles.header}>Histórico de Execuções</Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="📜"
            title="Nenhuma execução registrada"
            subtitle="As execuções aparecerão aqui conforme você registrar serviços"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    fontSize: SIZES.fontXL,
    fontWeight: '800',
    color: COLORS.textPrimary,
    paddingHorizontal: SIZES.paddingMD,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.paddingMD,
    marginBottom: 10,
    borderRadius: SIZES.radiusMD,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  osNumber: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.primary,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  equip: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  servico: {
    fontSize: SIZES.fontSM,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 8,
  },
  mecanico: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tempo: {
    fontSize: 13,
    color: COLORS.textHint,
    fontWeight: '500',
  },
});
