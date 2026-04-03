// ============================================================
// DateTimePicker — Flexible editable date/time with "Agora" button
// ============================================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../theme';

interface DateTimePickerFieldProps {
  label: string;
  value: string; // ISO string or dd/MM/yyyy HH:mm
  onChange: (isoString: string) => void;
}

export default function DateTimePickerField({ label, value, onChange }: DateTimePickerFieldProps) {
  const [displayValue, setDisplayValue] = useState(() => formatForDisplay(value));

  const setNow = () => {
    const now = new Date();
    const iso = now.toISOString();
    onChange(iso);
    setDisplayValue(formatForDisplay(iso));
  };

  const handleTextChange = (text: string) => {
    setDisplayValue(text);
    // Try to parse dd/MM/yyyy HH:mm
    const parsed = parseDisplayDate(text);
    if (parsed) {
      onChange(parsed.toISOString());
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={displayValue}
          onChangeText={handleTextChange}
          placeholder="DD/MM/AAAA HH:MM"
          placeholderTextColor={COLORS.disabled}
          keyboardType="numbers-and-punctuation"
        />
        <TouchableOpacity style={styles.nowButton} onPress={setNow} activeOpacity={0.7}>
          <Text style={styles.nowIcon}>⏱</Text>
          <Text style={styles.nowText}>Agora</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatForDisplay(isoOrText: string): string {
  if (!isoOrText) return '';
  try {
    const d = new Date(isoOrText);
    if (isNaN(d.getTime())) return isoOrText;
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  } catch {
    return isoOrText;
  }
}

function parseDisplayDate(text: string): Date | null {
  // Expected format: DD/MM/YYYY HH:MM
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min] = match;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
  return isNaN(d.getTime()) ? null : d;
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: SIZES.inputHeight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    paddingHorizontal: SIZES.paddingMD,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  nowButton: {
    height: SIZES.inputHeight,
    paddingHorizontal: 16,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  nowIcon: {
    fontSize: 20,
  },
  nowText: {
    color: COLORS.textOnPrimary,
    fontSize: SIZES.fontSM,
    fontWeight: '700',
  },
});
