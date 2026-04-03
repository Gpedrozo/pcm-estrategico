// ============================================================
// OSCard — Card grande para lista de O.S.
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SIZES, SHADOWS, prioridadeColor, statusLabel, statusColor } from '../theme';

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
}

export default function OSCard({ os, onPress }: OSCardProps) {
  const prioColor = prioridadeColor(os.prioridade);
  const stColor = statusColor(os.status);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: prioColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.osNumber}>OS #{os.numero_os}</Text>
          <View style={[styles.statusBadge, { backgroundColor: stColor + '20' }]}>
            <Text style={[styles.statusText, { color: stColor }]}>
              {statusLabel(os.status)}
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
