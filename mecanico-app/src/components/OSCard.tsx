// ============================================================
// OSCard — Card grande para lista de O.S.
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../theme';

const PRIORIDADE_COLORS: Record<string, string> = {
  emergencial: '#B71C1C',
  alta: '#D32F2F',
  media: '#F57C00',
  baixa: '#2E7D32',
};

const STATUS_LABELS: Record<string, string> = {
  aberta: 'ABERTA',
  solicitada: 'SOLICITADA',
  emitida: 'EMITIDA',
  em_andamento: 'EM ANDAMENTO',
  em_execucao: 'EXECUTANDO',
  programada: 'PROGRAMADA',
  concluida: 'CONCLUÍDA',
  cancelada: 'CANCELADA',
  pausada: 'PAUSADA',
  aguardando_materiais: 'AGUARD. MATERIAL',
  ABERTA: 'ABERTA',
  EM_ANDAMENTO: 'EM ANDAMENTO',
  AGUARDANDO_MATERIAL: 'AGUARD. MATERIAL',
  AGUARDANDO_APROVACAO: 'AGUARD. APROVAÇÃO',
  FECHADA: 'FECHADA',
};

const STATUS_COLORS: Record<string, string> = {
  aberta: '#D32F2F',
  solicitada: '#F57C00',
  emitida: '#F57C00',
  em_andamento: '#1565C0',
  em_execucao: '#1565C0',
  programada: '#F57C00',
  concluida: '#2E7D32',
  cancelada: '#757575',
  pausada: '#F57C00',
  aguardando_materiais: '#F57C00',
  ABERTA: '#D32F2F',
  EM_ANDAMENTO: '#1565C0',
  AGUARDANDO_MATERIAL: '#F57C00',
  AGUARDANDO_APROVACAO: '#F57C00',
  FECHADA: '#2E7D32',
};

interface OSCardProps {
  os: {
    id: string;
    numero_os: number;
    tipo?: string;
    prioridade: string;
    status: string;
    equipamento?: string;
    problema?: string;
    data_solicitacao?: string;
  };
  onPress: () => void;
  highlighted?: boolean;
}

export default function OSCard({ os, onPress, highlighted }: OSCardProps) {
  const prioColor = PRIORIDADE_COLORS[os.prioridade] || COLORS.textSecondary;
  const stColor = STATUS_COLORS[os.status] || COLORS.textSecondary;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderLeftColor: prioColor },
        highlighted && styles.cardHighlighted,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {highlighted && (
        <View style={styles.highlightBanner}>
          <Text style={styles.highlightText}>� ATRIBUÍDA A VOCÊ</Text>
        </View>
      )}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.osNumber}>OS #{os.numero_os}</Text>
          <View style={[styles.statusBadge, { backgroundColor: stColor + '20' }]}>
            <Text style={[styles.statusText, { color: stColor }]}>
              {STATUS_LABELS[os.status] || os.status?.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={[styles.prioBadge, { backgroundColor: prioColor }]}>
          <Text style={styles.prioText}>
            {os.prioridade === 'emergencial' ? '🚨' : os.prioridade === 'alta' ? '🔴' : os.prioridade === 'media' ? '🟡' : '🟢'}
          </Text>
        </View>
      </View>

      {os.equipamento ? (
        <Text style={styles.equipamento} numberOfLines={1}>
          🔧 {os.equipamento}
        </Text>
      ) : null}

      {os.problema ? (
        <Text style={styles.problema} numberOfLines={2}>
          {os.problema}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.tipo}>{os.tipo || 'Corretiva'}</Text>
        {os.data_solicitacao ? (
          <Text style={styles.data}>
            {formatDate(os.data_solicitacao)}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.cardPadding,
    marginHorizontal: SIZES.paddingMD,
    marginVertical: 6,
    borderLeftWidth: 5,
    ...SHADOWS.small,
  },
  cardHighlighted: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderLeftWidth: 5,
  },
  highlightBanner: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  osNumber: {
    fontSize: SIZES.fontLG,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: SIZES.fontXS,
    fontWeight: '700',
  },
  prioBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prioText: {
    fontSize: 18,
  },
  equipamento: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  problema: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipo: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  data: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
  },
});
