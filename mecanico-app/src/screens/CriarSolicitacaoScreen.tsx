// ============================================================
// CriarSolicitacaoScreen v2.0 — Nova solicitação de manutenção
// SLA: EMERGENCIAL=2h, URGENTE=8h, PROGRAMAVEL=72h
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../theme';
import { showSuccess, showError, showWarning } from '../lib/feedback';
import type { Equipamento, SolicitacaoImpacto, SolicitacaoClassificacao } from '../types';

const IMPACTOS: { value: SolicitacaoImpacto; label: string; color: string }[] = [
  { value: 'ALTO', label: 'Alto', color: COLORS.critical },
  { value: 'MEDIO', label: 'Médio', color: COLORS.warning },
  { value: 'BAIXO', label: 'Baixo', color: COLORS.success },
];

const CLASSIFICACOES: { value: SolicitacaoClassificacao; label: string; sla: string }[] = [
  { value: 'EMERGENCIAL', label: 'Emergencial', sla: 'SLA: 2 horas' },
  { value: 'URGENTE', label: 'Urgente', sla: 'SLA: 8 horas' },
  { value: 'PROGRAMAVEL', label: 'Programável', sla: 'SLA: 72 horas' },
];

const SLA_HORAS: Record<SolicitacaoClassificacao, number> = {
  EMERGENCIAL: 2,
  URGENTE: 8,
  PROGRAMAVEL: 72,
};

export default function CriarSolicitacaoScreen() {
  const nav = useNavigation();
  const { empresaId, mecanicoNome } = useAuth();

  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [tagSearch, setTagSearch] = useState('');
  const [selectedEquip, setSelectedEquip] = useState<Equipamento | null>(null);
  const [solicitante, setSolicitante] = useState(mecanicoNome || '');
  const [setor, setSetor] = useState('');
  const [impacto, setImpacto] = useState<SolicitacaoImpacto>('MEDIO');
  const [classificacao, setClassificacao] = useState<SolicitacaoClassificacao>('PROGRAMAVEL');
  const [descricaoFalha, setDescricaoFalha] = useState('');

  useEffect(() => {
    loadEquipamentos();
  }, []);

  const loadEquipamentos = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from('equipamentos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('tag');
    if (data) setEquipamentos(data);
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

  const resetForm = () => {
    setTagSearch('');
    setSelectedEquip(null);
    setSolicitante(mecanicoNome || '');
    setSetor('');
    setImpacto('MEDIO');
    setClassificacao('PROGRAMAVEL');
    setDescricaoFalha('');
  };

  const handleSubmit = async () => {
    if (!selectedEquip) { showWarning('Selecione um equipamento (TAG)'); return; }
    if (!solicitante.trim()) { showWarning('Informe o solicitante'); return; }
    if (descricaoFalha.length < 10) { showWarning('Descreva a falha (mín. 10 caracteres)'); return; }

    setSaving(true);
    try {
      // Get next numero_solicitacao
      const { data: maxData } = await supabase
        .from('solicitacoes_manutencao')
        .select('numero_solicitacao')
        .eq('empresa_id', empresaId!)
        .order('numero_solicitacao', { ascending: false })
        .limit(1)
        .single();

      const nextNum = (maxData?.numero_solicitacao || 0) + 1;

      const slaHoras = SLA_HORAS[classificacao];
      const now = new Date();
      const dataLimite = new Date(now.getTime() + slaHoras * 60 * 60 * 1000);

      const { error } = await supabase.from('solicitacoes_manutencao').insert({
        empresa_id: empresaId,
        numero_solicitacao: nextNum,
        equipamento_id: selectedEquip.id,
        tag: selectedEquip.tag || selectedEquip.nome,
        solicitante_nome: solicitante.trim(),
        solicitante_setor: setor.trim() || null,
        descricao_falha: descricaoFalha.trim(),
        impacto,
        classificacao,
        status: 'PENDENTE',
        sla_horas: slaHoras,
        data_limite: dataLimite.toISOString(),
      });

      if (error) throw error;

      resetForm();
      showSuccess(
        `Solicitação #${String(nextNum).padStart(4, '0')} criada!\nSLA: ${slaHoras}h — Prazo: ${dataLimite.toLocaleString('pt-BR')}`,
        () => nav.goBack(),
      );
    } catch (err: any) {
      showError(err);
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
        <Text style={styles.title}>Nova Solicitação de Manutenção</Text>

        {/* Equipamento / TAG */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Equipamento / TAG *</Text>
          <TextInput
            style={styles.input}
            placeholder="Buscar por TAG ou nome"
            value={tagSearch}
            onChangeText={(v) => { setTagSearch(v); setSelectedEquip(null); }}
            editable={!saving}
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
            </TouchableOpacity>
          ))}
          {selectedEquip && (
            <View style={styles.selectedTag}>
              <Text style={{ color: COLORS.success, fontWeight: '700', fontSize: SIZES.fontSM }}>
                ✓ {selectedEquip.tag || selectedEquip.nome}
              </Text>
            </View>
          )}
        </View>

        {/* Solicitante */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Solicitante *</Text>
          <TextInput style={styles.input} value={solicitante} onChangeText={setSolicitante} placeholder="Nome" editable={!saving} />
        </View>

        {/* Setor */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Setor</Text>
          <TextInput style={styles.input} value={setor} onChangeText={setSetor} placeholder="Setor onde está o equipamento" editable={!saving} />
        </View>

        {/* Impacto */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Impacto na Produção</Text>
          <View style={styles.chipRow}>
            {IMPACTOS.map((i) => (
              <TouchableOpacity
                key={i.value}
                style={[styles.chip, impacto === i.value && { backgroundColor: i.color, borderColor: i.color }]}
                onPress={() => setImpacto(i.value)}
              >
                <Text style={[styles.chipText, impacto === i.value && styles.chipTextSelected]}>{i.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Classificação */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Classificação</Text>
          {CLASSIFICACOES.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.classOption, classificacao === c.value && styles.classOptionSelected]}
              onPress={() => setClassificacao(c.value)}
            >
              <View>
                <Text style={[styles.classLabel, classificacao === c.value && { color: '#FFF' }]}>{c.label}</Text>
                <Text style={[styles.classSla, classificacao === c.value && { color: 'rgba(255,255,255,0.8)' }]}>{c.sla}</Text>
              </View>
              {classificacao === c.value && <Text style={{ color: '#FFF', fontSize: 20 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Descrição da Falha */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Descrição da Falha *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={5}
            value={descricaoFalha}
            onChangeText={setDescricaoFalha}
            placeholder="Descreva a falha observada de forma detalhada (mín. 10 caracteres)"
            textAlignVertical="top"
            editable={!saving}
          />
          <Text style={styles.charCount}>{descricaoFalha.length}/10 caracteres mínimos</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btn, saving && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.btnText}>Salvando...</Text>
            </View>
          ) : <Text style={styles.btnText}>CRIAR SOLICITAÇÃO</Text>}
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
  textArea: { height: 120, textAlignVertical: 'top', paddingTop: 12 },
  charCount: { fontSize: 12, color: COLORS.textHint, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border },
  chipText: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, fontWeight: '600' },
  chipTextSelected: { color: '#FFF', fontWeight: '700' },
  optionItem: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.divider },
  optionText: { fontSize: SIZES.fontSM, color: COLORS.textPrimary },
  selectedTag: { backgroundColor: COLORS.successBg, padding: 10, borderRadius: 8, marginTop: 8 },
  classOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: SIZES.radiusSM, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 8 },
  classOptionSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  classLabel: { fontSize: SIZES.fontSM, fontWeight: '700', color: COLORS.textPrimary },
  classSla: { fontSize: 12, color: COLORS.textHint, marginTop: 2 },
  btn: { height: SIZES.buttonHeight, borderRadius: SIZES.radiusMD, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary, marginTop: 12 },
  btnText: { color: '#FFF', fontSize: SIZES.fontMD, fontWeight: '700' },
});
