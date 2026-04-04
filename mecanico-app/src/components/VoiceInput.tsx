// ============================================================
// VoiceInput — Speech-to-Text com expo-speech-recognition
// ONLY transcribes, never records/stores audio
// ============================================================

import React, { useState, useCallback, useRef } from 'react';
import { View, TouchableOpacity, TextInput, Text, StyleSheet, Platform, Alert } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
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
  const [partialResult, setPartialResult] = useState('');
  const baseValueRef = useRef(value);

  useSpeechRecognitionEvent('start', () => setIsListening(true));

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    setPartialResult('');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript || '';
    if (transcript) {
      const base = baseValueRef.current;
      const separator = base && !base.endsWith(' ') ? ' ' : '';
      onChangeText(base + separator + transcript);
    }
    if (event.isFinal) {
      setPartialResult('');
    } else {
      setPartialResult(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    setPartialResult('');
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      console.warn('Voice error:', event.error, event.message);
    }
  });

  const startListening = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Indisponível', 'Reconhecimento de voz não disponível na web.');
      return;
    }

    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert('Permissão negada', 'Permita o uso do microfone nas configurações.');
        return;
      }
      baseValueRef.current = value;
      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: true,
        continuous: false,
      });
    } catch (err: any) {
      setIsListening(false);
      if (err?.message?.includes('not available') || err?.message?.includes('unavailable')) {
        Alert.alert(
          'Indisponível',
          'Reconhecimento de voz não suportado neste dispositivo.',
        );
      } else {
        console.warn('Voice start error:', err);
      }
    }
  }, [value]);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
    setPartialResult('');
  }, []);

  // Texto exibido no input — valor real + parcial ao vivo
  const displayValue = isListening && partialResult
    ? value + (value && !value.endsWith(' ') ? ' ' : '') + partialResult
    : value;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <View style={[styles.textareaWrap, multiline && { minHeight: numberOfLines * 28 }]}>
          <TextInput
            style={[styles.textarea, !multiline && styles.singleLine]}
            value={displayValue}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textHint}
            multiline={multiline}
            numberOfLines={numberOfLines}
            textAlignVertical={multiline ? 'top' : 'center'}
            editable={!isListening}
          />
          {isListening && (
            <View style={styles.listeningBanner}>
              <Text style={styles.listeningText}>🔴 Ouvindo...</Text>
            </View>
          )}
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
  container: { marginBottom: SIZES.paddingMD },
  label: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: COLORS.textPrimary,
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
    borderRadius: SIZES.radiusSM,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    overflow: 'hidden',
  },
  textarea: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    padding: 12,
  },
  singleLine: {
    height: SIZES.inputHeight,
  },
  listeningBanner: {
    backgroundColor: COLORS.criticalBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.critical,
  },
  listeningText: {
    fontSize: SIZES.fontXS,
    color: COLORS.critical,
    fontWeight: '700',
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: COLORS.critical,
  },
  micIcon: {
    fontSize: 26,
  },
  micLabel: {
    fontSize: 11,
    color: '#FFF',
    marginTop: 2,
    fontWeight: '600',
  },
  micLabelActive: {
    color: '#FFF',
  },
});
