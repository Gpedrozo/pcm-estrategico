// ============================================================
// EquipmentPicker — Dropdown reutilizável de equipamentos
// Busca por nome ou TAG, funciona com ou sem TAG cadastrada
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { searchEquipamentos, getAllEquipamentos } from '../lib/database';
import { COLORS, SIZES } from '../theme';
import type { Equipamento } from '../types';

interface EquipmentPickerProps {
  empresaId: string;
  value: string;
  equipamentoId?: string;
  onSelect: (eq: Equipamento | null, displayName: string) => void;
  placeholder?: string;
  label?: string;
}

export default function EquipmentPicker({
  empresaId,
  value,
  equipamentoId,
  onSelect,
  placeholder = 'Digite nome ou TAG do equipamento...',
  label = 'Equipamento / TAG',
}: EquipmentPickerProps) {
  const [text, setText] = useState(value);
  const [results, setResults] = useState<Equipamento[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState(!!equipamentoId);

  useEffect(() => {
    setText(value);
    setSelected(!!equipamentoId);
  }, [value, equipamentoId]);

  const handleSearch = useCallback(async (query: string) => {
    setText(query);
    setSelected(false);
    onSelect(null, query);

    if (query.length >= 2 && empresaId) {
      const list = await searchEquipamentos(empresaId, query);
      setResults(list);
      setShowDropdown(list.length > 0);
    } else if (query.length === 0 && empresaId) {
      // Mostrar todos quando campo limpo e focado
      const all = await getAllEquipamentos(empresaId);
      setResults(all.slice(0, 20));
      setShowDropdown(all.length > 0);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [empresaId, onSelect]);

  const handleSelect = (eq: Equipamento) => {
    const display = eq.qr_code ? `${eq.nome} [${eq.qr_code}]` : eq.nome;
    setText(display);
    setSelected(true);
    setShowDropdown(false);
    setResults([]);
    onSelect(eq, display);
  };

  const handleFocus = async () => {
    if (!selected && text.length === 0 && empresaId) {
      const all = await getAllEquipamentos(empresaId);
      setResults(all.slice(0, 20));
      setShowDropdown(all.length > 0);
    } else if (!selected && text.length >= 2) {
      const list = await searchEquipamentos(empresaId, text);
      setResults(list);
      setShowDropdown(list.length > 0);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, selected && styles.inputSelected]}
          value={text}
          onChangeText={handleSearch}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textHint}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {selected && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              setText('');
              setSelected(false);
              onSelect(null, '');
            }}
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.dropdownList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.dropdownName}>{item.nome}</Text>
                <View style={styles.dropdownMeta}>
                  {item.qr_code && (
                    <Text style={styles.dropdownTag}>🏷️ {item.qr_code}</Text>
                  )}
                  {item.localizacao && (
                    <Text style={styles.dropdownLoc}>📍 {item.localizacao}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    zIndex: 100,
  },
  label: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: SIZES.inputHeight,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusSM,
    paddingHorizontal: 16,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  inputSelected: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successBg,
  },
  clearBtn: {
    position: 'absolute',
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  dropdown: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusSM,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    maxHeight: 250,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dropdownList: {
    maxHeight: 250,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  dropdownName: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dropdownMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  dropdownTag: {
    fontSize: SIZES.fontSM,
    color: COLORS.primary,
    fontWeight: '600',
  },
  dropdownLoc: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },
});