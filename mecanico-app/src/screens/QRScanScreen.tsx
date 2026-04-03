// ============================================================
// QRScanScreen — Fullscreen scanner for equipment QR codes
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getOrdensServico } from '../lib/database';
import { COLORS, SIZES } from '../theme';
import type { RootStackParamList, OrdemServico } from '../types';

export default function QRScanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Try to find OS or equipment matching the scanned data
    try {
      const allOS = await getOrdensServico();
      // Match by equipment name or OS number
      const match = allOS.find(
        (os: OrdemServico) =>
          os.numero_os === data ||
          os.equipamento?.toLowerCase() === data.toLowerCase()
      );

      if (match) {
        navigation.navigate('OSDetail', { osId: match.id });
      } else {
        Alert.alert(
          'QR Code lido',
          `Código: ${data}\n\nNenhuma OS encontrada para este equipamento.`,
          [
            { text: 'Escanear novamente', onPress: () => setScanned(false) },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível processar o QR code.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Acesso à câmera</Text>
        <Text style={styles.permissionText}>Permita o acesso à câmera para escanear QR Codes de equipamentos.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.7}>
          <Text style={styles.permissionButtonText}>Permitir Câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.topSection}>
          <Text style={styles.title}>Escanear Equipamento</Text>
          <Text style={styles.hint}>Aponte para o QR Code do equipamento</Text>
        </View>

        <View style={styles.cutout} />

        <View style={styles.bottomSection}>
          {scanned && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => setScanned(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.rescanText}>🔄 Escanear novamente</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topSection: {
    paddingTop: 80,
    alignItems: 'center',
  },
  title: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hint: {
    fontSize: SIZES.fontSM,
    color: '#DDD',
    marginTop: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cutout: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderRadius: 20,
  },
  bottomSection: {
    paddingBottom: 80,
  },
  rescanButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: SIZES.radiusMD,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  rescanText: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: '#FFF',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.paddingLG,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    height: SIZES.buttonLG,
    paddingHorizontal: 40,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionButtonText: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: '#FFF',
  },
});
