// ============================================================
// RequisicaoMaterialScreen — Solicitar material do almoxarifado
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import uuid from 'react-native-uuid';
import { useAuth } from '../contexts/AuthContext';
import { getMateriais, upsertRequisicao, addToSyncQueue } from '../lib/database';
import VoiceInput from '../components/VoiceInput';
import { COLORS, SIZES } from '../theme';
import type { RootStackParamList, Material } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'RequisicaoMaterial'>;

export default function RequisicaoMaterialScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId, mecanicoId, mecanicoNome } = useAuth();
  const { osId } = route.params;

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [descricaoLivre, setDescricaoLivre] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [modoLivre, setModoLivre] = useState(false);

  useEffect(() => {
    (async () => {
      if (!empresaId) return;
      const mats = await getMateriais(empresaId);
      setMateriais(mats);
    })();
  }, [empresaId]);

  const filtered = search.length >= 2
    ? materiais.filter((m) =>
        m.descricao.toLowerCase().includes(search.toLowerCase()) ||
        (m.codigo && m.codigo.toLowerCase().includes(search.toLowerCase()))
      ).slice(0, 10)
    : [];

  const handleSave = async () => {
    if (!selectedMaterial && !descricaoLivre.trim()) {
      Alert.alert('Selecione um material', 'Busque no catálogo ou descreva o item.');
      return;
    }
    const qty = parseInt(quantidade, 10);
    if (!qty || qty < 1) {
      Alert.alert('Quantidade inválida', 'Informe a quantidade necessária.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const reqId = uuid.v4() as string;

      const requisicao = {
        id: reqId,
        empresa_id: empresaId || '',
        os_id: osId,
        mecanico_id: mecanicoId || null,
        mecanico_nome: mecanicoNome || null,
        material_id: selectedMaterial?.id || null,
        descricao_livre: selectedMaterial
          ? `${selectedMaterial.codigo || ''} - ${selectedMaterial.descricao}`
          : descricaoLivre.trim(),
        quantidade: qty,
        status: 'pendente' as const,
        observacao: observacao.trim() || null,
        created_at: now,
        sync_status: 'pending',
      };

      await upsertRequisicao(requisicao);
      await addToSyncQueue({
        id: uuid.v4() as string,
        table_name: 'requisicoes_material',
        record_id: reqId,
        operation: 'INSERT',
        payload: requisicao,
      });

      Alert.alert('✅ Material solicitado!', `${qty}x ${selectedMaterial?.descricao || descricaoLivre}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
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
        <Text style={styles.headerTitle}>📦 SOLICITAR MATERIAL</Text>
        <Text style={styles.headerSub}>OS vinculada — será enviado ao almoxarifado</Text>
      </View>

      {/* Toggle catálogo / livre */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !modoLivre && styles.toggleBtnActive]}
          onPress={() => { setModoLivre(false); setDescricaoLivre(''); }}
        >
          <Text style={[styles.toggleText, !modoLivre && styles.toggleTextActive]}>📋 Do Catálogo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, modoLivre && styles.toggleBtnActive]}
          onPress={() => { setModoLivre(true); setSelectedMaterial(null); setSearch(''); }}
        >
          <Text style={[styles.toggleText, modoLivre && styles.toggleTextActive]}>✏️ Descrição Livre</Text>
        </TouchableOpacity>
      </View>

      {!modoLivre ? (
        <>
          {/* Busca no catálogo */}
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar material por código ou descrição..."
            placeholderTextColor={COLORS.textHint}
            value={search}
            onChangeText={(t) => { setSearch(t); setSelectedMaterial(null); }}
          />
          {filtered.length > 0 && !selectedMaterial && (
            <View style={styles.resultsList}>
              {filtered.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.resultItem}
                  onPress={() => { setSelectedMaterial(m); setSearch(m.descricao); }}
                >
                  <Text style={styles.resultCode}>{m.codigo || '—'}</Text>
                  <Text style={styles.resultDesc}>{m.descricao}</Text>
                  {m.estoque_atual != null && (
                    <Text style={styles.resultEstoque}>Estoque: {m.estoque_atual} {m.unidade || 'un'}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {selectedMaterial && (
            <View style={styles.selectedCard}>
              <Text style={styles.selectedLabel}>Material selecionado:</Text>
              <Text style={styles.selectedName}>{selectedMaterial.codigo} — {selectedMaterial.descricao}</Text>
            </View>
          )}
        </>
      ) : (
        <VoiceInput
          label="Descreva o material *"
          value={descricaoLivre}
          onChangeText={setDescricaoLivre}
          placeholder="Ex: Rolamento 6205 2RS..."
          multiline
          numberOfLines={2}
        />
      )}

      {/* Quantidade */}
      <Text style={styles.label}>Quantidade *</Text>
      <View style={styles.qtyRow}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => setQuantidade(String(Math.max(1, parseInt(quantidade, 10) - 1 || 1)))}
        >
          <Text style={styles.qtyBtnText}>−</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.qtyInput}
          value={quantidade}
          onChangeText={setQuantidade}
          keyboardType="numeric"
          textAlign="center"
        />
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => setQuantidade(String((parseInt(quantidade, 10) || 0) + 1))}
        >
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Observação */}
      <VoiceInput
        label="Observação"
        value={observacao}
        onChangeText={setObservacao}
        placeholder="Obs: urgência, especificação... (opcional)"
        numberOfLines={2}
      />

      {/* Salvar */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.7}
      >
        <Text style={styles.saveButtonText}>
          {saving ? '⏳ Enviando...' : '📦  SOLICITAR MATERIAL'}
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
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn: {
    flex: 1,
    height: 48,
    borderRadius: SIZES.radiusSM,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  toggleText: { fontSize: SIZES.fontSM, fontWeight: '700', color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.primaryDark },
  searchInput: {
    height: SIZES.inputHeight,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    paddingHorizontal: 16,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  resultsList: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusSM,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  resultItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  resultCode: { fontSize: SIZES.fontXS, fontWeight: '700', color: COLORS.primary },
  resultDesc: { fontSize: SIZES.fontMD, fontWeight: '600', color: COLORS.textPrimary },
  resultEstoque: { fontSize: SIZES.fontXS, color: COLORS.textSecondary, marginTop: 2 },
  selectedCard: {
    backgroundColor: COLORS.successBg,
    borderRadius: SIZES.radiusMD,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  selectedLabel: { fontSize: SIZES.fontXS, color: COLORS.success, fontWeight: '600' },
  selectedName: { fontSize: SIZES.fontMD, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  label: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 8,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  qtyBtn: {
    width: 56,
    height: 56,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  qtyInput: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    fontSize: SIZES.fontXL,
    fontWeight: '800',
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveButton: {
    height: SIZES.buttonHeightLG,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.warning,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: { fontSize: SIZES.fontLG, fontWeight: '800', color: '#FFF' },
  buttonDisabled: { opacity: 0.6 },
});
