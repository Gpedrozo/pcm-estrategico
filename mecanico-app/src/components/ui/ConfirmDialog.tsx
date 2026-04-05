// ============================================================
// ConfirmDialog — Modal de confirmação padronizado
// Uso: <ConfirmDialog visible={show} title="Cancelar?" onConfirm={fn} onCancel={fn} />
// ============================================================

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SIZES, SPACING, RADIUS, SHADOWS } from '../../theme';
import Button from './Button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button
              title={cancelText}
              variant="outline"
              size="sm"
              onPress={onCancel}
              style={styles.btn}
            />
            <Button
              title={confirmText}
              variant={destructive ? 'danger' : 'primary'}
              size="sm"
              onPress={onConfirm}
              style={styles.btn}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  dialog: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.medium,
  },
  title: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  btn: {
    flex: 1,
  },
});
