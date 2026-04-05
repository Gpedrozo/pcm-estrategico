// ============================================================
// DeviceBindingScreen — First-time QR code binding flow
// Scans QR from Central Admin / Dispositivos, binds phone to tenant
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES } from '../theme';

type Mode = 'menu' | 'camera' | 'manual';

export default function DeviceBindingScreen() {
  const { bindDevice } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('menu');
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);

  const handleBind = async (rawData: string) => {
    const trimmed = rawData.trim();
    if (!trimmed) {
      Alert.alert('Dados inválidos', 'O código QR não contém dados válidos.');
      return;
    }
    setLoading(true);
    try {
      // QR format: URL like https://app.pcmestrategico.com.br/app/vincular?token=UUID
      // or raw UUID token
      let qrToken = trimmed;

      // Try to extract token from URL
      try {
        const url = new URL(trimmed);
        const tokenParam = url.searchParams.get('token') || url.searchParams.get('t');
        if (tokenParam) qrToken = tokenParam;
      } catch {
        // Not a URL — might be raw token UUID, use as-is
      }

      if (!qrToken) {
        Alert.alert('Erro', 'QR Code inválido. Gere um novo código em Central Admin → Dispositivos.');
        setLoading(false);
        setScanned(false);
        return;
      }

      const result = await bindDevice(qrToken);
      if (!result.ok) {
        Alert.alert('Erro ao vincular', result.error || 'Falha na vinculação. Verifique se o QR Code é válido e não expirou.');
        setLoading(false);
        setScanned(false);
      }
      // If ok, AuthContext sets isDeviceBound=true → navigator switches to Login
    } catch (err: any) {
      Alert.alert('Erro ao vincular', err?.message || 'Tente novamente.');
      setLoading(false);
      setScanned(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    handleBind(data);
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à câmera para escanear o QR Code.');
        return;
      }
    }
    setMode('camera');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Vinculando dispositivo...</Text>
        <Text style={styles.loadingHint}>Conectando à empresa</Text>
      </View>
    );
  }

  // ─── Camera mode ───
  if (mode === 'camera') {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        {/* Overlay with cutout */}
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraTop}>
            <Text style={styles.cameraTitle}>Aponte para o QR Code</Text>
            <Text style={styles.cameraHint}>
              Gerado em Central Admin → Dispositivos
            </Text>
          </View>
          <View style={styles.cameraCutout} />
          <View style={styles.cameraBottom}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => { setMode('menu'); setScanned(false); }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>← Voltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─── Manual mode ───
  if (mode === 'manual') {
    return (
      <KeyboardAvoidingView
        style={styles.centered}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.manualContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.manualIcon}>🔑</Text>
          <Text style={styles.manualTitle}>Código de Vinculação</Text>
          <Text style={styles.manualHint}>
            Digite o código fornecido pelo administrador
          </Text>

          <TextInput
            style={styles.tokenInput}
            value={manualToken}
            onChangeText={setManualToken}
            placeholder="Cole o código aqui"
            placeholderTextColor={COLORS.textHint}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.primaryButton, !manualToken.trim() && styles.buttonDisabled]}
            onPress={() => handleBind(manualToken)}
            disabled={!manualToken.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>Vincular</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => { setMode('menu'); setManualToken(''); }}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>← Voltar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Main menu ───
  return (
    <View style={styles.centered}>
      <Text style={styles.logo}>🔧</Text>
      <Text style={styles.title}>PCM Mecânico</Text>
      <Text style={styles.subtitle}>
        Para começar, vincule este dispositivo{'\n'}à sua empresa usando o QR Code
      </Text>

      <TouchableOpacity style={styles.primaryButton} onPress={openCamera} activeOpacity={0.7}>
        <Text style={styles.primaryButtonIcon}>📷</Text>
        <Text style={styles.primaryButtonText}>Escanear QR Code</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setMode('manual')}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Digitar código manualmente</Text>
      </TouchableOpacity>

      <Text style={styles.footerHint}>
        Peça ao administrador para gerar o QR Code{'\n'}em Central Admin → Dispositivos
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.paddingLG,
  },
  logo: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: SIZES.fontXL,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  primaryButton: {
    width: '100%',
    height: SIZES.buttonLG,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  primaryButtonIcon: {
    fontSize: 22,
  },
  primaryButtonText: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    width: '100%',
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.primary,
  },
  footerHint: {
    marginTop: 24,
    fontSize: 13,
    color: COLORS.textHint,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  loadingHint: {
    marginTop: 4,
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },
  // Camera overlay
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cameraTop: {
    paddingTop: 80,
    alignItems: 'center',
  },
  cameraTitle: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cameraHint: {
    fontSize: SIZES.fontSM,
    color: '#DDD',
    marginTop: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cameraCutout: {
    width: 260,
    height: 260,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderRadius: 20,
  },
  cameraBottom: {
    paddingBottom: 60,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: SIZES.radiusMD,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cancelButtonText: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: '#FFF',
  },
  // Manual
  manualContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.paddingLG,
  },
  manualIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  manualTitle: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  manualHint: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  tokenInput: {
    width: '100%',
    height: SIZES.inputHeight,
    borderRadius: SIZES.radiusMD,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
});
