// ============================================================
// SolicitarServicoScreen — Mecânico cria Solicitação de Manutenção
// Usa tabela solicitacoes_manutencao (mesma do sistema web)
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import uuid from 'react-native-uuid';
import { useAuth } from '../contexts/AuthContext';
import { upsertSolicitacao, addToSyncQueue } from '../lib/database';
import EquipmentPicker from '../components/EquipmentPicker';
import VoiceInput from '../components/VoiceInput';
import { COLORS, SIZES } from '../theme';
import { showSuccess, showError, showWarning } from '../lib/feedback';
import type { RootStackParamList, Equipamento } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'SolicitarServico'>;

const IMPACTOS: { key: string; label: string; color: string }[] = [
  { key: 'BAIXO', label: 'Baixo', color: COLORS.success },
  { key: 'MEDIO', label: 'Médio', color: COLORS.warning },
  { key: 'ALTO', label: 'Alto', color: COLORS.critical },
];

const CLASSIFICACOES: { key: string; label: string; color: string; descricao: string }[] = [
  { key: 'PROGRAMAVEL', label: 'Programável', color: COLORS.success, descricao: 'Pode esperar' },
  { key: 'URGENTE', label: 'Urgente', color: COLORS.warning, descricao: 'Resolver em breve' },
  { key: 'EMERGENCIAL', label: 'Emergência', color: COLORS.critical, descricao: 'Parou produção' },
];

export default function SolicitarServicoScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId, mecanicoNome } = useAuth();
  const { equipamentoId: initialEqId, equipamentoNome: initialEqNome } = route.params || {};

  const [equipamentoNome, setEquipamentoNome] = useState(initialEqNome || '');
  const [equipamentoId, setEquipamentoId] = useState(initialEqId || '');
  const [tag, setTag] = useState('');
  const [impacto, setImpacto] = useState('MEDIO');
  const [classificacao, setClassificacao] = useState('PROGRAMAVEL');
  const [descricaoFalha, setDescricaoFalha] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEquipSelect = (eq: Equipamento | null, displayName: string) => {
    if (eq) {
      setEquipamentoId(eq.id);
      setEquipamentoNome(eq.nome);
      setTag(eq.qr_code || eq.nome);
    } else {
      setEquipamentoId('');
      setEquipamentoNome(displayName);
      setTag(displayName);
    }
  };

  const handleSave = async () => {
    if (!descricaoFalha.trim()) {
      showWarning('Descreva o problema / falha encontrada.');
      return;
    }
    if (!tag && !equipamentoNome.trim()) {
      showWarning('Informe o equipamento ou TAG.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const solicId = uuid.v4() as string;
      const tagFinal = tag || equipamentoNome.trim();

      const solicitacao = {
        id: solicId,
        empresa_id: empresaId || '',
        numero_solicitacao: null,
        equipamento_id: equipamentoId || null,
        tag: tagFinal,
        solicitante_nome: mecanicoNome || 'Mecânico (campo)',
        solicitante_setor: null,
        descricao_falha: descricaoFalha.trim(),
        impacto,
        classificacao,
        status: 'PENDENTE',
        os_id: null,
        observacoes: null,
        usuario_aprovacao: null,
        data_aprovacao: null,
        data_limite: null,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      };

      await upsertSolicitacao(solicitacao);
      await addToSyncQueue({
        id: uuid.v4() as string,
        table_name: 'solicitacoes_manutencao',
        record_id: solicId,
        operation: 'INSERT',
        payload: solicitacao,
      });

      // Reset form
      setEquipamentoNome('');
      setEquipamentoId('');
      setTag('');
      setImpacto('MEDIO');
      setClassificacao('PROGRAMAVEL');
      setDescricaoFalha('');

      showSuccess(
        'Solicitação registrada com sucesso!\nEla aparecerá como PENDENTE no sistema.',
        () => navigation.goBack(),
      );
    } catch (err: any) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📝 SOLICITAR MANUTENÇÃO</Text>
        <Text style={styles.headerSub}>Registrar problema para avaliação</Text>
      </View>

      {/* Equipamento / TAG */}
      <EquipmentPicker
        empresaId={empresaId || ''}
        value={equipamentoNome}
        equipamentoId={equipamentoId}
        onSelect={handleEquipSelect}
        label="Equipamento / TAG *"
      />

      <Text style={styles.sectionLabel}>Impacto na Produção</Text>
      <View style={styles.optionsRow}>
        {IMPACTOS.map((i) => (
          <TouchableOpacity
            key={i.key}
            style={[
              styles.optionBtn,
              { borderColor: i.color },
              impacto === i.key && { backgroundColor: i.color },
            ]}
            onPress={() => setImpacto(i.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionBtnText, { color: impacto === i.key ? '#FFF' : i.color }]}>
              {i.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Classificação / Urgência</Text>
      <View style={styles.classificacaoList}>
        {CLASSIFICACOES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[
              styles.classificacaoBtn,
              { borderColor: c.color },
              classificacao === c.key && { backgroundColor: c.color + '15', borderWidth: 2 },
            ]}
            onPress={() => setClassificacao(c.key)}
            activeOpacity={0.7}
          >
            <View style={styles.classificacaoContent}>
              <View style={[styles.radioOuter, { borderColor: c.color }]}>
                {classificacao === c.key && <View style={[styles.radioInner, { backgroundColor: c.color }]} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.classificacaoLabel, classificacao === c.key && { color: c.color, fontWeight: '800' }]}>
                  {c.label}
                </Text>
                <Text style={styles.classificacaoDesc}>{c.descricao}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <VoiceInput
        label="Descrição do problema / falha *"
        value={descricaoFalha}
        onChangeText={setDescricaoFalha}
        placeholder="Descreva o que está acontecendo com o equipamento..."
        multiline
        numberOfLines={5}
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.7}
      >
        <Text style={styles.saveButtonText}>
          {saving ? '⏳ Enviando...' : '📝  CRIAR SOLICITAÇÃO'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SIZES.paddingMD, paddingBottom: 40 },
  header: {
    backgroundColor: COLORS.infoBg, borderRadius: SIZES.radiusMD, padding: 16,
    marginBottom: 20, borderLeftWidth: 4, borderLeftColor: COLORS.info,
  },
  headerTitle: { fontSize: SIZES.fontLG, fontWeight: '800', color: COLORS.info },
  headerSub: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginTop: 4 },
  sectionLabel: { fontSize: SIZES.fontMD, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, marginTop: 8 },
  searchResults: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusSM, marginTop: -12,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  searchItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  searchItemText: { fontSize: SIZES.fontMD, fontWeight: '600', color: COLORS.textPrimary },
  searchItemSub: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginTop: 2 },
  optionsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  optionBtn: { flex: 1, height: 48, borderRadius: SIZES.radiusSM, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  optionBtnText: { fontSize: SIZES.fontSM, fontWeight: '700' },
  classificacaoList: { gap: 8, marginBottom: 20 },
  classificacaoBtn: { borderWidth: 1.5, borderRadius: SIZES.radiusMD, padding: 14, backgroundColor: COLORS.surface },
  classificacaoContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  classificacaoLabel: { fontSize: SIZES.fontMD, fontWeight: '600', color: COLORS.textPrimary },
  classificacaoDesc: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginTop: 2 },
  saveButton: {
    height: SIZES.buttonHeightLG, borderRadius: SIZES.radiusMD, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginTop: 12,
  },
  saveButtonText: { fontSize: SIZES.fontLG, fontWeight: '800', color: '#FFF' },
  buttonDisabled: { opacity: 0.6 },
});