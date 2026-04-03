// ============================================================
// Theme — Design System para uso industrial
// Botões grandes, alto contraste, fonte grande, uso com luvas
// ============================================================

import { StyleSheet } from 'react-native';

export const COLORS = {
  // Primary
  primary: '#1A73E8',
  primaryDark: '#0D47A1',
  primaryLight: '#BBDEFB',

  // Status
  critical: '#D32F2F',
  criticalBg: '#FFEBEE',
  warning: '#F57C00',
  warningBg: '#FFF3E0',
  success: '#2E7D32',
  successBg: '#E8F5E9',
  info: '#1565C0',
  infoBg: '#E3F2FD',

  // Prioridade
  prioridadeAlta: '#D32F2F',
  prioridadeMedia: '#F57C00',
  prioridadeBaixa: '#2E7D32',
  prioridadeEmergencial: '#B71C1C',

  // Neutrals
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  textPrimary: '#212121',
  textSecondary: '#757575',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#FFFFFF',
  border: '#E0E0E0',
  divider: '#EEEEEE',
  disabled: '#BDBDBD',

  // Dark header
  headerBg: '#1A1A2E',
  headerText: '#FFFFFF',
};

export const SIZES = {
  // Fontes grandes para campo
  fontXS: 12,
  fontSM: 14,
  fontMD: 18,
  fontLG: 22,
  fontXL: 28,
  fontXXL: 34,

  // Espaçamentos
  paddingSM: 8,
  paddingMD: 16,
  paddingLG: 24,
  paddingXL: 32,

  // Botões grandes (uso com luva)
  buttonHeight: 60,
  buttonHeightLG: 72,
  inputHeight: 60,
  iconButton: 56,

  // Border radius
  radiusSM: 8,
  radiusMD: 12,
  radiusLG: 16,
  radiusXL: 24,

  // Card
  cardPadding: 20,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
};

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.cardPadding,
    marginHorizontal: SIZES.paddingMD,
    marginVertical: SIZES.paddingSM,
    ...SHADOWS.small,
  },
  button: {
    height: SIZES.buttonHeight,
    borderRadius: SIZES.radiusMD,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: SIZES.paddingLG,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSuccess: {
    backgroundColor: COLORS.success,
  },
  buttonDanger: {
    backgroundColor: COLORS.critical,
  },
  buttonText: {
    color: COLORS.textOnPrimary,
    fontSize: SIZES.fontLG,
    fontWeight: '700',
  },
  input: {
    height: SIZES.inputHeight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    paddingHorizontal: SIZES.paddingMD,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  textareaContainer: {
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.surface,
  },
  textarea: {
    flex: 1,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingSM,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export function prioridadeColor(p: string): string {
  switch (p) {
    case 'emergencial':
    case 'alta':
      return COLORS.prioridadeAlta;
    case 'media':
      return COLORS.prioridadeMedia;
    case 'baixa':
      return COLORS.prioridadeBaixa;
    default:
      return COLORS.textSecondary;
  }
}

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    solicitada: 'Solicitada',
    emitida: 'Emitida',
    em_execucao: 'Em Execução',
    pausada: 'Pausada',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
    aguardando_materiais: 'Aguardando Materiais',
  };
  return map[s] ?? s;
}

export function statusColor(s: string): string {
  switch (s) {
    case 'concluida':
      return COLORS.success;
    case 'cancelada':
      return COLORS.disabled;
    case 'em_execucao':
      return COLORS.primary;
    case 'pausada':
    case 'aguardando_materiais':
      return COLORS.warning;
    case 'solicitada':
    case 'emitida':
      return COLORS.critical;
    default:
      return COLORS.textSecondary;
  }
}