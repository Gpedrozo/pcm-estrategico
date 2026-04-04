// ============================================================
// CatalogoScreen — Documentos técnicos do equipamento
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getDocumentosByEquipamento } from '../lib/database';
import LoadingScreen from '../components/LoadingScreen';
import { COLORS, SIZES } from '../theme';
import type { RootStackParamList, DocumentoTecnico } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Catalogo'>;

const TIPO_ICONS: Record<string, string> = {
  manual: '📖',
  catalogo: '📄',
  desenho: '📐',
  procedimento: '📋',
  certificado: '🏅',
  foto: '📷',
  default: '📎',
};

export default function CatalogoScreen() {
  const route = useRoute<Props['route']>();
  const { equipamentoId } = route.params;

  const [documentos, setDocumentos] = useState<DocumentoTecnico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (equipamentoId) {
          const docs = await getDocumentosByEquipamento(equipamentoId);
          setDocumentos(docs);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [equipamentoId]);

  const openDocument = async (doc: DocumentoTecnico) => {
    if (!doc.arquivo_url) {
      Alert.alert('Documento indisponível', 'O arquivo ainda não foi enviado ao servidor.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(doc.arquivo_url);
      if (supported) {
        await Linking.openURL(doc.arquivo_url);
      } else {
        Alert.alert('Não foi possível abrir', 'Formato não suportado pelo dispositivo.');
      }
    } catch {
      Alert.alert('Erro', 'Falha ao tentar abrir o documento.');
    }
  };

  if (loading) return <LoadingScreen message="Carregando catálogos..." />;

  const renderItem = ({ item }: { item: DocumentoTecnico }) => {
    const icon = TIPO_ICONS[item.tipo?.toLowerCase() || ''] || TIPO_ICONS.default;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openDocument(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.cardIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.nome}</Text>
          {item.tipo && <Text style={styles.cardTipo}>{item.tipo.toUpperCase()}</Text>}
          {item.created_at && (
            <Text style={styles.cardDate}>
              {new Date(item.created_at).toLocaleDateString('pt-BR')}
            </Text>
          )}
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {documentos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyText}>Nenhum documento técnico encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={documentos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: SIZES.paddingMD },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMD,
    padding: 16,
    marginBottom: 10,
  },
  cardIcon: { fontSize: 32, marginRight: 14 },
  cardTitle: { fontSize: SIZES.fontMD, fontWeight: '700', color: COLORS.textPrimary },
  cardTipo: { fontSize: SIZES.fontXS, fontWeight: '600', color: COLORS.primary, marginTop: 2 },
  cardDate: { fontSize: SIZES.fontXS, color: COLORS.textSecondary, marginTop: 2 },
  arrow: { fontSize: 28, color: COLORS.textHint, marginLeft: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: SIZES.fontMD, color: COLORS.textSecondary },
});
