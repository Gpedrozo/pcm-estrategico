// ============================================================
// Select — Picker modal padronizado com label e erro
// Uso: <Select label="Tipo" options={TIPOS} value={v} onChange={set} />
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { COLORS, SIZES, SPACING, RADIUS, SHADOWS } from '../../theme';

export interface SelectOption<T = string> {
  value: T;
  label: string;
  color?: string;
}

interface SelectProps<T = string> {
  label: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function Select<T extends string = string>({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  error,
  required,
  disabled,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TouchableOpacity
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
        style={[
          styles.trigger,
          error ? styles.triggerError : null,
          disabled ? styles.triggerDisabled : null,
        ]}
      >
        <Text
          style={[
            styles.triggerText,
            !selected && styles.placeholder,
          ]}
        >
          {selected?.label || placeholder}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && styles.optionSelected,
                  ]}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  {item.color && (
                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  )}
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs + 2,
  },
  required: {
    color: COLORS.critical,
  },
  trigger: {
    height: SIZES.inputHeight,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerError: {
    borderColor: COLORS.critical,
  },
  triggerDisabled: {
    backgroundColor: COLORS.divider,
  },
  triggerText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    flex: 1,
  },
  placeholder: {
    color: COLORS.textHint,
  },
  chevron: {
    fontSize: 12,
    color: COLORS.textHint,
    marginLeft: SPACING.sm,
  },
  error: {
    fontSize: SIZES.fontXS,
    color: COLORS.critical,
    marginTop: SPACING.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    maxHeight: '70%',
    ...SHADOWS.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    fontSize: 20,
    color: COLORS.textSecondary,
    padding: SPACING.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  optionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
  },
  optionText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  check: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
