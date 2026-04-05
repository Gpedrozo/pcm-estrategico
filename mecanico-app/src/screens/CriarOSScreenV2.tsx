// ============================================================
// CriarOSScreen v2.0 — Emissão de O.S. (mesma lógica do web)
// Pode receber solicitação para converter em O.S.
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../theme';
import type {
  Equipamento, Mecanico, SolicitacaoManutencao, RootStackParamList,
  OSTipo, OSPrioridade,
} from '../types';

type Route = RouteProp<RootStackParamList, 'CriarOS'>;

const TIPOS: { value: OSTipo; label: string }[] = [
  { value: 'CORRETIVA', label: 'Corretiva' },
  { value: 'PREVENTIVA', label: 'Preventiva' },
  { value: 'PREDITIVA', label: 'Preditiva' },
  { value: 'INSPECAO', label: 'Inspeção' },
  { value: 'MELHORIA', label: 'Melhoria' },
];

const PRIORIDADES: { value: OSPrioridade; label: string; color: string }[] = [
  { value: 'URGENTE', label: 'Urgente', color: COLORS.prioridadeEmergencial },
  { value: 'ALTA', label: 'Alta', color: COLORS.prioridadeAlta },
  { value: 'MEDIA', label: 'Média', color: COLORS.prioridadeMedia },
  { value: 'BAIXA', label: 'Baixa', color: COLORS.prioridadeBaixa },
];

// Map solicitação classificação → OS prioridade
const CLASSIFICACAO_TO_PRIORIDADE: Record<string, OSPrioridade> = {
  EMERGENCIAL: 'URGENTE',
  URGENTE: 'ALTA',
  PROGRAMAVEL: 'MEDIA',
};

export default function CriarOSScreen() {
  const route = useRoute<Route>();
  const nav = useNavigation();
  const { empresaId, mecanicoId, mecanicoNome } = useAuth();
  const solicitacao = route.params?.solicitacao;

  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [tagSearch, setTagSearch] = useState(solicitacao?.tag || '');
  const [selectedEquip, setSelectedEquip] = useState<Equipamento | null>(null);
  const [tipo, setTipo] = useState<OSTipo>('CORRETIVA');
  const [prioridade, setPrioridade] = useState<OSPrioridade>(
    solicitacao ? CLASSIFICACAO_TO_PRIORIDADE[solicitacao.classificacao] || 'MEDIA' : 'MEDIA',
  );
  const [solicitante, setSolicitante] = useState(solicitacao?.solicitante_nome || mecanicoNome || '');
  const [problema, setProblema] = useState(solicitacao?.descricao_falha || '');
  const [mecanicoResp, setMecanicoResp] = useState(mecanicoId || '');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!empresaId) return;
    const [eqRes, mecRes] = await Promise.all([
      supabase.from('equipamentos').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('tag'),
      supabase.from('mecanicos').select('*').eq('empresa_id', empresaId).eq('ativo', true).is('deleted_at', null).order('nome'),
    ]);
    if (eqRes.data) {
      setEquipamentos(eqRes.data);
      // If solicitacao has a tag, auto-select equip
      if (solicitacao?.tag) {
        const match = eqRes.data.find((e) => e.tag === solicitacao.tag);
        if (match) setSelectedEquip(match);
      }
    }
    if (mecRes.data) setMecanicos(mecRes.data);
    setLoading(false);
  };

  const filteredEquip = useMemo(() => {
    if (!tagSearch.trim()) return [];
    const q = tagSearch.toLowerCase();
    return equipamentos.filter(
      (e) =>
        (e.tag || '').toLowerCase().includes(q) ||
        (e.nome || '').toLowerCase().includes(q),
    ).slice(0, 8);
  }, [tagSearch, equipamentos]);

  const handleSubmit = async () => {
    if (!selectedEquip) { Alert.alert('Atenção', 'Selecione um equipamento (TAG)'); return; }
    if (problema.length < 5) { Alert.alert('Atenção', 'Descreva o problema (mín. 5 caracteres)'); return; }
    if (!solicitante.trim()) { Alert.alert('Atenção', 'Informe o solicitante'); return; }

    setSaving(true);
    try {
      // Get next numero_os
      const { data: maxData } = await supabase
        .from('ordens_servico')
        .select('numero_os')
        .eq('empresa_id', empresaId!)
        .order('numero_os', { ascending: false })
        .limit(1)
        .single();

      const nextNum = (maxData?.numero_os || 0) + 1;

      const { error } = await supabase.from('ordens_servico').insert({
        empresa_id: empresaId,
        numero_os: nextNum,
        tipo,
        prioridade,
        status: 'ABERTA',
        tag: selectedEquip.tag || selectedEquip.nome,
        equipamento: selectedEquip.nome,
        equipamento_id: selectedEquip.id,
        problema,
        solicitante,
        data_solicitacao: new Date().toISOString().split('T')[0],
        mecanico_responsavel_id: mecanicoResp || null,
        mecanico_responsavel_codigo: mecanicos.find((m) => m.id === mecanicoResp)?.codigo_acesso || null,
        usuario_abertura: mecanicoId || null,
      });

      if (error) throw error;

      // If from solicitação, update it to CONVERTIDA
      if (solicitacao) {
        await supabase.from('solicitacoes_manutencao').update({
          status: 'CONVERTIDA',
          updated_at: new Date().toISOString(),
        }).eq('id', solicitacao.id);
      }

      Alert.alert('Sucesso', `O.S. #${String(nextNum).padStart(4, '0')} criada com sucesso!`, [
        { text: 'OK', onPress: () => nav.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Falha ao criar O.S.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>
          {solicitacao ? 'Converter Solicitação → O.S.' : 'Nova Ordem de Serviço'}
        </Text>

        {solicitacao && (
          <View style={[styles.card, { backgroundColor: COLORS.infoBg }]}>
            <Text style={{ fontSize: SIZES.fontSM, color: COLORS.info, fontWeight: '600' }}>
              Convertendo solicitação #{solicitacao.numero_solicitacao}
            </Text>
          </View>
        )}

        {/* Equipamento / TAG */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Equipamento / TAG *</Text>
          <TextInput
            style={styles.input}
            placeholder="Buscar por TAG ou nome do equipamento"
            value={tagSearch}
            onChangeText={(v) => { setTagSearch(v); setSelectedEquip(null); }}
          />
          {!selectedEquip && filteredEquip.map((e) => (
            <TouchableOpacity
              key={e.id}
              style={styles.optionItem}
              onPress={() => { setSelectedEquip(e); setTagSearch(`${e.tag || ''} — ${e.nome}`); }}
            >
              <Text style={styles.optionText}>
                {e.tag ? <Text style={{ fontWeight: '700' }}>{e.tag}</Text> : null}
                {e.tag ? ' — ' : ''}{e.nome}
              </Text>
              {e.localizacao && <Text style={styles.optionSub}>{e.localizacao}</Text>}
            </TouchableOpacity>
          ))}
          {selectedEquip && (
            <View style={styles.selectedTag}>
              <Text style={{ color: COLORS.success, fontWeight: '700', fontSize: SIZES.fontSM }}>
                ✓ {selectedEquip.tag || selectedEquip.nome} — {selectedEquip.nome}
              </Text>
            </View>
          )}
        </View>

        {/* Tipo */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tipo</Text>
          <View style={styles.chipRow}>
            {TIPOS.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.chip, tipo === t.value && styles.chipSelected]}
                onPress={() => setTipo(t.value)}
              >
                <Text style={[styles.chipText, tipo === t.value && styles.chipTextSelected]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Prioridade */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Prioridade</Text>
          <View style={styles.chipRow}>
            {PRIORIDADES.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[styles.chip, prioridade === p.value && { backgroundColor: p.color, borderColor: p.color }]}
                onPress={() => setPrioridade(p.value)}
              >
                <Text style={[styles.chipText, prioridade === p.value && styles.chipTextSelected]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Solicitante */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Solicitante *</Text>
          <TextInput
            style={styles.input}
            value={solicitante}
            onChangeText={setSolicitante}
            placeholder="Nome do solicitante"
          />
        </View>

        {/* Problema */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Descrição do Problema *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            value={problema}
            onChangeText={setProblema}
            placeholder="Descreva o problema identificado (mín. 5 caracteres)"
            textAlignVertical="top"
          />
        </View>

        {/* Mecânico Responsável */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mecânico Responsável</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.chip, !mecanicoResp && styles.chipSelected]}
              onPress={() => setMecanicoResp('')}
            >
              <Text style={[styles.chipText, !mecanicoResp && styles.chipTextSelected]}>Nenhum</Text>
            </TouchableOpacity>
            {mecanicos.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.chip, mecanicoResp === m.id && styles.chipSelected]}
                onPress={() => setMecanicoResp(m.id)}
              >
                <Text style={[styles.chipText, mecanicoResp === m.id && styles.chipTextSelected]}>{m.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btn, saving && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : (
            <Text style={styles.btnText}>
              {solicitacao ? 'CONVERTER E CRIAR O.S.' : 'CRIAR O.S.'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: SIZES.fontLG, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD, padding: SIZES.paddingMD, marginBottom: 12, ...SHADOWS.small },
  sectionTitle: { fontSize: SIZES.fontSM, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  input: { height: 48, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radiusSM, paddingHorizontal: 12, fontSize: SIZES.fontSM, backgroundColor: '#FAFAFA' },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 4, marginBottom: 4 },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: SIZES.fontSM, color: COLORS.textSecondary },
  chipTextSelected: { color: '#FFF', fontWeight: '700' },
  optionItem: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.divider },
  optionText: { fontSize: SIZES.fontSM, color: COLORS.textPrimary },
  optionSub: { fontSize: 12, color: COLORS.textHint, marginTop: 2 },
  selectedTag: { backgroundColor: COLORS.successBg, padding: 10, borderRadius: 8, marginTop: 8 },
  btn: { height: SIZES.buttonHeight, borderRadius: SIZES.radiusMD, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary, marginTop: 12 },
  btnText: { color: '#FFF', fontSize: SIZES.fontMD, fontWeight: '700' },
});
