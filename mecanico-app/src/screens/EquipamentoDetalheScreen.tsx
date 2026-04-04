// ============================================================
// EquipamentoDetalheScreen — Ficha técnica do equipamento
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { getEquipamentoById, getExecucoesHistorico, getDocumentosByEquipamento, searchEquipamentos, getAllEquipamentos } from '../lib/database';
import LoadingScreen from '../components/LoadingScreen';
import { COLORS, SIZES } from '../theme';
import type { RootStackParamList, Equipamento, DocumentoTecnico } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'EquipamentoDetalhe'>;

export default function EquipamentoDetalheScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { empresaId } = useAuth();
  const { equipamentoId } = route.params;

  const isSearchMode = equipamentoId === '__search__';

  // ── Search mode state ──
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Equipamento[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // ── Detail mode state ──
  const [equipamento, setEquipamento] = useState<Equipamento | null>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoTecnico[]>([]);
  const [loading, setLoading] = useState(!isSearchMode);

  // Load search results on mount (search mode)
  useEffect(() => {
    if (isSearchMode && empresaId) {
      (async () => {
        setSearchLoading(true);
        const all = await getAllEquipamentos(empresaId);
        setSearchResults(all);
        setSearchLoading(false);
      })();
    }
  }, [isSearchMode, empresaId]);

  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (!empresaId) return;
    if (text.length >= 2) {
      const results = await searchEquipamentos(empresaId, text);
      setSearchResults(results);
    } else {
      const all = await getAllEquipamentos(empresaId);
      setSearchResults(all);
    }
  };

  const selectEquipamento = (eq: Equipamento) => {
    navigation.push('EquipamentoDetalhe', { equipamentoId: eq.id });
  };

  // Load detail (detail mode)
  useEffect(() => {
    if (!isSearchMode) {
      (async () => {
        try {
          const eq = await getEquipamentoById(equipamentoId);
          setEquipamento(eq);
          if (eq?.empresa_id) {
            const hist = await getExecucoesHistorico(eq.empresa_id, 50);
            setHistorico(hist.filter((h: any) => h.equipamento_id === equipamentoId).slice(0, 10));
          }
          const docs = await getDocumentosByEquipamento(equipamentoId);
          setDocumentos(docs);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [equipamentoId, isSearchMode]);

  if (loading) return <LoadingScreen message="Carregando..." />;

  // ── SEARCH MODE ──
  if (isSearchMode) {
    return (
      <View style={styles.container}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome ou TAG..."
            placeholderTextColor={COLORS.textHint}
            value={searchText}
            onChangeText={handleSearch}
            autoFocus
          />
        </View>
        {searchLoading ? (
          <LoadingScreen message="Carregando equipamentos..." />
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.searchResultItem} onPress={() => selectEquipamento(item)} activeOpacity={0.7}>
                <Text style={styles.searchResultName}>{item.nome}</Text>
                {item.localizacao && <Text style={styles.searchResultLoc}>📍 {item.localizacao}</Text>}
                {item.fabricante && <Text style={styles.searchResultFab}>{item.fabricante} {item.modelo || ''}</Text>}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.searchListContent}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhum equipamento encontrado.</Text>}
          />
        )}
      </View>
    );
  }

  // ── DETAIL MODE ──
  if (!equipamento) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Equipamento não encontrado.</Text>
      </View>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    value ? (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    ) : null
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{equipamento.nome}</Text>
        {equipamento.localizacao && (
          <Text style={styles.headerSub}>📍 {equipamento.localizacao}</Text>
        )}
      </View>

      {/* Ficha técnica */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 FICHA TÉCNICA</Text>
        <InfoRow label="Fabricante" value={equipamento.fabricante} />
        <InfoRow label="Modelo" value={equipamento.modelo} />
        <InfoRow label="Nº Série" value={equipamento.numero_serie} />
        <InfoRow label="QR Code" value={equipamento.qr_code} />
      </View>

      {/* Ações */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('SolicitarServico', {
            equipamentoId: equipamento.id,
            equipamentoNome: equipamento.nome,
          })}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>📝 GERAR OS</Text>
        </TouchableOpacity>

        {documentos.length > 0 && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.info }]}
            onPress={() => navigation.navigate('Catalogo', { equipamentoId: equipamento.id })}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>📄 CATÁLOGOS</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Histórico de serviços */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔧 ÚLTIMOS SERVIÇOS</Text>
        {historico.length === 0 ? (
          <Text style={styles.emptyHist}>Nenhum serviço registrado.</Text>
        ) : (
          historico.map((h: any) => (
            <View key={h.id} style={styles.histItem}>
              <View style={styles.histHeader}>
                <Text style={styles.histOS}>OS {h.numero_os || '—'}</Text>
                <Text style={styles.histDate}>
                  {h.data_execucao ? new Date(h.data_execucao).toLocaleDateString('pt-BR') : '—'}
                </Text>
              </View>
              {h.servico_executado && (
                <Text style={styles.histDesc} numberOfLines={2}>{h.servico_executado}</Text>
              )}
              {h.mecanico_nome && (
                <Text style={styles.histMecanico}>👤 {h.mecanico_nome}</Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SIZES.paddingMD, paddingBottom: 40 },
  emptyText: { fontSize: SIZES.fontMD, color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
  header: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radiusMD,
    padding: 20,
    marginBottom: 16,
  },
  headerTitle: { fontSize: SIZES.fontXL, fontWeight: '800', color: COLORS.primaryDark },
  headerSub: { fontSize: SIZES.fontMD, color: COLORS.primaryDark, marginTop: 4, opacity: 0.8 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.cardPadding,
    marginBottom: 16,
  },
  cardTitle: { fontSize: SIZES.fontMD, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  infoLabel: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, fontWeight: '600' },
  infoValue: { fontSize: SIZES.fontSM, color: COLORS.textPrimary, fontWeight: '700' },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    height: SIZES.buttonHeight,
    borderRadius: SIZES.radiusMD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: { fontSize: SIZES.fontMD, fontWeight: '800', color: '#FFF' },
  emptyHist: { fontSize: SIZES.fontSM, color: COLORS.textHint, fontStyle: 'italic' },
  histItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  histHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  histOS: { fontSize: SIZES.fontSM, fontWeight: '700', color: COLORS.primary },
  histDate: { fontSize: SIZES.fontXS, color: COLORS.textSecondary },
  histDesc: { fontSize: SIZES.fontSM, color: COLORS.textPrimary, marginTop: 4 },
  histMecanico: { fontSize: SIZES.fontXS, color: COLORS.textSecondary, marginTop: 2 },
  // Search mode styles
  searchBar: { padding: SIZES.paddingMD, paddingBottom: 8 },
  searchInput: {
    height: SIZES.inputHeight,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    paddingHorizontal: 16,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchListContent: { paddingHorizontal: SIZES.paddingMD, paddingBottom: 40 },
  searchResultItem: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchResultName: { fontSize: SIZES.fontMD, fontWeight: '700', color: COLORS.textPrimary },
  searchResultLoc: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginTop: 4 },
  searchResultFab: { fontSize: SIZES.fontXS, color: COLORS.textHint, marginTop: 2 },
});
