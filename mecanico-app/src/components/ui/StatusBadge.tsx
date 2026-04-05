// ============================================================
// StatusBadge — Badge colorido de status padronizado
// Uso: <StatusBadge status="ABERTA" /> ou <StatusBadge status="FECHADA" size="sm" />
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT } from '../../theme';

type StatusKey =
  | 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO' | 'FECHADA' | 'CANCELADA'
  | 'PENDENTE' | 'CONVERTIDA' | 'CONCLUIDA' | 'REJEITADA'
  | 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAIXA';

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  ABERTA:        { bg: COLORS.infoBg,      text: COLORS.statusAberta,     label: 'Aberta' },
  EM_ANDAMENTO:  { bg: COLORS.warningBg,   text: COLORS.statusEmAndamento, label: 'Em Andamento' },
  AGUARDANDO:    { bg: COLORS.warningBg,   text: COLORS.warning,          label: 'Aguardando' },
  FECHADA:       { bg: COLORS.successBg,   text: COLORS.statusFechada,    label: 'Fechada' },
  CANCELADA:     { bg: '#F5F5F5',          text: COLORS.statusCancelada,  label: 'Cancelada' },
  PENDENTE:      { bg: COLORS.warningBg,   text: COLORS.warning,          label: 'Pendente' },
  CONVERTIDA:    { bg: COLORS.successBg,   text: COLORS.success,          label: 'Convertida' },
  CONCLUIDA:     { bg: COLORS.successBg,   text: COLORS.success,          label: 'Concluída' },
  REJEITADA:     { bg: COLORS.criticalBg,  text: COLORS.critical,         label: 'Rejeitada' },
  URGENTE:       { bg: COLORS.criticalBg,  text: COLORS.critical,         label: 'Urgente' },
  ALTA:          { bg: COLORS.criticalBg,  text: COLORS.prioridadeAlta,   label: 'Alta' },
  MEDIA:         { bg: COLORS.warningBg,   text: COLORS.prioridadeMedia,  label: 'Média' },
  BAIXA:         { bg: COLORS.successBg,   text: COLORS.prioridadeBaixa,  label: 'Baixa' },
};

const FALLBACK = { bg: COLORS.divider, text: COLORS.textSecondary, label: '' };

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  customLabel?: string;
}

export default function StatusBadge({ status, size = 'md', customLabel }: StatusBadgeProps) {
  const cfg = STATUS_MAP[status] || FALLBACK;
  const isSm = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, isSm && styles.badgeSm]}>
      <Text
        style={[
          styles.text,
          { color: cfg.text },
          isSm && styles.textSm,
        ]}
      >
        {customLabel || cfg.label || status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  text: {
    fontSize: FONT.sm,
    fontWeight: '700',
  },
  textSm: {
    fontSize: FONT.xs,
  },
});
