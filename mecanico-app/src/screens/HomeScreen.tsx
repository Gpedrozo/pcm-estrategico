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
import { getOrdensServico, getOSStats, getProximaOS, getSyncQueueCount, getSolicitacoesStats, getDB } from '../lib/database';
import { runSyncCycle, isOnline } from '../lib/syncEngine';
import OSCard from '../components/OSCard';
import EmptyState from '../components/EmptyState';
import { COLORS, SIZES } from '../theme';
import type { OrdemServico, RootStackParamList } from '../types';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId, mecanicoNome, mecanicoId } = useAuth();

  const [stats, setStats] = useState({ abertas: 0, programadas: 0, emAndamento: 0, finalizadasHoje: 0 });
  const [solicStats, setSolicStats] = useState({ pendentes: 0, aprovadas: 0, total: 0 });
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'online' | 'pending' | 'offline'>('online');
  const [pendingCount, setPendingCount] = useState(0);
  const [meusOsIds, setMeusOsIds] = useState<Set<string>>(new Set());
  const [initialSyncDone, setInitialSyncDone] = useState(false);

  const loadData = useCallback(async () => {
    if (!empresaId) return;
    try {
      const [s, os, pending, online, ss] = await Promise.all([
        getOSStats(empresaId),
        getOrdensServico(empresaId),
        getSyncQueueCount(),
        isOnline(),
        getSolicitacoesStats(empresaId),
      ]);
      setStats(s);
      setOrdens(os);
      setPendingCount(pending);
      setSyncStatus(!online ? 'offline' : pending > 0 ? 'pending' : 'online');
      setSolicStats(ss);

      if (os.length === 0 && online && !initialSyncDone) {
        setInitialSyncDone(true);
        await runSyncCycle(true);
        const [s2, os2, ss2] = await Promise.all([
          getOSStats(empresaId),
          getOrdensServico(empresaId),
          getSolicitacoesStats(empresaId),
        ]);
        setStats(s2);
        setOrdens(os2);
        setSolicStats(ss2);
      }

      if (mecanicoId) {
        const db = await getDB();
        const execOsRows = await db.getAllAsync<{ os_id: string }>(
          'SELECT DISTINCT os_id FROM execucoes_os WHERE mecanico_id = ?',
          [mecanicoId]
        );
        setMeusOsIds(new Set(execOsRows.map((r) => r.os_id)));
      }
    } catch {
      /* ignore local read errors */
    }
  }, [empresaId, mecanicoId, initialSyncDone]);

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

  const atenderProxima = async () => {
    if (!empresaId) return;
    const prox = await getProximaOS(empresaId);
    if (prox) {
      navigation.navigate('OSDetail', { osId: prox.id });
    }
  };

  const osAtivas = ordens.filter((o) =>
    !['fechada', 'concluida', 'cancelada', 'FECHADA', 'CANCELADA'].includes(o.status)
  );

  const minhasOS = osAtivas.filter((o) => meusOsIds.has(o.id) || o.solicitante === mecanicoNome);
  const outrasOS = osAtivas.filter((o) => !meusOsIds.has(o.id) && o.solicitante !== mecanicoNome);
  const osOrdenadas = [...minhasOS, ...outrasOS];

  const syncColor = syncStatus === 'online' ? COLORS.success : syncStatus === 'pending' ? COLORS.warning : COLORS.critical;
  const syncLabel = syncStatus === 'online' ? '🟢 Sincronizado' : syncStatus === 'pending' ? `🟡 ${pendingCount} pendência${pendingCount !== 1 ? 's' : ''}` : '🔴 Offline';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>👤 {mecanicoNome || 'Mecânico'}</Text>
            <Text style={styles.syncLabel}>{syncLabel}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={osOrdenadas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isMinha = minhasOS.some((o) => o.id === item.id);
          return (
            <OSCard
              os={item}
              onPress={() => navigation.navigate('OSDetail', { osId: item.id })}
              highlighted={isMinha}
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          <View>
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
              <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
                <Text style={[styles.statNumber, { color: COLORS.success }]}>{stats.finalizadasHoje}</Text>
                <Text style={styles.statLabel}>HOJE</Text>
              </View>
            </View>

            <View style={styles.actionsSection}>
              <TouchableOpacity style={styles.mainButton} onPress={atenderProxima} activeOpacity={0.7}>
                <Text style={styles.mainButtonText}>▶️  ATENDER PRÓXIMA O.S</Text>
              </TouchableOpacity>

              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: COLORS.success, borderWidth: 2 }]}
                  onPress={() => navigation.navigate('CriarOS')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryIcon}>📋</Text>
                  <Text style={styles.secondaryText}>ABRIR{'\n'}O.S.</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('SolicitarServico', {})}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryIcon}>➕</Text>
                  <Text style={styles.secondaryText}>SOLICITAR{'\n'}SERVIÇO</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('EquipamentoDetalhe', { equipamentoId: '__search__' })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryIcon}>🔍</Text>
                  <Text style={styles.secondaryText}>BUSCAR{'\n'}EQUIPAMENTO</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('QRScan' as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryIcon}>📷</Text>
                  <Text style={styles.secondaryText}>SCANNER{'\n'}QR CODE</Text>
                </TouchableOpacity>
              </View>
            </View>

            {osOrdenadas.length > 0 && (
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>📋 ORDENS DE SERVIÇO ({osOrdenadas.length})</Text>
                {minhasOS.length > 0 && (
                  <View style={styles.minhaBadge}>
                    <Text style={styles.minhaBadgeText}>🔵 {minhasOS.length} sua{minhasOS.length !== 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.headerBg, paddingTop: 50, paddingBottom: 16, paddingHorizontal: SIZES.paddingLG },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: SIZES.fontLG, fontWeight: '700', color: '#FFF' },
  syncLabel: { fontSize: SIZES.fontSM, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  listContent: { paddingBottom: 100 },
  statsRow: { flexDirection: 'row', paddingHorizontal: SIZES.paddingMD, paddingTop: SIZES.paddingMD, gap: 8 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD,
    paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', borderLeftWidth: 4,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  statNumber: { fontSize: SIZES.fontXXL, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginTop: 2 },
  actionsSection: { padding: SIZES.paddingMD },
  mainButton: {
    height: SIZES.buttonHeightLG, backgroundColor: COLORS.success, borderRadius: SIZES.radiusLG,
    justifyContent: 'center', alignItems: 'center', elevation: 3,
    shadowColor: COLORS.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  mainButtonText: { fontSize: SIZES.fontLG, fontWeight: '800', color: '#FFF' },
  secondaryRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  secondaryButton: {
    flex: 1, height: 80, backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border,
  },
  secondaryIcon: { fontSize: 28, marginBottom: 4 },
  secondaryText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  sectionTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.paddingMD, paddingTop: SIZES.paddingMD, paddingBottom: 8,
  },
  sectionTitle: { fontSize: SIZES.fontMD, fontWeight: '700', color: COLORS.textPrimary },
  minhaBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  minhaBadgeText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
});