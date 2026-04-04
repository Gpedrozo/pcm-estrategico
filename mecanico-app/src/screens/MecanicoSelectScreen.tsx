// ============================================================
// MecanicoSelectScreen — Selecione seu nome + digite sua senha
// Lista mecânicos da empresa (sync local), valida senha via RPC
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getMecanicos, upsertMecanico } from '../lib/database';
import { supabase } from '../lib/supabase';
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

  // Password modal state
  const [selectedMec, setSelectedMec] = useState<MecanicoItem | null>(null);
  const [senha, setSenha] = useState('');
  const [senhaError, setSenhaError] = useState('');
  const [validating, setValidating] = useState(false);
  const senhaInputRef = useRef<TextInput>(null);

  // Busca mecânicos via RPC SECURITY DEFINER (ignora RLS) → fallback query direta
  const fetchFromSupabase = useCallback(async (): Promise<MecanicoItem[]> => {
    if (!empresaId) return [];

    // Tentativa 1: RPC (SECURITY DEFINER — nunca bloqueado por RLS)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'listar_mecanicos_empresa',
        { p_empresa_id: empresaId }
      );
      if (!rpcError && rpcData && rpcData.length > 0) {
        console.log(`[MecanicoSelect] RPC retornou ${rpcData.length} mecânicos`);
        for (const mec of rpcData) {
          await upsertMecanico({ ...mec, empresa_id: empresaId, ativo: true });
        }
        return rpcData;
      }
      if (rpcError) {
        console.warn('[MecanicoSelect] RPC error (tentando query direta):', rpcError.message);
      }
    } catch (err) {
      console.warn('[MecanicoSelect] RPC exception:', err);
    }

    // Tentativa 2: Query direta (funciona se session OK + RLS permite)
    try {
      const { data, error } = await supabase
        .from('mecanicos')
        .select('id, nome, tipo')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .is('deleted_at', null)
        .order('nome', { ascending: true })
        .limit(200);

      if (!error && data && data.length > 0) {
        console.log(`[MecanicoSelect] Query direta retornou ${data.length} mecânicos`);
        for (const mec of data) {
          await upsertMecanico({ ...mec, empresa_id: empresaId, ativo: true });
        }
        return data;
      }
      if (error) {
        console.warn('[MecanicoSelect] Query direta error:', error.message);
      }
    } catch (err) {
      console.warn('[MecanicoSelect] Query direta exception:', err);
    }

    return [];
  }, [empresaId]);

  const loadMecanicos = useCallback(async () => {
    if (!empresaId) return;
    try {
      // 1. Tenta local primeiro (rápido, offline)
      let list = await getMecanicos(empresaId);

      // 2. Se local vazio, busca do Supabase via RPC (SECURITY DEFINER)
      if (list.length === 0) {
        console.log('[MecanicoSelect] SQLite vazio, buscando do Supabase...');
        list = await fetchFromSupabase();
      }

      setMecanicos(list);
    } catch (err) {
      console.warn('[MecanicoSelect] erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, fetchFromSupabase]);

  // Na montagem: busca imediata do local, depois tenta Supabase em paralelo
  useEffect(() => {
    let mounted = true;
    async function init() {
      if (!empresaId) return;

      // Passo 1: Carrega do SQLite imediatamente (pode ter dados do bind)
      try {
        const localList = await getMecanicos(empresaId);
        if (mounted && localList.length > 0) {
          setMecanicos(localList);
          setLoading(false);
          console.log(`[MecanicoSelect] ${localList.length} mecânicos carregados do SQLite`);
        }
      } catch { /* ignore */ }

      // Passo 2: Busca fresco do Supabase (RPC ou query)
      try {
        const freshList = await fetchFromSupabase();
        if (mounted && freshList.length > 0) {
          setMecanicos(freshList);
          setLoading(false);
          return;
        }
      } catch { /* ignore */ }

      // Passo 3: Se ainda vazio, tenta sync completo e recarrega
      try {
        await runSyncCycle();
      } catch { /* ignore */ }
      if (mounted) {
        await loadMecanicos();
      }
    }
    init();
    return () => { mounted = false; };
  }, [empresaId, loadMecanicos, fetchFromSupabase]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Força busca do Supabase (sempre atualizado)
      const freshList = await fetchFromSupabase();
      if (freshList.length > 0) {
        setMecanicos(freshList);
      } else {
        // Fallback: tenta sync + local
        await runSyncCycle();
        await loadMecanicos();
      }
    } finally {
      setRefreshing(false);
    }
  }, [fetchFromSupabase, loadMecanicos]);

  // Abre modal de senha ao tocar no mecânico
  const handleTapMecanico = useCallback((mec: MecanicoItem) => {
    setSelectedMec(mec);
    setSenha('');
    setSenhaError('');
    // Focus no input após modal abrir
    setTimeout(() => senhaInputRef.current?.focus(), 300);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedMec(null);
    setSenha('');
    setSenhaError('');
    setValidating(false);
  }, []);

  // Valida senha via RPC do Supabase
  const handleValidarSenha = useCallback(async () => {
    if (!selectedMec) return;

    const senhaTrimmed = senha.trim();
    if (!senhaTrimmed) {
      setSenhaError('Digite sua senha');
      return;
    }

    setValidating(true);
    setSenhaError('');

    try {
      const { data, error } = await supabase.rpc('validar_senha_mecanico', {
        p_mecanico_id: selectedMec.id,
        p_senha: senhaTrimmed,
      });

      if (error) {
        console.warn('[MecanicoSelect] RPC error:', error.message);
        // Fallback: se RPC não existe ainda, permite acesso (compatibilidade)
        if (error.message.includes('function') || error.message.includes('does not exist')) {
          await selectMecanico(selectedMec.id, selectedMec.nome);
          return;
        }
        setSenhaError('Erro ao validar. Tente novamente.');
        setValidating(false);
        return;
      }

      if (data === true) {
        // Senha correta — prossegue
        await selectMecanico(selectedMec.id, selectedMec.nome);
      } else {
        setSenhaError('Senha incorreta');
        setValidating(false);
      }
    } catch (err: any) {
      console.warn('[MecanicoSelect] erro validação:', err);
      setSenhaError('Erro de conexão. Verifique sua internet.');
      setValidating(false);
    }
  }, [selectedMec, senha, selectMecanico]);

  const renderItem = useCallback(({ item }: { item: MecanicoItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleTapMecanico(item)}
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
      <Text style={styles.cardArrow}>›</Text>
    </TouchableOpacity>
  ), [handleTapMecanico]);

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
        <Text style={styles.subtitle}>Selecione seu nome e digite sua senha</Text>
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

      {/* ─── Modal de Senha ─── */}
      <Modal
        visible={!!selectedMec}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            {/* Avatar + Nome */}
            <View style={styles.modalHeader}>
              <View style={styles.modalAvatar}>
                <Text style={styles.modalAvatarText}>
                  {selectedMec?.nome.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.modalName}>{selectedMec?.nome}</Text>
              {selectedMec?.tipo && (
                <Text style={styles.modalTipo}>{selectedMec.tipo}</Text>
              )}
            </View>

            {/* Input de senha */}
            <Text style={styles.modalLabel}>Digite sua senha</Text>
            <TextInput
              ref={senhaInputRef}
              style={[styles.senhaInput, senhaError ? styles.senhaInputError : null]}
              value={senha}
              onChangeText={(t) => { setSenha(t); setSenhaError(''); }}
              placeholder="Senha de acesso"
              placeholderTextColor={COLORS.textHint}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!validating}
              onSubmitEditing={handleValidarSenha}
              returnKeyType="go"
            />
            {senhaError ? (
              <Text style={styles.senhaErrorText}>{senhaError}</Text>
            ) : null}

            {/* Botões */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={handleCloseModal}
                disabled={validating}
                activeOpacity={0.7}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnEntrar, validating && styles.btnEntrarDisabled]}
                onPress={handleValidarSenha}
                disabled={validating}
                activeOpacity={0.7}
              >
                {validating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.btnEntrarText}>Entrar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  cardArrow: {
    fontSize: 28,
    color: COLORS.textHint,
    fontWeight: '300',
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

  // ─── Modal Styles ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLG,
    padding: 28,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  modalName: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalTipo: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modalLabel: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  senhaInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSM,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: SIZES.fontLG,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    textAlign: 'center',
    letterSpacing: 4,
  },
  senhaInputError: {
    borderColor: COLORS.critical,
  },
  senhaErrorText: {
    color: COLORS.critical,
    fontSize: SIZES.fontSM,
    marginTop: 6,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  btnCancelar: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SIZES.radiusSM,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  btnCancelarText: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  btnEntrar: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SIZES.radiusSM,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  btnEntrarDisabled: {
    opacity: 0.6,
  },
  btnEntrarText: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: '#FFF',
  },
});
