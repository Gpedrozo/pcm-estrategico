// ============================================================
// ParadaScreen — Registrar parada de equipamento
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
import { upsertParada, addToSyncQueue } from '../lib/database';
import VoiceInput from '../components/VoiceInput';
import { COLORS, SIZES } from '../theme';
import { showSuccess, showError, showWarning } from '../lib/feedback';
import type { RootStackParamList, TipoParada } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Parada'>;

const TIPOS: { key: TipoParada; label: string; icon: string }[] = [
  { key: 'mecanica', label: 'Mecânica', icon: '🔧' },
  { key: 'eletrica', label: 'Elétrica', icon: '⚡' },
  { key: 'operacional', label: 'Operacional', icon: '🏭' },
  { key: 'instrumentacao', label: 'Instrumentação', icon: '📊' },
];

export default function ParadaScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId, mecanicoId, mecanicoNome } = useAuth();
  const { osId, equipamentoId, equipamentoNome } = route.params;

  const [tipo, setTipo] = useState<TipoParada | null>(null);
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!tipo) {
      showWarning('Escolha o tipo de parada.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const paradaId = uuid.v4() as string;

      const parada = {
        id: paradaId,
        empresa_id: empresaId || '',
        equipamento_id: equipamentoId || null,
        os_id: osId,
        mecanico_id: mecanicoId || null,
        mecanico_nome: mecanicoNome || null,
        tipo,
        inicio: now,
        fim: null,
        observacao: observacao.trim() || null,
        created_at: now,
        sync_status: 'pending',
      };

      await upsertParada(parada);
      await addToSyncQueue({
        id: uuid.v4() as string,
        table_name: 'paradas_equipamento',
        record_id: paradaId,
        operation: 'INSERT',
        payload: parada,
      });

      // Reset form
      setTipo(null);
      setObservacao('');

      showSuccess('Parada registrada com sucesso! Início marcado agora.', () => navigation.goBack());
    } catch (err: any) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⏸ REGISTRAR PARADA</Text>
        {equipamentoNome && (
          <Text style={styles.headerSub}>{equipamentoNome}</Text>
        )}
      </View>

      {/* Tipo de parada */}
      <Text style={styles.sectionLabel}>Tipo de Parada *</Text>
      <View style={styles.tipoGrid}>
        {TIPOS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tipoCard, tipo === t.key && styles.tipoCardActive]}
            onPress={() => setTipo(t.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.tipoIcon}>{t.icon}</Text>
            <Text style={[styles.tipoLabel, tipo === t.key && styles.tipoLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Observação */}
      <VoiceInput
        label="Observação"
        value={observacao}
        onChangeText={setObservacao}
        placeholder="Descreva o motivo da parada... (opcional)"
        multiline
        numberOfLines={4}
      />

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ⏱ O início da parada será registrado como AGORA.{'\n'}
          O fim será registrado quando o equipamento voltar a operar.
        </Text>
      </View>

      {/* Botão salvar */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.7}
      >
        <Text style={styles.saveButtonText}>
          {saving ? '⏳ Salvando...' : '⏸  REGISTRAR PARADA'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SIZES.paddingMD, paddingBottom: 40 },
  header: {
    backgroundColor: COLORS.warningBg,
    borderRadius: SIZES.radiusMD,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  headerTitle: { fontSize: SIZES.fontLG, fontWeight: '800', color: COLORS.warning },
  headerSub: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginTop: 4 },
  sectionLabel: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  tipoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  tipoCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  tipoCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  tipoIcon: { fontSize: 32, marginBottom: 8 },
  tipoLabel: { fontSize: SIZES.fontMD, fontWeight: '700', color: COLORS.textPrimary },
  tipoLabelActive: { color: COLORS.primaryDark },
  infoBox: {
    backgroundColor: COLORS.infoBg,
    borderRadius: SIZES.radiusMD,
    padding: 14,
    marginTop: 12,
    marginBottom: 20,
  },
  infoText: { fontSize: SIZES.fontSM, color: COLORS.info, lineHeight: 20 },
  saveButton: {
    height: SIZES.buttonHeightLG,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: { fontSize: SIZES.fontLG, fontWeight: '800', color: '#FFF' },
  buttonDisabled: { opacity: 0.6 },
});
