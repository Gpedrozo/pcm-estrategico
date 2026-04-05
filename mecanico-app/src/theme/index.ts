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

  // Status de O.S.
  statusAberta: '#1A73E8',
  statusEmAndamento: '#F57C00',
  statusFechada: '#2E7D32',
  statusCancelada: '#9E9E9E',

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
  textHint: '#9E9E9E',

  // Dark header
  headerBg: '#1A1A2E',
  headerText: '#FFFFFF',
};

// ============================================================
// SPACING — Tokens padronizados de espaçamento
// Usar SEMPRE estes tokens em vez de números hardcoded.
// ============================================================
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// ============================================================
// RADIUS — Tokens padronizados de border-radius
// ============================================================
export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

// ============================================================
// FONT — Tokens padronizados de tipografia
// ============================================================
export const FONT = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,
  hero: 34,
} as const;

export const SIZES = {
  // Fontes grandes para campo (legado — usar FONT para novos componentes)
  fontXS: 12,
  fontSM: 14,
  fontMD: 18,
  fontLG: 22,
  fontXL: 28,
  fontXXL: 34,

  // Espaçamentos (legado — usar SPACING para novos componentes)
  paddingSM: 8,
  paddingMD: 16,
  paddingLG: 24,
  paddingXL: 32,

  // Botões grandes (uso com luva)
  buttonHeight: 60,
  buttonHeightLG: 72,
  inputHeight: 60,
  iconButton: 56,

  buttonLG: 72,

  // Border radius (legado — usar RADIUS para novos componentes)
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
  inputContainer: {
    marginBottom: SIZES.paddingMD,
  },
  inputLabel: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    height: SIZES.inputHeight,
    borderRadius: SIZES.radiusMD,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.paddingMD,
    fontSize: SIZES.fontMD,
    backgroundColor: COLORS.surface,
  },
});
