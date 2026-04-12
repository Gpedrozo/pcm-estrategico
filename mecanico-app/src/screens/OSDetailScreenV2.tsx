// ============================================================
// OSDetailScreen v2.0 — Detalhe de uma OS + botão fechar
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../theme';
import type { OrdemServico, ExecucaoOS, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'OSDetail'>;

const STATUS_COLORS: Record<string, string> = {
  ABERTA: COLORS.success, EM_ANDAMENTO: COLORS.primary,
  AGUARDANDO_MATERIAL: COLORS.warning, FECHADA: '#666', CANCELADA: COLORS.critical,
};
const PRIO_COLORS: Record<string, string> = {
  URGENTE: '#B71C1C', ALTA: '#D32F2F', MEDIA: '#F57C00', BAIXA: '#2E7D32',
};

export default function OSDetailScreen() {
  const route = useRoute<Route>();
  const nav = useNavigation<Nav>();
  const { empresaId } = useAuth();
  const { osId } = route.params;

  const [os, setOS] = useState<OrdemServico | null>(null);
  const [execucoes, setExecucoes] = useState<ExecucaoOS[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [osId]);

  const loadData = async () => {
    setLoading(true);
    const [osRes, execRes] = await Promise.all([
      supabase.from('ordens_servico').select('*').eq('id', osId).eq('empresa_id', empresaId!).single(),
      supabase.from('execucoes_os').select('*').eq('os_id', osId).eq('empresa_id', empresaId!).order('created_at', { ascending: false }),
    ]);
    if (osRes.data) setOS(osRes.data);
    if (execRes.data) setExecucoes(execRes.data);
    setLoading(false);
  };

  const formatDate = (d?: string) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getFullYear()}`;
    } catch { return d; }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (!os) {
    return <View style={styles.centered}><Text>O.S. não encontrada</Text></View>;
  }

  const canClose = os.status !== 'FECHADA' && os.status !== 'CANCELADA';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header badges */}
      <View style={styles.headerRow}>
        <Text style={styles.osNumber}>O.S. {String(os.numero_os).padStart(4, '0')}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[os.status] || '#999' }]}>
          <Text style={styles.badgeText}>{os.status.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: PRIO_COLORS[os.prioridade] || '#999' }]}>
          <Text style={styles.badgeText}>{os.prioridade}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: COLORS.infoBg }]}>
          <Text style={[styles.badgeText, { color: COLORS.info }]}>{os.tipo}</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <InfoRow label="TAG" value={os.tag || 'Sem TAG'} />
        <InfoRow label="Equipamento" value={os.equipamento} />
        <InfoRow label="Solicitante" value={os.solicitante} />
        <InfoRow label="Data Solicitação" value={formatDate(os.data_solicitacao)} />
        {os.tempo_estimado ? <InfoRow label="Tempo Estimado" value={`${os.tempo_estimado} min`} /> : null}
        {os.mecanico_responsavel_codigo ? (
          <InfoRow label="Mecânico Responsável" value={os.mecanico_responsavel_codigo} />
        ) : null}
      </View>

      {/* Problema */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Problema Apresentado</Text>
        <Text style={styles.problemaText}>{os.problema}</Text>
      </View>

      {/* Execuções (se FECHADA) */}
      {execucoes.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Execução</Text>
          {execucoes.map((exec) => (
            <View key={exec.id} style={styles.execItem}>
              <InfoRow label="Mecânico" value={exec.mecanico_nome || '-'} />
              <InfoRow label="Início" value={`${exec.data_inicio || ''} ${exec.hora_inicio || ''}`} />
              <InfoRow label="Fim" value={`${exec.data_fim || ''} ${exec.hora_fim || ''}`} />
              <InfoRow label="Tempo Líquido" value={exec.tempo_execucao_liquido ? `${exec.tempo_execucao_liquido} min` : '-'} />
              {exec.custo_total ? <InfoRow label="Custo Total" value={`R$ ${exec.custo_total.toFixed(2)}`} /> : null}
              {exec.servico_executado ? (
                <>
                  <Text style={styles.subLabel}>Serviço Executado:</Text>
                  <Text style={styles.execText}>{exec.servico_executado}</Text>
                </>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Close Button */}
      {canClose && (
        <TouchableOpacity
          style={[styles.btn, styles.btnSuccess]}
          onPress={() => nav.navigate('FecharOS', { osId: os.id })}
          activeOpacity={0.7}
        >
          <Text style={styles.btnText}>FECHAR O.S.</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  osNumber: { fontSize: SIZES.fontXL, fontWeight: '800', color: COLORS.textPrimary },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD, marginBottom: 12, ...SHADOWS.small,
  },
  sectionTitle: { fontSize: SIZES.fontMD, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  problemaText: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, lineHeight: 22 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: COLORS.divider },
  infoLabel: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, fontWeight: '600' },
  infoValue: { fontSize: SIZES.fontSM, color: COLORS.textPrimary, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  execItem: { borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 12, marginTop: 8 },
  subLabel: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, fontWeight: '600', marginTop: 8 },
  execText: { fontSize: SIZES.fontSM, color: COLORS.textPrimary, lineHeight: 22, marginTop: 4 },
  btn: {
    height: SIZES.buttonHeight, borderRadius: SIZES.radiusMD,
    justifyContent: 'center', alignItems: 'center', marginTop: 12,
  },
  btnSuccess: { backgroundColor: COLORS.success },
  btnText: { color: '#FFF', fontSize: SIZES.fontMD, fontWeight: '700' },
});
