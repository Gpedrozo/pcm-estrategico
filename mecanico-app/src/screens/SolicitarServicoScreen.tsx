// ============================================================
// SolicitarServicoScreen — Mecânico cria OS de campo
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
import { upsertOrdemServico, addToSyncQueue, searchEquipamentos } from '../lib/database';
import VoiceInput from '../components/VoiceInput';
import PhotoPicker from '../components/PhotoPicker';
import { COLORS, SIZES } from '../theme';
import type { RootStackParamList, OSPrioridade, Equipamento } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'SolicitarServico'>;

const PRIORIDADES: { key: OSPrioridade; label: string; color: string }[] = [
  { key: 'baixa', label: 'Normal', color: COLORS.success },
  { key: 'media', label: 'Média', color: COLORS.warning },
  { key: 'alta', label: 'Urgente', color: COLORS.critical },
  { key: 'emergencial', label: 'Emergência', color: COLORS.prioridadeEmergencial },
];

export default function SolicitarServicoScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId, mecanicoNome } = useAuth();
  const { equipamentoId: initialEqId, equipamentoNome: initialEqNome } = route.params || {};

  const [equipamentoNome, setEquipamentoNome] = useState(initialEqNome || '');
  const [equipamentoId, setEquipamentoId] = useState(initialEqId || '');
  const [searchResults, setSearchResults] = useState<Equipamento[]>([]);
  const [prioridade, setPrioridade] = useState<OSPrioridade>('baixa');
  const [descricao, setDescricao] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSearchEquipamento = async (text: string) => {
    setEquipamentoNome(text);
    setEquipamentoId('');
    if (text.length >= 2 && empresaId) {
      const results = await searchEquipamentos(empresaId, text);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const selectEquipamento = (eq: Equipamento) => {
    setEquipamentoId(eq.id);
    setEquipamentoNome(eq.nome);
    setSearchResults([]);
  };

  const handleSave = async () => {
    if (!descricao.trim()) {
      Alert.alert('Campo obrigatório', 'Descreva o problema encontrado.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const osId = uuid.v4() as string;

      const os = {
        id: osId,
        empresa_id: empresaId || '',
        numero_os: Date.now(), // Número temporário, servidor gera o definitivo
        tipo: 'Corretiva' as const,
        prioridade,
        status: 'solicitada' as const,
        equipamento: equipamentoNome.trim() || null,
        equipamento_id: equipamentoId || null,
        problema: descricao.trim(),
        solicitante: mecanicoNome || 'Mecânico (campo)',
        data_solicitacao: now,
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

      for (const photoUri of photos) {
        await addToSyncQueue({
          id: uuid.v4() as string,
          table_name: 'os_photos',
          record_id: osId,
          operation: 'UPLOAD',
          payload: { os_id: osId, uri: photoUri },
        });
      }

      Alert.alert(
        '✅ Solicitação criada!',
        'A OS foi criada e será sincronizada.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📝 SOLICITAR SERVIÇO</Text>
        <Text style={styles.headerSub}>Gerar nova OS a partir do campo</Text>
      </View>

      {/* Equipamento */}
      <VoiceInput
        label="Equipamento"
        value={equipamentoNome}
        onChangeText={handleSearchEquipamento}
        placeholder="Digite ou fale o nome / TAG..."
      />
      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          {searchResults.slice(0, 5).map((eq) => (
            <TouchableOpacity
              key={eq.id}
              style={styles.searchItem}
              onPress={() => selectEquipamento(eq)}
            >
              <Text style={styles.searchItemText}>{eq.nome}</Text>
              {eq.localizacao && (
                <Text style={styles.searchItemSub}>{eq.localizacao}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

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
            <Text
              style={[
                styles.prioridadeBtnText,
                { color: prioridade === p.key ? '#FFF' : p.color },
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Descrição do problema */}
      <VoiceInput
        label="Problema encontrado *"
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Descreva o problema observado..."
        multiline
        numberOfLines={5}
      />

      {/* Photos */}
      <PhotoPicker photos={photos} onPhotosChange={setPhotos} maxPhotos={3} />

      {/* Botão salvar */}
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
    backgroundColor: COLORS.infoBg,
    borderRadius: SIZES.radiusMD,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  headerTitle: { fontSize: SIZES.fontLG, fontWeight: '800', color: COLORS.info },
  headerSub: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginTop: 4 },
  sectionLabel: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  searchResults: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusSM,
    marginTop: -12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  searchItemText: { fontSize: SIZES.fontMD, fontWeight: '600', color: COLORS.textPrimary },
  searchItemSub: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginTop: 2 },
  prioridadeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  prioridadeBtn: {
    flex: 1,
    height: 48,
    borderRadius: SIZES.radiusSM,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prioridadeBtnText: { fontSize: SIZES.fontSM, fontWeight: '700' },
  saveButton: {
    height: SIZES.buttonHeightLG,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: { fontSize: SIZES.fontLG, fontWeight: '800', color: '#FFF' },
  buttonDisabled: { opacity: 0.6 },
});
