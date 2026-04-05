// ============================================================
// LoginScreen v2.0 — Mecânico login (código + senha)
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../theme';

export default function LoginScreen() {
  const { login, empresaNome, unbindDevice } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!codigo.trim()) {
      Alert.alert('Atenção', 'Informe o código de acesso');
      return;
    }
    if (!senha.trim()) {
      Alert.alert('Atenção', 'Informe a senha');
      return;
    }

    setLoading(true);
    const result = await login(codigo.trim(), senha);
    setLoading(false);

    if (!result.ok) {
      Alert.alert('Erro', result.error || 'Código ou senha inválidos');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Text style={styles.appName}>PCM Mecânico</Text>
          {empresaNome ? (
            <Text style={styles.empresaNome}>{empresaNome}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Login do Mecânico</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Código de Acesso</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: MEC-001"
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="next"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite sua senha"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>ENTRAR</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.unbindBtn}
          onPress={() => {
            Alert.alert(
              'Desvincular Dispositivo',
              'Isso removerá a vinculação deste celular com a empresa. Deseja continuar?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Desvincular', style: 'destructive', onPress: unbindDevice },
              ],
            );
          }}
        >
          <Text style={styles.unbindText}>Desvincular dispositivo</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.headerBg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  appName: { fontSize: SIZES.fontXL, fontWeight: '800', color: '#FFF' },
  empresaNome: { fontSize: SIZES.fontMD, color: COLORS.primaryLight, marginTop: 8 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingLG, ...SHADOWS.medium,
  },
  cardTitle: {
    fontSize: SIZES.fontLG, fontWeight: '700', color: COLORS.textPrimary,
    textAlign: 'center', marginBottom: 24,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: SIZES.fontSM, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    height: SIZES.inputHeight, borderRadius: SIZES.radiusMD,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 16, fontSize: SIZES.fontMD, backgroundColor: '#FAFAFA',
  },
  btn: {
    height: SIZES.buttonHeight, borderRadius: SIZES.radiusMD,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontSize: SIZES.fontMD, fontWeight: '700' },
  unbindBtn: { alignItems: 'center', marginTop: 24 },
  unbindText: { color: '#999', fontSize: SIZES.fontSM, textDecorationLine: 'underline' },
});
