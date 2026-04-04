// ============================================================
// VoiceInput — Speech-to-Text real com @react-native-voice/voice
// ONLY transcribes, never records/stores audio
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, TouchableOpacity, TextInput, Text, StyleSheet, Platform, Alert } from 'react-native';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
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

  useEffect(() => {
    const onSpeechResults = (e: SpeechResultsEvent) => {
      const transcript = e.value?.[0] || '';
      if (transcript) {
        const base = baseValueRef.current;
        const separator = base && !base.endsWith(' ') ? ' ' : '';
        onChangeText(base + separator + transcript);
      }
      setPartialResult('');
    };

    const onSpeechPartialResults = (e: SpeechResultsEvent) => {
      setPartialResult(e.value?.[0] || '');
    };

    const onSpeechEnd = () => {
      setIsListening(false);
      setPartialResult('');
    };

    const onSpeechError = (e: SpeechErrorEvent) => {
      setIsListening(false);
      setPartialResult('');
      // code 5 = CLIENT_ERROR (no match / silence) — não mostrar alert
      if (e.error?.code !== '5' && e.error?.code !== '7') {
        console.warn('Voice error:', e.error);
      }
    };

    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
    };
  }, [onChangeText]);

  const startListening = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Indisponível', 'Reconhecimento de voz não disponível na web.');
      return;
    }

    try {
      // Guarda valor atual para append
      baseValueRef.current = value;
      setIsListening(true);
      await Voice.start('pt-BR');
    } catch (err: any) {
      setIsListening(false);
      // Fallback se o dispositivo não suportar Voice
      if (err?.code === 'not_available' || err?.message?.includes('not available')) {
        Alert.alert(
          'Indisponível',
          'Reconhecimento de voz não suportado neste dispositivo.',
        );
      } else {
        console.warn('Voice start error:', err);
      }
    }
  }, [value]);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } catch {
      // ignore
    }
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
