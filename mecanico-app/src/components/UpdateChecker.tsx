// ============================================================
// UpdateChecker — Verifica se há nova versão do app
// Consulta tabela app_versao no Supabase e mostra alerta
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Modal,
  Animated,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS, SIZES } from '../theme';

// ⚠️ MANTER SINCRONIZADO com app.json → expo.version
const APP_VERSION = '1.0.1';

interface VersionInfo {
  versao_atual: string;
  versao_minima: string;
  url_download: string | null;
  notas: string | null;
  forcar_atualizacao: boolean;
}

/**
 * Compara duas versões semver (ex: "1.2.3" > "1.2.0")
 * Retorna: -1 se a < b, 0 se iguais, 1 se a > b
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export default function UpdateChecker({ children }: { children: React.ReactNode }) {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const checkVersion = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_versao')
        .select('versao_atual, versao_minima, url_download, notas, forcar_atualizacao')
        .eq('plataforma', 'android')
        .maybeSingle();

      if (error || !data) return;

      // Há versão nova disponível?
      const hasUpdate = compareVersions(data.versao_atual, APP_VERSION) > 0;
      // Versão atual está abaixo da mínima? (atualização obrigatória)
      const belowMinimum = compareVersions(APP_VERSION, data.versao_minima) < 0;

      if (hasUpdate || belowMinimum) {
        setVersionInfo({
          ...data,
          forcar_atualizacao: data.forcar_atualizacao || belowMinimum,
        });
      }
    } catch {
      // Silencioso — não bloqueia o app se falhar
    }
  }, []);

  useEffect(() => {
    // Checa ao abrir o app
    checkVersion();
    // Recheca a cada 30 minutos
    const interval = setInterval(checkVersion, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkVersion]);

  // Anima entrada do modal
  useEffect(() => {
    if (versionInfo && !dismissed) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [versionInfo, dismissed, fadeAnim]);

  const handleUpdate = useCallback(() => {
    if (versionInfo?.url_download) {
      Linking.openURL(versionInfo.url_download).catch(() => {});
    }
  }, [versionInfo]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const showModal = versionInfo && !dismissed;
  const isMandatory = versionInfo?.forcar_atualizacao;

  return (
    <View style={{ flex: 1 }}>
      {children}

      <Modal
        visible={!!showModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={isMandatory ? undefined : handleDismiss}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <View style={styles.card}>
            {/* Ícone */}
            <Text style={styles.icon}>🔄</Text>

            {/* Título */}
            <Text style={styles.title}>Nova versão disponível!</Text>

            {/* Versão */}
            <View style={styles.versionRow}>
              <View style={styles.versionBadgeOld}>
                <Text style={styles.versionLabel}>Atual</Text>
                <Text style={styles.versionText}>{APP_VERSION}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
              <View style={styles.versionBadgeNew}>
                <Text style={styles.versionLabel}>Nova</Text>
                <Text style={styles.versionTextNew}>{versionInfo?.versao_atual}</Text>
              </View>
            </View>

            {/* Notas */}
            {versionInfo?.notas ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>O que há de novo:</Text>
                <Text style={styles.notesText}>{versionInfo.notas}</Text>
              </View>
            ) : null}

            {/* Aviso obrigatório */}
            {isMandatory ? (
              <View style={styles.mandatoryBox}>
                <Text style={styles.mandatoryText}>
                  ⚠️ Esta atualização é obrigatória para continuar usando o app.
                </Text>
              </View>
            ) : null}

            {/* Botões */}
            {versionInfo?.url_download ? (
              <TouchableOpacity
                style={styles.btnUpdate}
                onPress={handleUpdate}
                activeOpacity={0.7}
              >
                <Text style={styles.btnUpdateText}>📥  ATUALIZAR AGORA</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.noUrlBox}>
                <Text style={styles.noUrlText}>
                  Solicite o novo APK ao gestor do sistema.
                </Text>
              </View>
            )}

            {!isMandatory ? (
              <TouchableOpacity
                style={styles.btnLater}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Text style={styles.btnLaterText}>Depois</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  icon: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: SIZES.fontXL,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  versionBadgeOld: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  versionBadgeNew: {
    backgroundColor: COLORS.successBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  versionLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  versionText: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  versionTextNew: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.success,
  },
  arrow: {
    fontSize: 24,
    color: COLORS.textHint,
  },
  notesBox: {
    backgroundColor: COLORS.infoBg,
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: COLORS.info,
    marginBottom: 4,
  },
  notesText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  mandatoryBox: {
    backgroundColor: COLORS.criticalBg,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  mandatoryText: {
    fontSize: SIZES.fontSM,
    color: COLORS.critical,
    fontWeight: '600',
    textAlign: 'center',
  },
  btnUpdate: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  btnUpdateText: {
    fontSize: SIZES.fontLG,
    fontWeight: '800',
    color: '#FFF',
  },
  noUrlBox: {
    backgroundColor: COLORS.warningBg,
    borderRadius: 12,
    padding: 14,
    width: '100%',
  },
  noUrlText: {
    fontSize: SIZES.fontSM,
    color: COLORS.warning,
    fontWeight: '600',
    textAlign: 'center',
  },
  btnLater: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  btnLaterText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
