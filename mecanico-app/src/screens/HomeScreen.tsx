// ============================================================
// HomeScreen — OS list with filter tabs, search, refresh
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { getOrdensServico } from '../lib/database';
import { runSyncCycle } from '../lib/syncEngine';
import OSCard from '../components/OSCard';
import SyncStatusBar from '../components/SyncStatusBar';
import EmptyState from '../components/EmptyState';
import { COLORS, SIZES } from '../theme';
import type { OrdemServico, RootStackParamList, OSStatus } from '../types';

type Filter = 'abertas' | 'andamento' | 'todas';

const FILTER_LABELS: Record<Filter, string> = {
  abertas: 'Abertas',
  andamento: 'Em Andamento',
  todas: 'Todas',
};

const FILTER_STATUSES: Record<Filter, OSStatus[] | null> = {
  abertas: ['aberta'],
  andamento: ['em_andamento'],
  todas: null,
};

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId, empresaNome } = useAuth();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [filter, setFilter] = useState<Filter>('abertas');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadOrdens = useCallback(async () => {
    try {
      const all = await getOrdensServico();
      setOrdens(all);
    } catch {
      /* local DB read, ignore */
    }
  }, []);

  useEffect(() => {
    loadOrdens();
  }, [loadOrdens]);

  // Reload when returning to this screen
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadOrdens);
    return unsub;
  }, [navigation, loadOrdens]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (empresaId) {
        await runSyncCycle(empresaId);
      }
      await loadOrdens();
    } finally {
      setRefreshing(false);
    }
  };

  // Filter + search
  const filtered = ordens.filter((os) => {
    const statuses = FILTER_STATUSES[filter];
    if (statuses && !statuses.includes(os.status)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        os.numero_os?.toLowerCase().includes(q) ||
        os.equipamento?.toLowerCase().includes(q) ||
        os.problema?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <SyncStatusBar />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.empresaNome}>{empresaNome || 'PCM Mecânico'}</Text>
        <Text style={styles.headerGreeting}>
          {filtered.length} ordem{filtered.length !== 1 ? 's' : ''} de serviço
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍  Buscar OS, equipamento..."
          placeholderTextColor={COLORS.textHint}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterTab, filter === key && styles.filterTabActive]}
            onPress={() => setFilter(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, filter === key && styles.filterTabTextActive]}>
              {FILTER_LABELS[key]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* OS List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OSCard os={item} onPress={() => navigation.navigate('OSDetail', { osId: item.id })} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title={filter === 'todas' ? 'Nenhuma OS encontrada' : `Nenhuma OS ${FILTER_LABELS[filter].toLowerCase()}`}
            subtitle={search ? 'Tente buscar com outros termos' : 'Puxe para baixo para atualizar'}
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
    paddingHorizontal: SIZES.paddingMD,
    paddingTop: 12,
    paddingBottom: 8,
  },
  empresaNome: {
    fontSize: SIZES.fontXL,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerGreeting: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  searchRow: {
    paddingHorizontal: SIZES.paddingMD,
    marginBottom: 8,
  },
  searchInput: {
    height: 48,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    fontSize: SIZES.fontSM,
    color: COLORS.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.paddingMD,
    marginBottom: 8,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    height: 40,
    borderRadius: SIZES.radiusSM,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingBottom: 100,
  },
});
