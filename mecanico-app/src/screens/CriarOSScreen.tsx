// ============================================================
// CriarOSScreen — Mecânico abre nova Ordem de Serviço
// Equipamento (dropdown com busca), descrição, prioridade
// Usa a mesma tabela ordens_servico do sistema web
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import uuid from 'react-native-uuid';
import { useAuth } from '../contexts/AuthContext';
import { upsertOrdemServico, addToSyncQueue } from '../lib/database';
import EquipmentPicker from '../components/EquipmentPicker';
import VoiceInput from '../components/VoiceInput';
import { COLORS, SIZES } from '../theme';
import type { RootStackParamList, Equipamento } from '../types';

const PRIORIDADES: { key: string; label: string; color: string; icon: string }[] = [
  { key: 'baixa', label: 'Baixa', color: COLORS.success, icon: '🟢' },
  { key: 'media', label: 'Média', color: COLORS.warning, icon: '🟡' },
  { key: 'alta', label: 'Alta', color: COLORS.critical, icon: '🔴' },
  { key: 'emergencial', label: 'Emergência', color: '#B71C1C', icon: '🚨' },
];

const TIPOS: { key: string; label: string }[] = [
  { key: 'Corretiva', label: '🔧 Corretiva' },
  { key: 'Preventiva', label: '🛡️ Preventiva' },
  { key: 'Preditiva', label: '📈 Preditiva' },
  { key: 'Lubrificacao', label: '🛢️ Lubrificação' },
  { key: 'Inspecao', label: '🔍 Inspeção' },
];

export default function CriarOSScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId, mecanicoNome } = useAuth();

  const [equipamentoId, setEquipamentoId] = useState('');
  const [equipamentoNome, setEquipamentoNome] = useState('');
  const [tag, setTag] = useState('');
  const [problema, setProblema] = useState('');
  const [prioridade, setPrioridade] = useState('media');
  const [tipo, setTipo] = useState('Corretiva');
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
    if (!equipamentoNome.trim() && !tag.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o equipamento.');
      return;
    }
    if (!problema.trim()) {
      Alert.alert('Campo obrigatório', 'Descreva o problema.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const osId = uuid.v4() as string;

      const os = {
        id: osId,
        empresa_id: empresaId || '',
        numero_os: null, // servidor gera o número
        tipo,
        prioridade,
        status: 'aberta',
        tag: tag || equipamentoNome.trim(),
        equipamento: equipamentoNome.trim() || tag,
        problema: problema.trim(),
        solicitante: mecanicoNome || 'Mecânico (campo)',
        data_solicitacao: now,
        data_fechamento: null,
        tempo_estimado: null,
        created_at: now,
        updated_at: now,
      };

      await upsertOrdemServico(os);
      await addToSyncQueue({
        id: uuid.v4() as string,
        table_name: 'ordens_servico',
        record_id: osId,
        operation: 'INSERT',
        payload: os,
      });

      Alert.alert(
        '✅ OS Criada!',
        'A ordem de serviço foi registrada e será sincronizada.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>➕ ABRIR ORDEM DE SERVIÇO</Text>
        <Text style={styles.headerSub}>Criar nova OS para manutenção</Text>
      </View>

      {/* Equipamento com EquipmentPicker */}
      <EquipmentPicker
        empresaId={empresaId || ''}
        value={equipamentoNome}
        equipamentoId={equipamentoId}
        onSelect={handleEquipSelect}
        label="Equipamento / TAG *"
      />

      {/* Tipo de manutenção */}
      <Text style={styles.sectionLabel}>Tipo de Manutenção</Text>
      <View style={styles.tiposGrid}>
        {TIPOS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tipoBtn, tipo === t.key && styles.tipoBtnActive]}
            onPress={() => setTipo(t.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tipoBtnText, tipo === t.key && styles.tipoBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Prioridade */}
      <Text style={styles.sectionLabel}>Prioridade</Text>
      <View style={styles.prioridadeRow}>
        {PRIORIDADES.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[
              styles.prioridadeBtn,
              { borderColor: p.color },
              prioridade === p.key && { backgroundColor: p.color },
            ]}
            onPress={() => setPrioridade(p.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.prioridadeIcon}>{p.icon}</Text>
            <Text style={[
              styles.prioridadeText,
              { color: prioridade === p.key ? '#FFF' : p.color },
            ]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Descrição do problema */}
      <VoiceInput
        label="Descrição do problema *"
        value={problema}
        onChangeText={setProblema}
        placeholder="Descreva o que está acontecendo..."
        multiline
        numberOfLines={5}
      />

      {/* Botão Salvar */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.7}
      >
        <Text style={styles.saveButtonText}>
          {saving ? '⏳ Criando...' : '📋  ABRIR ORDEM DE SERVIÇO'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SIZES.paddingMD, paddingBottom: 40 },
  header: {
    backgroundColor: COLORS.successBg,
    borderRadius: SIZES.radiusMD,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  headerTitle: { fontSize: SIZES.fontLG, fontWeight: '800', color: COLORS.success },
  headerSub: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginTop: 4 },
  sectionLabel: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  tiposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tipoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: SIZES.radiusSM,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tipoBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  tipoBtnText: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tipoBtnTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  prioridadeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  prioridadeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SIZES.radiusSM,
    borderWidth: 2,
    alignItems: 'center',
  },
  prioridadeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  prioridadeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    height: SIZES.buttonHeightLG,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    fontSize: SIZES.fontLG,
    fontWeight: '800',
    color: '#FFF',
  },
  buttonDisabled: { opacity: 0.6 },
});