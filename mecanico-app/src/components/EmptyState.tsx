// ============================================================
// EmptyState — Friendly placeholder for empty lists
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon = '📋', title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.paddingLG,
    minHeight: 300,
  },
  icon: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
