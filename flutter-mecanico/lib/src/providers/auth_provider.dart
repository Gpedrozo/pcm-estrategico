import 'package:flutter/material.dart';
import 'package:logging/logging.dart';

import '../services/storage_service.dart';
import '../services/supabase_service.dart';

final log = Logger('Auth');

class AuthProvider extends ChangeNotifier {
  // Estados mutex para evitar race conditions
  bool _isLoadingBind = false;
  bool _isLoadingLogin = false;
  bool _isLoadingSavedState = true;

  bool get isLoading => _isLoadingSavedState || _isLoadingBind || _isLoadingLogin;

  bool isDeviceBound = false;
  bool isLoggedIn = false;
  String? empresaId;
  String? empresaNome;
  String? mecanicoId;
  String? mecanicoNome;
  String? deviceToken;

  /// Retorna true se houver uma operação de bind/dispositivo em andamento
  bool get isBindingDevice => _isLoadingBind;

  /// Retorna true se houver uma operação de login em andamento
  bool get isLoggingIn => _isLoadingLogin;

  Future<void> loadSavedState() async {
    _isLoadingSavedState = true;
    notifyListeners();

    try {
      empresaId = await StorageService.read(StorageService.kEmpresaId);
      empresaNome = await StorageService.read(StorageService.kEmpresaNome);
      mecanicoId = await StorageService.read(StorageService.kMecanicoId);
      mecanicoNome = await StorageService.read(StorageService.kMecanicoNome);
      deviceToken = await StorageService.read(StorageService.kDeviceToken);

      isDeviceBound = empresaId != null && deviceToken != null;
      isLoggedIn = mecanicoId != null;

      log.info('Estado carregado: vinculado=$isDeviceBound, logado=$isLoggedIn');
    } catch (e) {
      log.severe('Erro ao carregar estado salvo: $e');
    } finally {
      _isLoadingSavedState = false;
      notifyListeners();
    }
  }

  Future<String?> bindDevice(String qrToken) async {
    if (_isLoadingBind) {
      log.warning('Bind já em andamento, ignorando chamada');
      return 'Operação em andamento. Aguarde.';
    }

    _isLoadingBind = true;
    notifyListeners();

    try {
      final deviceId = await _getDeviceId();
      final result = await SupabaseService.bindDevice(
        qrToken: qrToken,
        deviceId: deviceId,
        deviceName: 'Flutter Mecânico',
        deviceOs: 'flutter',
      );

      if (!result.ok) {
        return result.error;
      }

      empresaId = result.empresaId;
      empresaNome = result.empresaNome;
      deviceToken = result.deviceToken;
      isDeviceBound = true;

      await StorageService.write(StorageService.kEmpresaId, empresaId);
      await StorageService.write(StorageService.kEmpresaNome, empresaNome);
      await StorageService.write(StorageService.kDeviceToken, deviceToken);

      if (result.refreshToken != null) {
        await SupabaseService.setSession(result.refreshToken!);
      }

      log.info('Dispositivo vinculado com sucesso');
      return null;
    } catch (e) {
      log.severe('Falha ao vincular dispositivo: $e');
      return 'Falha ao vincular o dispositivo. Verifique sua conexão.';
    } finally {
      _isLoadingBind = false;
      notifyListeners();
    }
  }

  Future<String?> login(String codigo, String senha) async {
    if (_isLoadingLogin) {
      log.warning('Login já em andamento, ignorando chamada');
      return 'Operação em andamento. Aguarde.';
    }

    if (empresaId == null) {
      return 'O dispositivo não está vinculado.';
    }

    _isLoadingLogin = true;
    notifyListeners();

    try {
      final result = await SupabaseService.loginMecanico(
        empresaId: empresaId!,
        codigo: codigo,
        senha: senha,
      );

      if (!result.ok) {
        return result.error;
      }

      mecanicoId = result.mecanicoId;
      mecanicoNome = result.mecanicoNome;
      isLoggedIn = true;

      await StorageService.write(StorageService.kMecanicoId, mecanicoId);
      await StorageService.write(StorageService.kMecanicoNome, mecanicoNome);

      if (result.refreshToken != null) {
        await SupabaseService.setSession(result.refreshToken!);
      }

      log.info('Login realizado com sucesso: $codigo');
      return null;
    } catch (e) {
      log.severe('Falha de login: $e');
      return 'Falha de login. Verifique suas credenciais e conexão.';
    } finally {
      _isLoadingLogin = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    log.info('Realizando logout');
    await SupabaseService.signOut();
    isLoggedIn = false;
    mecanicoId = null;
    mecanicoNome = null;
    await StorageService.clearSession();
    notifyListeners();
  }

  Future<String> _getDeviceId() async {
    final existing = await StorageService.read(StorageService.kDeviceId);
    if (existing != null && existing.isNotEmpty) return existing;

    // Gera UUID v4 manualmente (evita dependência externa para MVP)
    final timestamp = DateTime.now().microsecondsSinceEpoch;
    final random = timestamp % 99999999;
    final generated = 'flutter-${timestamp}_$random';
    await StorageService.write(StorageService.kDeviceId, generated);
    log.info('Device ID gerado: $generated');
    return generated;
  }
}