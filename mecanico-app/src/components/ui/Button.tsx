// ============================================================
// Button — Componente padronizado de botão
// Variantes: primary | success | danger | ghost | outline
// Suporta loading state e disabled automático
// ============================================================

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, SIZES, SPACING, RADIUS } from '../../theme';

type ButtonVariant = 'primary' | 'success' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: COLORS.primary, text: COLORS.textOnPrimary },
  success: { bg: COLORS.success, text: COLORS.textOnPrimary },
  danger: { bg: COLORS.critical, text: COLORS.textOnPrimary },
  ghost: { bg: 'transparent', text: COLORS.primary },
  outline: { bg: 'transparent', text: COLORS.primary, border: COLORS.primary },
};

const SIZE_STYLES: Record<ButtonSize, { height: number; fontSize: number; px: number }> = {
  sm: { height: 44, fontSize: SIZES.fontSM, px: SPACING.lg },
  md: { height: SIZES.buttonHeight, fontSize: SIZES.fontMD, px: SPACING.xl },
  lg: { height: SIZES.buttonHeightLG, fontSize: SIZES.fontLG, px: SPACING.xxl },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        {
          backgroundColor: isDisabled ? COLORS.disabled : v.bg,
          height: s.height,
          paddingHorizontal: s.px,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: isDisabled ? COLORS.disabled : v.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' || variant === 'outline' ? COLORS.primary : COLORS.textOnPrimary}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                fontSize: s.fontSize,
                color: isDisabled
                  ? (variant === 'ghost' || variant === 'outline' ? COLORS.disabled : COLORS.textOnPrimary)
                  : v.text,
                marginLeft: icon ? SPACING.sm : 0,
              },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '700',
  },
});
