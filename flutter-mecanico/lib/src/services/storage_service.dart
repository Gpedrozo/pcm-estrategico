import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:logging/logging.dart';

final log = Logger('Storage');

/// Wrapper sobre [FlutterSecureStorage] para centralizar a persistência
/// segura usada pelo app (tokens, ids da empresa/mecânico, device id, etc.).
class StorageService {
  static const FlutterSecureStorage _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  // Chaves padronizadas usadas pelo app.
  static const String kEmpresaId = 'empresa_id';
  static const String kEmpresaNome = 'empresa_nome';
  static const String kMecanicoId = 'mecanico_id';
  static const String kMecanicoNome = 'mecanico_nome';
  static const String kDeviceToken = 'device_token';
  static const String kDeviceId = 'device_id';

  static Future<void> write(String key, String? value) async {
    try {
      if (value == null) {
        await _storage.delete(key: key);
        log.info('Storage: deletado $key');
        return;
      }
      await _storage.write(key: key, value: value);
      log.info('Storage: escrito $key');
    } catch (e) {
      log.severe('Storage: erro ao escrever $key: $e');
    }
  }

  static Future<String?> read(String key) async {
    try {
      final value = await _storage.read(key: key);
      return value;
    } catch (e) {
      log.severe('Storage: erro ao ler $key: $e');
      return null;
    }
  }

  static Future<void> delete(String key) async {
    try {
      await _storage.delete(key: key);
      log.info('Storage: deletado $key');
    } catch (e) {
      log.severe('Storage: erro ao deletar $key: $e');
    }
  }

  static Future<void> clearSession() async {
    try {
      await _storage.delete(key: kMecanicoId);
      await _storage.delete(key: kMecanicoNome);
      log.info('Storage: sessão limpa');
    } catch (e) {
      log.severe('Storage: erro ao limpar sessão: $e');
    }
  }

  static Future<void> clearAll() async {
    try {
      await _storage.deleteAll();
      log.info('Storage: todos os dados limpos');
    } catch (e) {
      log.severe('Storage: erro ao limpar tudo: $e');
    }
  }
}