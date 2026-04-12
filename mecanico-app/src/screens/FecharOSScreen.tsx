// ============================================================
// FecharOSScreen v2.0 — Fechar OS (mesma lógica do web)
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { writeAuditLog } from '../lib/audit';
import { COLORS, SIZES, SHADOWS } from '../theme';
import { showSuccess, showError, showWarning } from '../lib/feedback';
import type { OrdemServico, Material, Mecanico, PausaExecucao, MaterialOS, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'FecharOS'>;

export default function FecharOSScreen() {
  const route = useRoute<Route>();
  const nav = useNavigation();
  const { empresaId, mecanicoId, mecanicoNome } = useAuth();
  const { osId } = route.params;

  const [os, setOS] = useState<OrdemServico | null>(null);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [mecanicoExecId, setMecanicoExecId] = useState(mecanicoId || '');
  const [mecanicoExecNome, setMecanicoExecNome] = useState(mecanicoNome || '');
  const [dataInicio, setDataInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [servicoExecutado, setServicoExecutado] = useState('');
  const [custoTerceiros, setCustoTerceiros] = useState('');

  // Pausas
  const [tevePausas, setTevePausas] = useState(false);
  const [pausas, setPausas] = useState<PausaExecucao[]>([]);
  const [pausaForm, setPausaForm] = useState({ data_inicio: '', hora_inicio: '', data_fim: '', hora_fim: '', motivo: 'Intervalo' });

  // Materiais
  const [materiaisUsados, setMateriaisUsados] = useState<(MaterialOS & { descricao: string })[]>([]);

  useEffect(() => {
    loadData();
    // Default dates to today
    const now = new Date();
    const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setDataFim(today);
    setHoraFim(time);
  }, []);

  const loadData = async () => {
    if (!empresaId) return;
    const [osRes, mecRes, matRes] = await Promise.all([
      supabase.from('ordens_servico').select('*').eq('id', osId).eq('empresa_id', empresaId).single(),
      supabase.from('mecanicos').select('*').eq('empresa_id', empresaId).eq('ativo', true).is('deleted_at', null),
      supabase.from('materiais').select('*').eq('empresa_id', empresaId),
    ]);
    if (osRes.data) setOS(osRes.data);
    if (mecRes.data) setMecanicos(mecRes.data);
    if (matRes.data) setMateriais(matRes.data);
    setLoading(false);
  };

  const calcTempos = () => {
    if (!dataInicio || !horaInicio || !dataFim || !horaFim) return { bruto: 0, pausasMin: 0, liquido: 0 };
    const inicio = new Date(`${dataInicio}T${horaInicio}`);
    const fim = new Date(`${dataFim}T${horaFim}`);
    const bruto = Math.round((fim.getTime() - inicio.getTime()) / 60000);

    let pausasMin = 0;
    for (const p of pausas) {
      const pI = new Date(`${p.data_inicio}T${p.hora_inicio}`);
      const pF = new Date(`${p.data_fim}T${p.hora_fim}`);
      pausasMin += Math.round((pF.getTime() - pI.getTime()) / 60000);
    }

    return { bruto: Math.max(0, bruto), pausasMin, liquido: Math.max(0, bruto - pausasMin) };
  };

  const addPausa = () => {
    const { data_inicio, hora_inicio, data_fim, hora_fim, motivo } = pausaForm;
    if (!data_inicio || !hora_inicio || !data_fim || !hora_fim) {
      showWarning('Preencha todos os campos da pausa');
      return;
    }
    setPausas([...pausas, { data_inicio, hora_inicio, data_fim, hora_fim, motivo: motivo || 'Intervalo' }]);
    setPausaForm({ data_inicio: '', hora_inicio: '', data_fim: '', hora_fim: '', motivo: 'Intervalo' });
  };

  const addMaterial = (mat: Material, qty: number) => {
    const custo = mat.custo_unitario || 0;
    setMateriaisUsados([...materiaisUsados, {
      material_id: mat.id, quantidade: qty, custo_unitario: custo,
      custo_total: custo * qty, descricao: mat.descricao,
    }]);
  };

  const handleClose = async () => {
    // Validations
    if (!dataInicio || !horaInicio) { showWarning('Informe data/hora de início'); return; }
    if (!dataFim || !horaFim) { showWarning('Informe data/hora de fim'); return; }
    if (servicoExecutado.length < 20) { showWarning('Descreva o serviço executado (mín. 20 caracteres)'); return; }

    const inicio = new Date(`${dataInicio}T${horaInicio}`);
    const fim = new Date(`${dataFim}T${horaFim}`);
    if (fim <= inicio) { showWarning('Data/hora fim deve ser posterior ao início'); return; }

    setSaving(true);

    const { bruto, pausasMin, liquido } = calcTempos();
    const mecExec = mecanicos.find((m) => m.id === mecanicoExecId);
    const custoMaoObra = mecExec?.custo_hora ? (liquido / 60) * mecExec.custo_hora : 0;
    const custoMat = materiaisUsados.reduce((s, m) => s + m.custo_total, 0);
    const custoTerc = parseFloat(custoTerceiros) || 0;
    const custoTotal = custoMaoObra + custoMat + custoTerc;

    // Build serviço with pausas summary
    let servicoFinal = servicoExecutado;
    if (pausas.length > 0) {
      const pausasSummary = pausas.map((p) => `${p.hora_inicio}-${p.hora_fim} (${p.motivo})`).join(', ');
      servicoFinal += `\n\n[Pausas apontadas] ${pausasSummary}. Total pausas: ${pausasMin} min. Tempo bruto: ${bruto} min. Tempo líquido: ${liquido} min.`;
    }

    try {
      // Try atomic RPC first
      const { error: rpcError } = await supabase.rpc('close_os_with_execution_atomic', {
        p_os_id: osId,
        p_mecanico_id: mecanicoExecId || null,
        p_mecanico_nome: mecanicoExecNome || 'Não informado',
        p_data_inicio: dataInicio,
        p_hora_inicio: horaInicio,
        p_data_fim: dataFim,
        p_hora_fim: horaFim,
        p_tempo_execucao: bruto,
        p_tempo_execucao_bruto: bruto,
        p_tempo_pausas: pausasMin,
        p_tempo_execucao_liquido: liquido,
        p_servico_executado: servicoFinal,
        p_custo_mao_obra: custoMaoObra,
        p_custo_materiais: custoMat,
        p_custo_terceiros: custoTerc,
        p_custo_total: custoTotal,
        p_materiais: materiaisUsados.map(({ material_id, quantidade, custo_unitario, custo_total }) => ({
          material_id, quantidade, custo_unitario, custo_total,
        })),
        p_pausas: pausas,
        p_usuario_fechamento: mecanicoExecId || null,
        p_empresa_id: empresaId,
      });

      if (rpcError) {
        console.warn('RPC fallback:', rpcError.message);
        // Fallback: manual insert + update
        await supabase.from('execucoes_os').insert({
          os_id: osId, empresa_id: empresaId,
          mecanico_id: mecanicoExecId || null, mecanico_nome: mecanicoExecNome || 'Não informado',
          data_inicio: dataInicio, hora_inicio: horaInicio,
          data_fim: dataFim, hora_fim: horaFim,
          tempo_execucao: bruto, tempo_execucao_bruto: bruto,
          tempo_pausas: pausasMin, tempo_execucao_liquido: liquido,
          servico_executado: servicoFinal,
          custo_mao_obra: custoMaoObra, custo_materiais: custoMat,
          custo_terceiros: custoTerc, custo_total: custoTotal,
        });

        if (materiaisUsados.length > 0) {
          await supabase.from('materiais_os').insert(
            materiaisUsados.map((m) => ({
              os_id: osId, empresa_id: empresaId,
              material_id: m.material_id, quantidade: m.quantidade,
              custo_unitario: m.custo_unitario,
            })),
          );
        }

        await supabase.from('ordens_servico').update({
          status: 'FECHADA', data_fechamento: new Date().toISOString(),
          usuario_fechamento: mecanicoExecId || null,
        }).eq('id', osId);
      }

      // Reset form state
      setServicoExecutado('');
      setCustoTerceiros('');
      setTevePausas(false);
      setPausas([]);
      setMateriaisUsados([]);

      showSuccess(`O.S. #${String(os?.numero_os).padStart(4, '0')} fechada com sucesso!`, () => nav.goBack());
      writeAuditLog({ action: 'CLOSE_OS_MOBILE', table: 'ordens_servico', recordId: osId, empresaId, source: 'FecharOSScreen', severity: 'info', metadata: { numero_os: os?.numero_os, custo_total: custoTotal } });
    } catch (err: any) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const { bruto, pausasMin, liquido } = calcTempos();
  const mecExec = mecanicos.find((m) => m.id === mecanicoExecId);
  const custoMaoObra = mecExec?.custo_hora ? (liquido / 60) * mecExec.custo_hora : 0;
  const custoMat = materiaisUsados.reduce((s, m) => s + m.custo_total, 0);
  const custoTerc = parseFloat(custoTerceiros) || 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>
          Fechar O.S. {os ? `#${String(os.numero_os).padStart(4, '0')}` : ''}
        </Text>
        {os && <Text style={styles.subtitle}>{os.tag} — {os.equipamento}</Text>}

        {/* Mecânico executor */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mecânico Executor</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {mecanicos.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.chip, mecanicoExecId === m.id && styles.chipSelected]}
                onPress={() => { setMecanicoExecId(m.id); setMecanicoExecNome(m.nome); }}
              >
                <Text style={[styles.chipText, mecanicoExecId === m.id && styles.chipTextSelected]}>
                  {m.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Data/Hora */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Período de Execução</Text>
          <View style={styles.row}>
            <Field label="Data Início" value={dataInicio} onChange={setDataInicio} placeholder="YYYY-MM-DD" flex={1} />
            <View style={{ width: 12 }} />
            <Field label="Hora Início" value={horaInicio} onChange={setHoraInicio} placeholder="HH:MM" flex={1} />
          </View>
          <View style={styles.row}>
            <Field label="Data Fim" value={dataFim} onChange={setDataFim} placeholder="YYYY-MM-DD" flex={1} />
            <View style={{ width: 12 }} />
            <Field label="Hora Fim" value={horaFim} onChange={setHoraFim} placeholder="HH:MM" flex={1} />
          </View>

          {bruto > 0 && (
            <View style={styles.tempoBox}>
              <Text style={styles.tempoLabel}>Tempo bruto: {bruto} min | Pausas: {pausasMin} min | Líquido: {liquido} min</Text>
            </View>
          )}
        </View>

        {/* Serviço Executado */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Serviço Executado *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={5}
            placeholder="Descreva ações, ajustes, testes e resultado final (mín. 20 caracteres)"
            value={servicoExecutado}
            onChangeText={setServicoExecutado}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{servicoExecutado.length}/20 caracteres mínimos</Text>
        </View>

        {/* Pausas */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.sectionTitle}>Teve pausas?</Text>
            <Switch value={tevePausas} onValueChange={setTevePausas} trackColor={{ true: COLORS.primary }} />
          </View>
          {tevePausas && (
            <>
              {pausas.map((p, i) => (
                <View key={i} style={styles.pausaItem}>
                  <Text style={styles.pausaText}>
                    {p.hora_inicio} - {p.hora_fim} ({p.motivo})
                  </Text>
                  <TouchableOpacity onPress={() => setPausas(pausas.filter((_, j) => j !== i))}>
                    <Text style={{ color: COLORS.critical, fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.row}>
                <Field label="Início" value={pausaForm.hora_inicio} onChange={(v) => setPausaForm({ ...pausaForm, hora_inicio: v, data_inicio: dataInicio })} placeholder="HH:MM" flex={1} />
                <View style={{ width: 8 }} />
                <Field label="Fim" value={pausaForm.hora_fim} onChange={(v) => setPausaForm({ ...pausaForm, hora_fim: v, data_fim: dataFim })} placeholder="HH:MM" flex={1} />
              </View>
              <Field label="Motivo" value={pausaForm.motivo} onChange={(v) => setPausaForm({ ...pausaForm, motivo: v })} placeholder="Intervalo" />
              <TouchableOpacity style={[styles.btnSm, { backgroundColor: COLORS.info }]} onPress={addPausa}>
                <Text style={styles.btnSmText}>+ Adicionar Pausa</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Materiais */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Materiais Utilizados</Text>
          {materiaisUsados.map((m, i) => (
            <View key={i} style={styles.matItem}>
              <Text style={styles.matText}>{m.descricao} — Qtd: {m.quantidade}</Text>
              <TouchableOpacity onPress={() => setMateriaisUsados(materiaisUsados.filter((_, j) => j !== i))}>
                <Text style={{ color: COLORS.critical, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {materiais.length > 0 && <MaterialAdder materiais={materiais} onAdd={addMaterial} />}
        </View>

        {/* Custo Terceiros */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Custo Terceiros (R$)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="0,00"
            value={custoTerceiros}
            onChangeText={setCustoTerceiros}
          />
        </View>

        {/* Resumo de Custos */}
        <View style={[styles.card, { backgroundColor: COLORS.infoBg }]}>
          <Text style={styles.sectionTitle}>Resumo de Custos</Text>
          <InfoRow label="Mão de Obra" value={`R$ ${custoMaoObra.toFixed(2)}`} />
          <InfoRow label="Materiais" value={`R$ ${custoMat.toFixed(2)}`} />
          <InfoRow label="Terceiros" value={`R$ ${custoTerc.toFixed(2)}`} />
          <InfoRow label="TOTAL" value={`R$ ${(custoMaoObra + custoMat + custoTerc).toFixed(2)}`} bold />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btn, styles.btnSuccess, saving && { opacity: 0.6 }]}
          onPress={handleClose}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.btnText}>Fechando...</Text>
            </View>
          ) : <Text style={styles.btnText}>FECHAR O.S.</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Sub-components ──

function Field({ label, value, onChange, placeholder, flex, multiline }: any) {
  return (
    <View style={[styles.fieldGroup, flex ? { flex } : null]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        multiline={multiline}
      />
    </View>
  );
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, bold && { fontWeight: '800' }]}>{label}</Text>
      <Text style={[styles.infoValue, bold && { fontWeight: '800', fontSize: SIZES.fontMD }]}>{value}</Text>
    </View>
  );
}

function MaterialAdder({ materiais, onAdd }: { materiais: Material[]; onAdd: (m: Material, q: number) => void }) {
  const [search, setSearch] = useState('');
  const [qty, setQty] = useState('1');
  const [selectedId, setSelectedId] = useState('');

  const filtered = materiais.filter((m) =>
    !search.trim() ? false :
    (m.descricao || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.codigo || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    const mat = materiais.find((m) => m.id === selectedId);
    if (!mat) { showWarning('Selecione um material'); return; }
    const q = parseFloat(qty) || 0;
    if (q <= 0) { showWarning('Quantidade inválida'); return; }
    onAdd(mat, q);
    setSearch('');
    setQty('1');
    setSelectedId('');
  };

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="Buscar material (código ou descrição)"
        value={search}
        onChangeText={(v) => { setSearch(v); setSelectedId(''); }}
      />
      {filtered.slice(0, 5).map((m) => (
        <TouchableOpacity
          key={m.id}
          style={[styles.matOption, selectedId === m.id && { backgroundColor: COLORS.primaryLight }]}
          onPress={() => { setSelectedId(m.id); setSearch(m.descricao); }}
        >
          <Text style={styles.matOptText}>{m.codigo ? `${m.codigo} — ` : ''}{m.descricao}</Text>
        </TouchableOpacity>
      ))}
      {selectedId ? (
        <View style={[styles.row, { marginTop: 8 }]}>
          <View style={{ flex: 1 }}>
            <TextInput style={styles.input} keyboardType="numeric" value={qty} onChangeText={setQty} placeholder="Qtd" />
          </View>
          <View style={{ width: 8 }} />
          <TouchableOpacity style={[styles.btnSm, { backgroundColor: COLORS.success }]} onPress={handleAdd}>
            <Text style={styles.btnSmText}>+ Adicionar</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: SIZES.fontLG, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginBottom: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD, padding: SIZES.paddingMD, marginBottom: 12, ...SHADOWS.small },
  sectionTitle: { fontSize: SIZES.fontSM, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  input: { height: 48, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radiusSM, paddingHorizontal: 12, fontSize: SIZES.fontSM, backgroundColor: '#FAFAFA' },
  textArea: { height: 120, textAlignVertical: 'top', paddingTop: 12 },
  charCount: { fontSize: 12, color: COLORS.textHint, marginTop: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8 },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: SIZES.fontSM, color: COLORS.textSecondary },
  chipTextSelected: { color: '#FFF', fontWeight: '700' },
  pausaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.divider },
  pausaText: { fontSize: SIZES.fontSM, color: COLORS.textPrimary },
  matItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.divider },
  matText: { fontSize: SIZES.fontSM, color: COLORS.textPrimary, flex: 1 },
  matOption: { paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.divider },
  matOptText: { fontSize: SIZES.fontSM, color: COLORS.textPrimary },
  tempoBox: { backgroundColor: COLORS.infoBg, borderRadius: 8, padding: 10, marginTop: 8 },
  tempoLabel: { fontSize: 13, color: COLORS.info, fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: COLORS.divider },
  infoLabel: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, fontWeight: '600' },
  infoValue: { fontSize: SIZES.fontSM, color: COLORS.textPrimary, fontWeight: '600' },
  btn: { height: SIZES.buttonHeight, borderRadius: SIZES.radiusMD, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  btnSuccess: { backgroundColor: COLORS.success },
  btnText: { color: '#FFF', fontSize: SIZES.fontMD, fontWeight: '700' },
  btnSm: { height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  btnSmText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
