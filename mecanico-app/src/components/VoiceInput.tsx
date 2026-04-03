// ============================================================
// VoiceInput — Speech-to-Text button for field input
// ONLY transcribes, never records/stores audio
// ============================================================

import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, TextInput, Text, StyleSheet, Platform, Alert } from 'react-native';
import { COLORS, SIZES } from '../theme';

interface VoiceInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
}

export default function VoiceInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = true,
  numberOfLines = 4,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);

  const startListening = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Indisponível', 'Reconhecimento de voz não disponível na web.');
      return;
    }

    try {
      setIsListening(true);

      // Speech recognition — will be available in a future update
      setIsListening(false);
      Alert.alert(
        'Em breve',
        'O reconhecimento de voz estará disponível em uma próxima atualização. Por enquanto, digite manualmente.',
      );
    } catch {
      setIsListening(false);
    }
  }, [value, onChangeText]);

  const stopListening = useCallback(async () => {
    setIsListening(false);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <View style={[styles.textareaWrap, multiline && { minHeight: numberOfLines * 28 }]}>
          <TextInput
            style={[styles.textarea, !multiline && styles.singleLine]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.disabled}
            multiline={multiline}
            numberOfLines={numberOfLines}
            textAlignVertical={multiline ? 'top' : 'center'}
          />
        </View>
        <TouchableOpacity
          style={[styles.micButton, isListening && styles.micButtonActive]}
          onPress={isListening ? stopListening : startListening}
          activeOpacity={0.7}
        >
          <Text style={styles.micIcon}>{isListening ? '⏹' : '🎤'}</Text>
          <Text style={[styles.micLabel, isListening && styles.micLabelActive]}>
            {isListening ? 'Parar' : 'Falar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SIZES.md },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textareaWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    marginRight: 8,
  },
  textarea: {
    fontSize: 15,
    color: COLORS.text,
    padding: 10,
  },
  singleLine: {
    height: 44,
  },
  micButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: COLORS.danger || '#e74c3c',
  },
  micIcon: {
    fontSize: 24,
  },
  micLabel: {
    fontSize: 10,
    color: '#fff',
    marginTop: 2,
  },
  micLabelActive: {
    color: '#fff',
  },
});
