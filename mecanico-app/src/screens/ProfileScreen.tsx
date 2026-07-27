// ============================================================
// ProfileScreen — Informações do técnico e controle de dispositivo
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../theme';

const APP_VERSION = '1.0.2';

export default function ProfileScreen() {
  const { empresaNome, mecanicoNome, mecanicoCodigo, logout, unbindDevice } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleUnbind = async () => {
    Alert.alert(
      'Desvincular dispositivo',
      'Isso limpará o dispositivo e exigirá novo vínculo para usar o app. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, desvincular',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            await unbindDevice();
            setBusy(false);
          },
        },
      ],
    );
  };

  const handleLogout = async () => {
    setBusy(true);
    await logout();
    setBusy(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Seu perfil</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Empresa</Text>
          <Text style={styles.value}>{empresaNome || 'Não vinculado'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Técnico</Text>
          <Text style={styles.value}>{mecanicoNome || 'Não logado'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Código</Text>
          <Text style={styles.value}>{mecanicoCodigo || '---'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Versão do app</Text>
          <Text style={styles.value}>{APP_VERSION}</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.button, busy && styles.buttonDisabled]} onPress={handleLogout} disabled={busy} activeOpacity={0.7}>
        <Text style={styles.buttonText}>Sair</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.secondaryButton, busy && styles.buttonDisabled]} onPress={handleUnbind} disabled={busy} activeOpacity={0.7}>
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Desvincular dispositivo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SIZES.paddingMD, backgroundColor: COLORS.background },
  card: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMD, padding: SIZES.paddingMD, ...SHADOWS.small },
  title: { fontSize: SIZES.fontXL, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: COLORS.textSecondary, fontSize: SIZES.fontSM },
  value: { color: COLORS.textPrimary, fontSize: SIZES.fontMD, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  button: { backgroundColor: COLORS.primary, borderRadius: SIZES.radiusSM, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  secondaryButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  buttonText: { color: '#FFF', fontWeight: '700' },
  secondaryButtonText: { color: COLORS.textPrimary },
  buttonDisabled: { opacity: 0.6 },
});
