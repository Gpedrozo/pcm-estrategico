// ============================================================
// ChecklistScreen — Execução de checklist preventivo
// ============================================================

import React, { useState, useEffect } from 'react';
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
import { addToSyncQueue } from '../lib/database';
import VoiceInput from '../components/VoiceInput';
import { COLORS, SIZES } from '../theme';
import { showSuccess, showError, showWarning } from '../lib/feedback';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Checklist'>;

interface CheckItem {
  id: string;
  descricao: string;
  critico: boolean;
  checked: boolean;
  observacao: string;
}

export default function ChecklistScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId, mecanicoId, mecanicoNome } = useAuth();
  const { osId, execucaoId, checklistData } = route.params;

  const [items, setItems] = useState<CheckItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (checklistData) {
      try {
        const parsed = JSON.parse(checklistData);
        const mapped: CheckItem[] = (Array.isArray(parsed) ? parsed : []).map((item: any, i: number) => ({
          id: item.id || `item-${i}`,
          descricao: item.descricao || item.description || `Item ${i + 1}`,
          critico: item.critico ?? item.critical ?? false,
          checked: false,
          observacao: '',
        }));
        setItems(mapped);
      } catch {
        setItems([]);
      }
    }
  }, [checklistData]);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const setObservacao = (id: string, text: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, observacao: text } : item))
    );
  };

  const criticosPendentes = items.filter((i) => i.critico && !i.checked);
  const totalChecked = items.filter((i) => i.checked).length;

  const handleSave = async () => {
    if (criticosPendentes.length > 0) {
      showWarning(
        `${criticosPendentes.length} item(ns) crítico(s) ainda não foram verificados. Complete todos antes de finalizar.`
      );
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        id: uuid.v4() as string,
        empresa_id: empresaId,
        os_id: osId,
        execucao_id: execucaoId,
        mecanico_id: mecanicoId,
        mecanico_nome: mecanicoNome,
        items: items.map((i) => ({
          id: i.id,
          descricao: i.descricao,
          critico: i.critico,
          checked: i.checked,
          observacao: i.observacao || null,
        })),
        completed_at: now,
      };

      await addToSyncQueue({
        id: uuid.v4() as string,
        table_name: 'checklist_execucoes',
        record_id: payload.id,
        operation: 'INSERT',
        payload,
      });

      showSuccess(`Checklist concluído! ${totalChecked}/${items.length} itens verificados.`, () => navigation.goBack());
    } catch (err: any) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>Nenhum checklist disponível para esta OS.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← VOLTAR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(totalChecked / items.length) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {totalChecked} / {items.length} verificados
        {criticosPendentes.length > 0 && ` — ⚠️ ${criticosPendentes.length} crítico(s) pendente(s)`}
      </Text>

      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item, idx) => (
          <View key={item.id} style={[styles.card, item.critico && styles.cardCritico]}>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => toggleItem(item.id)}
              activeOpacity={0.6}
            >
              <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                {item.checked && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemDesc, item.checked && styles.itemDescChecked]}>
                  {idx + 1}. {item.descricao}
                </Text>
                {item.critico && (
                  <Text style={styles.criticoBadge}>⚠️ CRÍTICO</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Observação inline */}
            <VoiceInput
              label=""
              value={item.observacao}
              onChangeText={(t) => setObservacao(item.id, t)}
              placeholder="Observação... (opcional)"
              numberOfLines={1}
            />
          </View>
        ))}
      </ScrollView>

      {/* Save */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            criticosPendentes.length > 0 && styles.saveButtonBlocked,
            saving && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>
            {saving ? '⏳ Salvando...' : criticosPendentes.length > 0 ? '⚠️ ITENS CRÍTICOS PENDENTES' : '✅  CONCLUIR CHECKLIST'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SIZES.paddingMD, paddingBottom: 120 },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.divider,
    borderRadius: 3,
    marginHorizontal: SIZES.paddingMD,
    marginTop: 12,
  },
  progressFill: {
    height: 6,
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  progressText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: 8,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    padding: 16,
    marginBottom: 12,
  },
  cardCritico: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.critical,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkbox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkMark: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  itemDesc: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  itemDescChecked: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  criticoBadge: {
    fontSize: SIZES.fontXS,
    color: COLORS.critical,
    fontWeight: '700',
    marginTop: 4,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: SIZES.paddingMD,
    paddingBottom: 32,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  saveButton: {
    height: SIZES.buttonHeightLG,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonBlocked: { backgroundColor: COLORS.disabled },
  saveButtonText: { fontSize: SIZES.fontLG, fontWeight: '800', color: '#FFF' },
  buttonDisabled: { opacity: 0.6 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: SIZES.fontMD, color: COLORS.textSecondary, textAlign: 'center' },
  backBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: SIZES.radiusSM,
    backgroundColor: COLORS.primary,
  },
  backBtnText: { color: '#FFF', fontSize: SIZES.fontMD, fontWeight: '700' },
});
