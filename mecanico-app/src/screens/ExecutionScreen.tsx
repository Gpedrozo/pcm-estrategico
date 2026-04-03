// ============================================================
// ExecutionScreen — Register work on an OS
// Flexible times, voice input, photos, auto-save
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import uuid from 'react-native-uuid';
import { useAuth } from '../contexts/AuthContext';
import {
  getOrdemServicoById,
  upsertExecucao,
  upsertOrdemServico,
  saveAutoSave,
  getAutoSave,
  clearAutoSave,
  addToSyncQueue,
} from '../lib/database';
import VoiceInput from '../components/VoiceInput';
import DateTimePickerField from '../components/DateTimePickerField';
import PhotoPicker from '../components/PhotoPicker';
import LoadingScreen from '../components/LoadingScreen';
import { COLORS, SIZES } from '../theme';
import type { RootStackParamList, OrdemServico } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Execution'>;

interface FormState {
  horaInicio: string;
  horaFim: string;
  servicoExecutado: string;
  causaRaiz: string;
  observacoes: string;
  photos: string[];
}

const EMPTY_FORM: FormState = {
  horaInicio: '',
  horaFim: '',
  servicoExecutado: '',
  causaRaiz: '',
  observacoes: '',
  photos: [],
};

export default function ExecutionScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId, mecanicoId, mecanicoNome } = useAuth();
  const { osId } = route.params;

  const [os, setOS] = useState<OrdemServico | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load OS + restore autosave
  useEffect(() => {
    (async () => {
      try {
        const osData = await getOrdemServicoById(osId);
        setOS(osData);
        const saved = await getAutoSave(osId);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as FormState;
            setForm(parsed);
          } catch { /* corrupt, ignore */ }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [osId]);

  // Auto-save every 15s
  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      saveAutoSave(osId, JSON.stringify(formRef.current)).catch(() => {});
    }, 15_000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
      // Final save on unmount
      saveAutoSave(osId, JSON.stringify(formRef.current)).catch(() => {});
    };
  }, [osId]);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    if (!form.servicoExecutado.trim()) {
      Alert.alert('Campo obrigatório', 'Descreva o serviço executado.');
      return;
    }
    if (!form.horaInicio) {
      Alert.alert('Campo obrigatório', 'Informe a hora de início.');
      return;
    }

    setSaving(true);
    try {
      const execId = uuid.v4() as string;
      const now = new Date().toISOString();

      // Calculate tempo_execucao in minutes
      let tempoExecucao: number | null = null;
      if (form.horaInicio && form.horaFim) {
        const diff = new Date(form.horaFim).getTime() - new Date(form.horaInicio).getTime();
        if (diff > 0) tempoExecucao = Math.round(diff / 60000);
      }

      const execucao = {
        id: execId,
        empresa_id: empresaId || '',
        os_id: osId,
        mecanico_id: mecanicoId || null,
        mecanico_nome: mecanicoNome || null,
        hora_inicio: form.horaInicio,
        hora_fim: form.horaFim || null,
        tempo_execucao: tempoExecucao,
        servico_executado: form.servicoExecutado.trim(),
        custo_mao_obra: null,
        custo_materiais: null,
        custo_total: null,
        data_execucao: now,
        created_at: now,
      };

      // Save to local DB
      await upsertExecucao(execucao);

      // Update OS status to em_andamento
      if (os && os.status === 'aberta') {
        const updatedOS = { ...os, status: 'em_andamento' as const, updated_at: now };
        await upsertOrdemServico(updatedOS);
      }

      // Queue for sync — execution
      await addToSyncQueue({
        id: uuid.v4() as string,
        table_name: 'execucoes_os',
        record_id: execId,
        operation: 'INSERT',
        payload: JSON.stringify(execucao),
        status: 'pending',
        created_at: now,
        attempts: 0,
      });

      // Queue photos for upload
      for (const photoUri of form.photos) {
        await addToSyncQueue({
          id: uuid.v4() as string,
          table_name: 'execucao_photos',
          record_id: execId,
          operation: 'UPLOAD',
          payload: JSON.stringify({ execucao_id: execId, uri: photoUri }),
          status: 'pending',
          created_at: now,
          attempts: 0,
        });
      }

      // Queue OS status update
      if (os && os.status === 'aberta') {
        await addToSyncQueue({
          id: uuid.v4() as string,
          table_name: 'ordens_servico',
          record_id: osId,
          operation: 'UPDATE',
          payload: JSON.stringify({ id: osId, status: 'em_andamento', updated_at: now }),
          status: 'pending',
          created_at: now,
          attempts: 0,
        });
      }

      // Clear autosave
      await clearAutoSave(osId);

      Alert.alert('✅ Serviço registrado!', 'A execução foi salva com sucesso.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err?.message || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen message="Carregando..." />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* OS reference */}
        {os && (
          <View style={styles.osRef}>
            <Text style={styles.osRefText}>OS {os.numero_os} — {os.equipamento || 'Equipamento'}</Text>
          </View>
        )}

        {/* Hora início */}
        <DateTimePickerField
          label="Hora Início *"
          value={form.horaInicio}
          onChange={(v) => updateField('horaInicio', v)}
        />

        {/* Hora fim */}
        <DateTimePickerField
          label="Hora Fim"
          value={form.horaFim}
          onChange={(v) => updateField('horaFim', v)}
        />

        {/* Serviço executado */}
        <VoiceInput
          label="Serviço Executado *"
          value={form.servicoExecutado}
          onChangeText={(v) => updateField('servicoExecutado', v)}
          placeholder="Descreva o serviço realizado..."
          multiline
          numberOfLines={4}
        />

        {/* Causa raiz */}
        <VoiceInput
          label="Causa Raiz"
          value={form.causaRaiz}
          onChangeText={(v) => updateField('causaRaiz', v)}
          placeholder="Qual a causa do problema? (opcional)"
          multiline
          numberOfLines={3}
        />

        {/* Observações */}
        <VoiceInput
          label="Observações"
          value={form.observacoes}
          onChangeText={(v) => updateField('observacoes', v)}
          placeholder="Notas adicionais... (opcional)"
          multiline
          numberOfLines={3}
        />

        {/* Photos */}
        <PhotoPicker
          photos={form.photos}
          onPhotosChange={(p) => updateField('photos', p)}
          maxPhotos={5}
        />
      </ScrollView>

      {/* Save bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Salvando...' : '💾  SALVAR EXECUÇÃO'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SIZES.paddingMD,
    paddingBottom: 120,
  },
  osRef: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: SIZES.radiusSM,
    padding: 10,
    marginBottom: 16,
  },
  osRefText: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SIZES.paddingMD,
    paddingBottom: 32,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  saveButton: {
    height: SIZES.buttonXL,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: SIZES.fontLG,
    fontWeight: '800',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
