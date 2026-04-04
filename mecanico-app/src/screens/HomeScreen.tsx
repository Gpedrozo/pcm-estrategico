// ============================================================
// HomeScreen — Dashboard de AÇÃO para o mecânico
// Contadores + Botões grandes + Lista resumida
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { getOrdensServico, getOSStats, getProximaOS, getSyncQueueCount } from '../lib/database';
import { runSyncCycle, isOnline } from '../lib/syncEngine';
import OSCard from '../components/OSCard';
import EmptyState from '../components/EmptyState';
import { COLORS, SIZES } from '../theme';
import type { OrdemServico, RootStackParamList } from '../types';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId, mecanicoNome } = useAuth();

  const [stats, setStats] = useState({ abertas: 0, programadas: 0, emAndamento: 0, finalizadasHoje: 0 });
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'online' | 'pending' | 'offline'>('online');
  const [pendingCount, setPendingCount] = useState(0);

  const loadData = useCallback(async () => {
    if (!empresaId) return;
    try {
      const [s, os, pending, online] = await Promise.all([
        getOSStats(empresaId),
        getOrdensServico(empresaId),
        getSyncQueueCount(),
        isOnline(),
      ]);
      setStats(s);
      setOrdens(os);
      setPendingCount(pending);
      setSyncStatus(!online ? 'offline' : pending > 0 ? 'pending' : 'online');
    } catch {
      /* ignore local read errors */
    }
  }, [empresaId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await runSyncCycle();
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const atenderProxima = async () => {
    if (!empresaId) return;
    const prox = await getProximaOS(empresaId);
    if (prox) {
      navigation.navigate('OSDetail', { osId: prox.id });
    }
  };

  // OS ativas (abertas + em andamento) para a lista
  const osAtivas = ordens.filter((o) =>
    ['aberta', 'solicitada', 'emitida', 'em_andamento', 'em_execucao'].includes(o.status)
  );

  const syncColor = syncStatus === 'online' ? COLORS.success : syncStatus === 'pending' ? COLORS.warning : COLORS.critical;
  const syncLabel = syncStatus === 'online' ? '🟢 Sincronizado' : syncStatus === 'pending' ? `🟡 ${pendingCount} pendência${pendingCount !== 1 ? 's' : ''}` : '🔴 Offline';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>👤 {mecanicoNome || 'Mecânico'}</Text>
            <Text style={styles.syncLabel}>{syncLabel}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={osAtivas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OSCard os={item} onPress={() => navigation.navigate('OSDetail', { osId: item.id })} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          <View>
            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderLeftColor: COLORS.critical }]}>  
                <Text style={[styles.statNumber, { color: COLORS.critical }]}>{stats.abertas}</Text>
                <Text style={styles.statLabel}>ABERTAS</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>  
                <Text style={[styles.statNumber, { color: COLORS.warning }]}>{stats.programadas}</Text>
                <Text style={styles.statLabel}>PROGRAMADAS</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>  
                <Text style={[styles.statNumber, { color: COLORS.primary }]}>{stats.emAndamento}</Text>
                <Text style={styles.statLabel}>EXECUTANDO</Text>
              </View>
            </View>

            {/* Main Action Buttons */}
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.mainButton}
                onPress={atenderProxima}
                activeOpacity={0.7}
              >
                <Text style={styles.mainButtonText}>▶️  ATENDER PRÓXIMA O.S</Text>
              </TouchableOpacity>

              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('SolicitarServico', {})}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryIcon}>➕</Text>
                  <Text style={styles.secondaryText}>SOLICITAR{'\n'}SERVIÇO</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('EquipamentoDetalhe', { equipamentoId: '__search__' })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryIcon}>🔍</Text>
                  <Text style={styles.secondaryText}>BUSCAR{'\n'}EQUIPAMENTO</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section title */}
            {osAtivas.length > 0 && (
              <Text style={styles.sectionTitle}>📋 MINHAS ORDENS ({osAtivas.length})</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="✅"
            title="Tudo em dia!"
            subtitle="Nenhuma OS pendente. Puxe para baixo para atualizar."
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
    backgroundColor: COLORS.headerBg,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: SIZES.paddingLG,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: '#FFF',
  },
  syncLabel: {
    fontSize: SIZES.fontSM,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.paddingMD,
    paddingTop: SIZES.paddingMD,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: SIZES.fontXXL,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionsSection: {
    padding: SIZES.paddingMD,
  },
  mainButton: {
    height: SIZES.buttonHeightLG,
    backgroundColor: COLORS.success,
    borderRadius: SIZES.radiusLG,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  mainButtonText: {
    fontSize: SIZES.fontLG,
    fontWeight: '800',
    color: '#FFF',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 80,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  secondaryIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  secondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingHorizontal: SIZES.paddingMD,
    paddingTop: SIZES.paddingMD,
    paddingBottom: 8,
  },
});
