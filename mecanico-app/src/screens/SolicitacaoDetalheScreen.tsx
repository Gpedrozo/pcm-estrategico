// ============================================================
// SolicitacaoDetalheScreen v2.0 — Detalhe + ações
// ============================================================

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../theme';
import type { SolicitacaoManutencao, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'SolicitacaoDetalhe'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDENTE: { bg: COLORS.warningBg, text: COLORS.warning },
  APROVADA: { bg: COLORS.successBg, text: COLORS.success },
  CONVERTIDA: { bg: COLORS.infoBg, text: COLORS.info },
  REJEITADA: { bg: COLORS.criticalBg, text: COLORS.critical },
  CANCELADA: { bg: '#F5F5F5', text: COLORS.textHint },
};

export default function SolicitacaoDetalheScreen() {
  const route = useRoute<Route>();
  const nav = useNavigation<Nav>();
  const { empresaId } = useAuth();
  const s = route.params.solicitacao;
  const sc = STATUS_COLORS[s.status] || STATUS_COLORS.CANCELADA;

  const formatDate = (d?: string) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleString('pt-BR'); } catch { return d; }
  };

  const updateStatus = async (newStatus: string) => {
    Alert.alert(
      'Confirmar',
      `Alterar status para ${newStatus}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            const { error } = await supabase
              .from('solicitacoes_manutencao')
              .update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq('id', s.id);

            if (error) {
              Alert.alert('Erro', error.message);
            } else {
              Alert.alert('Sucesso', `Status atualizado para ${newStatus}`);
              nav.goBack();
            }
          },
        },
      ],
    );
  };

  const convertToOS = () => {
    nav.navigate('CriarOS', { solicitacao: s });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          Solicitação #{String(s.numero_solicitacao || 0).padStart(4, '0')}
        </Text>
        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.badgeText, { color: sc.text }]}>{s.status}</Text>
        </View>
      </View>

      {/* Info card */}
      <View style={styles.card}>
        <InfoRow label="TAG / Equipamento" value={s.tag} />
        <InfoRow label="Solicitante" value={s.solicitante_nome || '-'} />
        {s.solicitante_setor && <InfoRow label="Setor" value={s.solicitante_setor} />}
        <InfoRow label="Impacto" value={s.impacto} />
        <InfoRow label="Classificação" value={s.classificacao} />
        {s.sla_horas && <InfoRow label="SLA" value={`${s.sla_horas} horas`} />}
        {s.data_limite && <InfoRow label="Prazo SLA" value={formatDate(s.data_limite)} />}
        <InfoRow label="Criada em" value={formatDate(s.created_at)} />
      </View>

      {/* Descrição da Falha */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Descrição da Falha</Text>
        <Text style={styles.descText}>{s.descricao_falha}</Text>
      </View>

      {s.observacoes && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <Text style={styles.descText}>{s.observacoes}</Text>
        </View>
      )}

      {/* Actions based on status */}
      {s.status === 'PENDENTE' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLORS.success }]}
            onPress={() => updateStatus('APROVADA')}
          >
            <Text style={styles.btnText}>APROVAR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLORS.critical }]}
            onPress={() => updateStatus('REJEITADA')}
          >
            <Text style={styles.btnText}>REJEITAR</Text>
          </TouchableOpacity>
        </View>
      )}

      {(s.status === 'PENDENTE' || s.status === 'APROVADA') && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: COLORS.primary }]}
          onPress={convertToOS}
        >
          <Text style={styles.btnText}>CONVERTER EM O.S.</Text>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: SIZES.fontLG, fontWeight: '800', color: COLORS.textPrimary },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD, padding: SIZES.paddingMD, marginBottom: 12, ...SHADOWS.small },
  sectionTitle: { fontSize: SIZES.fontSM, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  descText: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, lineHeight: 22 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.divider },
  infoLabel: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, fontWeight: '600' },
  infoValue: { fontSize: SIZES.fontSM, color: COLORS.textPrimary, fontWeight: '700', maxWidth: '55%', textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  btn: { flex: 1, height: SIZES.buttonHeight, borderRadius: SIZES.radiusMD, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  btnText: { color: '#FFF', fontSize: SIZES.fontMD, fontWeight: '700' },
});
