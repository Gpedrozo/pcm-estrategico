// ============================================================
// Input — Campo de texto padronizado com label e erro
// Uso: <Input label="Nome" value={v} onChangeText={set} error="obrigatório" />
// ============================================================

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { COLORS, SIZES, SPACING, RADIUS } from '../../theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function Input({
  label,
  error,
  required,
  disabled,
  ...rest
}: InputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        {...rest}
        editable={!disabled}
        style={[
          styles.input,
          error ? styles.inputError : null,
          disabled ? styles.inputDisabled : null,
        ]}
        placeholderTextColor={COLORS.textHint}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs + 2, // 6
  },
  required: {
    color: COLORS.critical,
  },
  input: {
    height: SIZES.inputHeight,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    fontSize: SIZES.fontMD,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: COLORS.critical,
  },
  inputDisabled: {
    backgroundColor: COLORS.divider,
    color: COLORS.textHint,
  },
  error: {
    fontSize: SIZES.fontXS,
    color: COLORS.critical,
    marginTop: SPACING.xs,
  },
});
