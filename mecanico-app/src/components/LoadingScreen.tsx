// ============================================================
// LoadingScreen — Full-screen loading indicator
// ============================================================

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../theme';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Carregando...' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 16,
  },
  text: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
