// ============================================================
// MecanicoSelectScreen — Quem está usando este dispositivo?
// Tela simples com lista de mecânicos da empresa
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getMecanicos } from '../lib/database';
import { runSyncCycle } from '../lib/syncEngine';
import { COLORS, SIZES } from '../theme';

interface MecanicoItem {
  id: string;
  nome: string;
  tipo?: string;
}

export default function MecanicoSelectScreen() {
  const { empresaId, selectMecanico } = useAuth();
  const [mecanicos, setMecanicos] = useState<MecanicoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);

  const loadMecanicos = useCallback(async () => {
    if (!empresaId) return;
    try {
      const list = await getMecanicos(empresaId);
      setMecanicos(list);
    } catch (err) {
      console.warn('[MecanicoSelect] erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    loadMecanicos();
  }, [loadMecanicos]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await runSyncCycle();
      await loadMecanicos();
    } finally {
      setRefreshing(false);
    }
  }, [loadMecanicos]);

  const handleSelect = useCallback(async (mec: MecanicoItem) => {
    setSelecting(mec.id);
    await selectMecanico(mec.id, mec.nome);
  }, [selectMecanico]);

  const renderItem = useCallback(({ item }: { item: MecanicoItem }) => (
    <TouchableOpacity
      style={[styles.card, selecting === item.id && styles.cardSelected]}
      onPress={() => handleSelect(item)}
      disabled={!!selecting}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.nome.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName}>{item.nome}</Text>
        {item.tipo && <Text style={styles.cardTipo}>{item.tipo}</Text>}
      </View>
      {selecting === item.id && (
        <ActivityIndicator size="small" color={COLORS.primary} />
      )}
    </TouchableOpacity>
  ), [selecting, handleSelect]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando mecânicos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>👤</Text>
        <Text style={styles.title}>Quem está usando?</Text>
        <Text style={styles.subtitle}>Selecione seu nome para continuar</Text>
      </View>

      {mecanicos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyText}>Nenhum mecânico encontrado</Text>
          <Text style={styles.emptyHint}>
            Puxe para baixo para atualizar ou peça ao gestor para cadastrar os mecânicos no sistema.
          </Text>
        </View>
      ) : (
        <FlatList
          data={mecanicos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: SIZES.paddingLG,
    alignItems: 'center',
  },
  icon: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.fontMD,
    color: 'rgba(255,255,255,0.7)',
  },
  list: {
    padding: SIZES.paddingMD,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SIZES.paddingLG,
    borderRadius: SIZES.radiusMD,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardTipo: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
