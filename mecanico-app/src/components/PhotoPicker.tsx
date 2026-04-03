// ============================================================
// PhotoPicker — Capture/select photos for execution records
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES } from '../theme';

interface PhotoPickerProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export default function PhotoPicker({ photos, onPhotosChange, maxPhotos = 5 }: PhotoPickerProps) {
  const takePhoto = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limite', `Máximo de ${maxPhotos} fotos.`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à câmera nas configurações.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      onPhotosChange([...photos, result.assets[0].uri]);
    }
  };

  const pickPhoto = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limite', `Máximo de ${maxPhotos} fotos.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria nas configurações.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      onPhotosChange([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    Alert.alert('Remover foto?', '', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          const updated = [...photos];
          updated.splice(index, 1);
          onPhotosChange(updated);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>📷 Fotos ({photos.length}/{maxPhotos})</Text>

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          {photos.map((uri, i) => (
            <TouchableOpacity key={i} onLongPress={() => removePhoto(i)} activeOpacity={0.8}>
              <Image source={{ uri }} style={styles.thumb} />
              <Text style={styles.removeHint}>Segure p/ remover</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.photoButton} onPress={takePhoto} activeOpacity={0.7}>
          <Text style={styles.photoButtonIcon}>📸</Text>
          <Text style={styles.photoButtonText}>Câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoButton} onPress={pickPhoto} activeOpacity={0.7}>
          <Text style={styles.photoButtonIcon}>🖼</Text>
          <Text style={styles.photoButtonText}>Galeria</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.paddingMD,
  },
  label: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  scrollRow: {
    marginBottom: 10,
  },
  thumb: {
    width: 100,
    height: 100,
    borderRadius: SIZES.radiusSM,
    marginRight: 8,
    backgroundColor: COLORS.divider,
  },
  removeHint: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoButton: {
    flex: 1,
    height: 56,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  photoButtonIcon: {
    fontSize: 22,
  },
  photoButtonText: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
