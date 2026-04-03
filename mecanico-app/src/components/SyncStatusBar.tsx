// ============================================================
// SyncStatusBar — Visual indicator for connection & pending sync
// ============================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Network from 'expo-network';
import { getSyncQueueCount } from '../lib/database';
import { COLORS, SIZES } from '../theme';

export default function SyncStatusBar() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const net = await Network.getNetworkStateAsync();
        if (mounted) setOnline(!!net.isInternetReachable);
      } catch {
        if (mounted) setOnline(false);
      }
      try {
        const count = await getSyncQueueCount();
        if (mounted) setPending(count);
      } catch {
        /* ignore */
      }
    };

    check();
    const timer = setInterval(check, 10_000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <View style={[styles.bar, online ? styles.barPending : styles.barOffline]}>
      <Text style={styles.indicator}>{online ? '🟡' : '🔴'}</Text>
      <Text style={styles.text}>
        {!online
          ? 'Sem conexão — dados salvos localmente'
          : `${pending} alteração${pending !== 1 ? 's' : ''} pendente${pending !== 1 ? 's' : ''} de sync`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: SIZES.paddingMD,
    gap: 8,
  },
  barOffline: {
    backgroundColor: '#FEE2E2',
  },
  barPending: {
    backgroundColor: '#FEF3C7',
  },
  indicator: {
    fontSize: 12,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
});
