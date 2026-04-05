// ============================================================
// FormField — Wrapper genérico: label + children + erro
// Uso para componentes customizados (DatePicker, EquipmentPicker, etc.)
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, SPACING } from '../../theme';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export default function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
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
    marginBottom: SPACING.xs + 2,
  },
  required: {
    color: COLORS.critical,
  },
  error: {
    fontSize: SIZES.fontXS,
    color: COLORS.critical,
    marginTop: SPACING.xs,
  },
});
