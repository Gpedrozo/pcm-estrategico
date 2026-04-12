// ============================================================
// ExecutionScreen — Modo AUTO (finalizar atividade iniciada)
//                   Modo MANUAL (apontamento retroativo)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
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
import { writeAuditLog } from '../lib/audit';
import { logger } from '../lib/logger';
import {
  getOrdemServicoById,
  upsertExecucao,
  upsertOrdemServico,
  addToSyncQueue,
  getExecucoesByOS,
} from '../lib/database';
import { createAuthenticatedClient } from '../lib/supabase';
import { isOnline, getAccessToken } from '../lib/syncEngine';
import VoiceInput from '../components/VoiceInput';
import DateTimePickerField from '../components/DateTimePickerField';
import PhotoPicker from '../components/PhotoPicker';
import LoadingScreen from '../components/LoadingScreen';
import { COLORS, SIZES } from '../theme';
import { showSuccess, showError, showWarning } from '../lib/feedback';
import type { RootStackParamList, OrdemServico, ExecucaoOS } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Execution'>;

export default function ExecutionScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId, mecanicoId, mecanicoNome } = useAuth();
  const { osId, execucaoId, mode = 'manual' } = route.params;

  const isAutoMode = mode === 'auto' && !!execucaoId;

  const [os, setOS] = useState<OrdemServico | null>(null);
  const [execAberta, setExecAberta] = useState<ExecucaoOS | null>(null);
  const [servicoExecutado, setServicoExecutado] = useState('');
  const [causaRaiz, setCausaRaiz] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  // Campos só do modo manual
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const osData = await getOrdemServicoById(osId);
        setOS(osData);

        if (isAutoMode && execucaoId) {
          const execs = await getExecucoesByOS(osId);
          const exec = execs.find((e: any) => e.id === execucaoId);
          if (exec) setExecAberta(exec);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [osId, execucaoId, isAutoMode]);

  const handleSave = async () => {
    if (!servicoExecutado.trim()) {
      showWarning('Descreva o que foi feito.');
      return;
    }
    if (!isAutoMode && !horaInicio) {
      showWarning('Informe a hora de início.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const online = await isOnline();

      if (isAutoMode && execAberta) {
        // ── MODO AUTO: Finalizar execução existente ──
        const diff = new Date(now).getTime() - new Date(execAberta.hora_inicio!).getTime();
        const tempoMin = Math.max(1, Math.round(diff / 60000));

        // Tentar fechar via RPC atômica (mesma do sistema web)
        let rpcSuccess = false;
        if (online && os) {
          try {
            const token = await getAccessToken();
            if (!token) throw new Error('no access token');
            const db = createAuthenticatedClient(token);
            const inicioDate = new Date(execAberta.hora_inicio!);
            const fimDate = new Date(now);
            const { data: rpcResult, error: rpcError } = await db.rpc('close_os_with_execution_atomic', {
              p_os_id: osId,
              p_mecanico_id: mecanicoId || null,
              p_mecanico_nome: mecanicoNome || 'Mecânico',
              p_data_inicio: inicioDate.toISOString().split('T')[0],
              p_hora_inicio: `${inicioDate.getHours().toString().padStart(2, '0')}:${inicioDate.getMinutes().toString().padStart(2, '0')}`,
              p_data_fim: fimDate.toISOString().split('T')[0],
              p_hora_fim: `${fimDate.getHours().toString().padStart(2, '0')}:${fimDate.getMinutes().toString().padStart(2, '0')}`,
              p_tempo_execucao: tempoMin,
              p_servico_executado: servicoExecutado.trim(),
              p_custo_mao_obra: 0,
              p_custo_materiais: 0,
              p_custo_terceiros: 0,
              p_custo_total: 0,
              p_materiais: [],
              p_usuario_fechamento: mecanicoId || null,
              p_modo_falha: null,
              p_causa_raiz: causaRaiz.trim() || null,
              p_acao_corretiva: servicoExecutado.trim(),
              p_licoes_aprendidas: observacoes.trim() || null,
              p_pausas: [],
            });
            if (!rpcError && rpcResult) {
              rpcSuccess = true;
              // Atualizar local para refletir fechamento
              await upsertOrdemServico({ ...os, status: 'FECHADA', data_fechamento: now, updated_at: now });
              logger.info('exec', 'OS fechada via RPC atômica', { rpcResult });
            } else {
              console.warn('[exec] RPC falhou, usando fallback local:', rpcError?.message);
            }
          } catch (rpcErr) {
            console.warn('[exec] RPC exception, usando fallback local:', rpcErr);
          }
        }

        // Atualizar execução local
        const updated = {
          ...execAberta,
          hora_fim: now,
          tempo_execucao: tempoMin,
          servico_executado: servicoExecutado.trim(),
          causa: causaRaiz.trim() || null,
          observacoes: observacoes.trim() || null,
          fotos: photos.length > 0 ? photos : null,
          sync_status: rpcSuccess ? 'synced' : 'pending',
        };
        await upsertExecucao(updated);

        if (!rpcSuccess) {
          await addToSyncQueue({
            id: uuid.v4() as string,
            table_name: 'execucoes_os',
            record_id: execAberta.id,
            operation: 'UPDATE',
            payload: updated,
          });
        }

        // Upload fotos
        for (const photoUri of photos) {
          await addToSyncQueue({
            id: uuid.v4() as string,
            table_name: 'execucao_photos',
            record_id: execAberta.id,
            operation: 'UPLOAD',
            payload: { execucao_id: execAberta.id, uri: photoUri },
          });
        }

        Alert.alert(
          rpcSuccess ? '✅ OS Fechada!' : '✅ Atividade finalizada!',
          rpcSuccess ? `OS fechada com sucesso. Tempo: ${tempoMin} min` : `Tempo: ${tempoMin} minutos. Será sincronizado.`,
          [{ text: 'OK', onPress: () => {
            // Reset form
            setServicoExecutado(''); setCausaRaiz(''); setObservacoes(''); setPhotos([]);
            navigation.goBack();
          }}]
        );
        writeAuditLog({ action: 'CLOSE_OS_EXECUTION_AUTO_MOBILE', table: 'execucoes_os', recordId: execAberta.id, empresaId, source: 'ExecutionScreen', metadata: { os_id: osId, tempo_min: tempoMin, rpcSuccess } });
      } else {
        // ── MODO MANUAL: Criar novo apontamento ──
        const execId = uuid.v4() as string;
        let tempoExecucao: number | null = null;
        if (horaInicio && horaFim) {
          const diff = new Date(horaFim).getTime() - new Date(horaInicio).getTime();
          if (diff > 0) tempoExecucao = Math.round(diff / 60000);
        }

        // Tentar fechar via RPC atômica
        let rpcSuccess = false;
        if (online && os && horaInicio) {
          try {
            const token = await getAccessToken();
            if (!token) throw new Error('no access token');
            const db = createAuthenticatedClient(token);
            const inicioDate = new Date(horaInicio);
            const fimDate = horaFim ? new Date(horaFim) : new Date(now);
            const { data: rpcResult, error: rpcError } = await db.rpc('close_os_with_execution_atomic', {
              p_os_id: osId,
              p_mecanico_id: mecanicoId || null,
              p_mecanico_nome: mecanicoNome || 'Mecânico',
              p_data_inicio: inicioDate.toISOString().split('T')[0],
              p_hora_inicio: `${inicioDate.getHours().toString().padStart(2, '0')}:${inicioDate.getMinutes().toString().padStart(2, '0')}`,
              p_data_fim: fimDate.toISOString().split('T')[0],
              p_hora_fim: `${fimDate.getHours().toString().padStart(2, '0')}:${fimDate.getMinutes().toString().padStart(2, '0')}`,
              p_tempo_execucao: tempoExecucao || 1,
              p_servico_executado: servicoExecutado.trim(),
              p_custo_mao_obra: 0,
              p_custo_materiais: 0,
              p_custo_terceiros: 0,
              p_custo_total: 0,
              p_materiais: [],
              p_usuario_fechamento: mecanicoId || null,
              p_modo_falha: null,
              p_causa_raiz: causaRaiz.trim() || null,
              p_acao_corretiva: servicoExecutado.trim(),
              p_licoes_aprendidas: observacoes.trim() || null,
              p_pausas: [],
            });
            if (!rpcError && rpcResult) {
              rpcSuccess = true;
              await upsertOrdemServico({ ...os, status: 'FECHADA', data_fechamento: now, updated_at: now });
              logger.info('exec', 'OS fechada via RPC atômica (manual)', { rpcResult });
            }
          } catch { /* fallback to local */ }
        }

        const execucao = {
          id: execId,
          empresa_id: empresaId || '',
          os_id: osId,
          mecanico_id: mecanicoId || null,
          mecanico_nome: mecanicoNome || null,
          hora_inicio: horaInicio,
          hora_fim: horaFim || now,
          tempo_execucao: tempoExecucao,
          servico_executado: servicoExecutado.trim(),
          causa: causaRaiz.trim() || null,
          observacoes: observacoes.trim() || null,
          data_execucao: now,
          custo_mao_obra: null,
          custo_materiais: null,
          custo_total: null,
          created_at: now,
          sync_status: rpcSuccess ? 'synced' : 'pending',
        };

        await upsertExecucao(execucao);

        if (!rpcSuccess) {
          await addToSyncQueue({
            id: uuid.v4() as string,
            table_name: 'execucoes_os',
            record_id: execId,
            operation: 'INSERT',
            payload: execucao,
          });
        }

        for (const photoUri of photos) {
          await addToSyncQueue({
            id: uuid.v4() as string,
            table_name: 'execucao_photos',
            record_id: execId,
            operation: 'UPLOAD',
            payload: { execucao_id: execId, uri: photoUri },
          });
        }

        Alert.alert(
          rpcSuccess ? '✅ OS Fechada!' : '✅ Apontamento salvo!',
          rpcSuccess ? 'OS fechada com sucesso via sistema.' : 'Registro criado. Será sincronizado.',
          [{ text: 'OK', onPress: () => {
            // Reset form
            setServicoExecutado(''); setCausaRaiz(''); setObservacoes(''); setPhotos([]);
            setHoraInicio(''); setHoraFim('');
            navigation.goBack();
          }}],
        );
        writeAuditLog({ action: 'CLOSE_OS_EXECUTION_MANUAL_MOBILE', table: 'execucoes_os', recordId: execId, empresaId, source: 'ExecutionScreen', metadata: { os_id: osId, rpcSuccess } });
      }
    } catch (err: any) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen message="Carregando..." />;

  const formatTime = (iso?: string | null) => {
    if (!iso) return '--:--';
    try { const d = new Date(iso); return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`; }
    catch { return String(iso); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* OS reference */}
        {os && (
          <View style={styles.osRef}>
            <Text style={styles.osRefText}>
              {isAutoMode ? '✅ FINALIZAR ATIVIDADE' : '➕ APONTAMENTO MANUAL'}
            </Text>
            <Text style={styles.osRefSub}>OS {os.numero_os} — {os.equipamento || 'Equipamento'}</Text>
          </View>
        )}

        {/* Tempo info (modo auto) */}
        {isAutoMode && execAberta && (
          <View style={styles.timeInfo}>
            <Text style={styles.timeLabel}>⏱ Iniciado às {formatTime(execAberta.hora_inicio)}</Text>
            <Text style={styles.timeHint}>Hora de fim será registrada automaticamente</Text>
          </View>
        )}

        {/* Campos de hora (modo manual) */}
        {!isAutoMode && (
          <>
            <DateTimePickerField label="Hora Início *" value={horaInicio} onChange={setHoraInicio} />
            <DateTimePickerField label="Hora Fim" value={horaFim} onChange={setHoraFim} />
          </>
        )}

        {/* Serviço executado — COM VOZ */}
        <VoiceInput
          label="O que foi feito? *"
          value={servicoExecutado}
          onChangeText={setServicoExecutado}
          placeholder="Descreva o serviço realizado..."
          multiline
          numberOfLines={4}
        />

        {/* Causa raiz */}
        <VoiceInput
          label="Causa do problema"
          value={causaRaiz}
          onChangeText={setCausaRaiz}
          placeholder="Qual a causa? (opcional)"
          multiline
          numberOfLines={3}
        />

        {/* Observações */}
        <VoiceInput
          label="Observações"
          value={observacoes}
          onChangeText={setObservacoes}
          placeholder="Notas adicionais... (opcional)"
          multiline
          numberOfLines={3}
        />

        {/* Photos */}
        <PhotoPicker photos={photos} onPhotosChange={setPhotos} maxPhotos={5} />
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
            {saving ? '⏳ Salvando...' : isAutoMode ? '✅  FINALIZAR E SALVAR' : '💾  SALVAR APONTAMENTO'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SIZES.paddingMD, paddingBottom: 120 },
  osRef: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radiusMD,
    padding: 16,
    marginBottom: 16,
  },
  osRefText: { fontSize: SIZES.fontLG, fontWeight: '800', color: COLORS.primaryDark },
  osRefSub: { fontSize: SIZES.fontSM, color: COLORS.primaryDark, marginTop: 4, opacity: 0.8 },
  timeInfo: {
    backgroundColor: COLORS.successBg,
    borderRadius: SIZES.radiusMD,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  timeLabel: { fontSize: SIZES.fontMD, fontWeight: '700', color: COLORS.success },
  timeHint: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginTop: 4 },
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
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: { fontSize: SIZES.fontLG, fontWeight: '800', color: '#FFF' },
  buttonDisabled: { opacity: 0.6 },
});
