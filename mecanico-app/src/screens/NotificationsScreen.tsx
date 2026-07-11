// ============================================================
// NotificationsScreen — Avisos rápidos para o técnico de campo
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../theme';
import type { Notification } from '../types';

const initialNotifications: Notification[] = [
  {
    id: 'n-01',
    title: 'Nova O.S. atribuída',
    description: 'Uma ordem de serviço urgente foi atribuída a você.',
    timestamp: new Date().toISOString(),
    unread: true,
  },
  {
    id: 'n-02',
    title: 'Material disponível',
    description: 'O material solicitado está disponível para retirada.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    unread: false,
  },
];

export default function NotificationsScreen() {
  const { mecanicoNome } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      setNotifications(initialNotifications);
      setLoading(false);
    };
    load();
  }, []);

  const markAllRead = () => {
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Notificações</Text>
        <Text style={styles.subtitle}>{mecanicoNome || 'Técnico'}, verifique suas mensagens recentes.</Text>
      </View>

      <TouchableOpacity style={styles.actionBtn} onPress={markAllRead} activeOpacity={0.7}>
        <Text style={styles.actionText}>Marcar todas como lidas</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 24 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Nenhuma notificação no momento.</Text>
        </View>
      ) : (
        notifications.map((notification) => (
          <View key={notification.id} style={[styles.card, notification.unread && styles.unreadCard]}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              {notification.unread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notificationDescription}>{notification.description}</Text>
            <Text style={styles.notificationTime}>{new Date(notification.timestamp).toLocaleString('pt-BR')}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SIZES.paddingMD, paddingBottom: 32 },
  header: { marginBottom: 16 },
  title: { fontSize: SIZES.fontXL, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginTop: 4 },
  actionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusSM,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionText: { color: '#FFF', fontWeight: '700' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notificationTitle: { fontSize: SIZES.fontMD, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginLeft: 10 },
  notificationDescription: { color: COLORS.textSecondary, marginTop: 8, marginBottom: 10 },
  notificationTime: { fontSize: 12, color: COLORS.textHint },
  emptyBox: { marginTop: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textSecondary, fontSize: SIZES.fontSM },
});
