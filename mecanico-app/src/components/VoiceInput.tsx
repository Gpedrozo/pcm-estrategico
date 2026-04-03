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
      
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        try {
          const Voice = require('@react-native-voice/voice').default;
          
          Voice.onSpeechResults = (e: any) => {
            const text = e?.value?.[0] || '';
            if (text) {
              onChangeText(value ? `${value} ${text}` : text);
            }
            setIsListening(false);
          };

          Voice.onSpeechEnd = () => {
            setIsListening(false);
          };

          Voice.onSpeechError = () => {
            setIsListening(false);
            Alert.alert('Erro', 'Não foi possível reconhecer a fala. Tente novamente.');
          };

          await Voice.start('pt-BR');
        } catch {
          setIsListening(false);
          Alert.alert(
            'Voz indisponível',
            'O reconhecimento de voz não está disponível neste dispositivo. Digite manualmente.',
          );
        }
      }
    } catch {
      setIsListening(false);
    }
  }, [value, onChangeText]);

  const stopListening = useCallback(async () => {
    try {
      const Voice = require('@react-native-voice/voice').default;
      await Voice.stop();
    } catch {
      // ignore
    }
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
  container: {
    marginBottom: SIZES.paddingMD,
  },
  label: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  textareaWrap: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  textarea: {
    flex: 1,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 10,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },
  singleLine: {
    height: SIZES.inputHeight,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  micButtonActive: {
    backgroundColor: COLORS.critical,
    borderColor: COLORS.critical,
  },
  micIcon: {
    fontSize: 24,
  },
  micLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  micLabelActive: {
    color: COLORS.textOnPrimary,
  },
});
