import 'package:logging/logging.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/ordem_servico.dart';

final log = Logger('Supabase');

final _client = Supabase.instance.client;

class RpcResult {
  final bool ok;
  final String? error;
  final String? empresaId;
  final String? empresaNome;
  final String? deviceToken;
  final String? accessToken;
  final String? refreshToken;
  final String? mecanicoId;
  final String? mecanicoNome;

  RpcResult({
    required this.ok,
    this.error,
    this.empresaId,
    this.empresaNome,
    this.deviceToken,
    this.accessToken,
    this.refreshToken,
    this.mecanicoId,
    this.mecanicoNome,
  });
}

/// Status válidos das OS – usados em filtros e na tela de detalhe.
class OsStatus {
  static const aberta = 'ABERTA';
  static const emAndamento = 'EM_ANDAMENTO';
  static const aguardandoMaterial = 'AGUARDANDO_MATERIAL';
  static const concluida = 'CONCLUIDA';
  static const cancelada = 'CANCELADA';

  static const todosAbertos = [aberta, emAndamento, aguardandoMaterial];

  static const labels = <String, String>{
    aberta: 'Aberta',
    emAndamento: 'Em andamento',
    aguardandoMaterial: 'Aguardando material',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
  };
}

class SupabaseService {
  /// Restaura a sessão do Supabase a partir do refresh token.
  /// No supabase_flutter v1.4.0, setSession aceita uma String (refreshToken).
  static Future<bool> setSession(String refreshToken) async {
    try {
      await _client.auth.setSession(refreshToken);
      log.info('Sessão restaurada com sucesso');
      return true;
    } catch (e) {
      log.severe('Falha ao restaurar sessão: $e');
      return false;
    }
  }

  static Future<RpcResult> bindDevice({
    required String qrToken,
    required String deviceId,
    required String deviceName,
    required String deviceOs,
  }) async {
    try {
      log.info('Vinculando dispositivo: $deviceId');
      final response = await _client.rpc('vincular_dispositivo', params: {
        'p_qr_token': qrToken,
        'p_device_id': deviceId,
        'p_device_nome': deviceName,
        'p_device_os': deviceOs,
      });

      final data = response.data;
      if (data == null) {
        log.warning('Resposta inesperada do servidor ao vincular dispositivo');
        return RpcResult(ok: false, error: 'Resposta inesperada do servidor.');
      }

      return RpcResult(
        ok: true,
        empresaId: data['empresa_id']?.toString(),
        empresaNome: data['empresa_nome']?.toString(),
        deviceToken: data['device_token']?.toString(),
        accessToken: data['access_token']?.toString(),
        refreshToken: data['refresh_token']?.toString(),
      );
    } on PostgrestException catch (error) {
      log.severe('Erro Postgrest ao vincular dispositivo: ${error.message}');
      return RpcResult(ok: false, error: error.message);
    } catch (e) {
      log.severe('Erro inesperado ao vincular dispositivo: $e');
      return RpcResult(ok: false, error: 'Erro de conexão. Verifique sua internet.');
    }
  }

  static Future<RpcResult> loginMecanico({
    required String empresaId,
    required String codigo,
    required String senha,
  }) async {
    try {
      log.info('Realizando login do mecânico: $codigo');
      final response = await _client.rpc('login_mecanico', params: {
        'p_empresa_id': empresaId,
        'p_codigo': codigo,
        'p_senha': senha,
      });

      final data = response.data;
      if (data == null) {
        log.warning('Resposta inesperada do servidor ao fazer login');
        return RpcResult(ok: false, error: 'Resposta inesperada do servidor.');
      }

      return RpcResult(
        ok: true,
        mecanicoId: data['mecanico_id']?.toString(),
        mecanicoNome: data['mecanico_nome']?.toString(),
        accessToken: data['access_token']?.toString(),
        refreshToken: data['refresh_token']?.toString(),
      );
    } on PostgrestException catch (error) {
      log.severe('Erro Postgrest ao fazer login: ${error.message}');
      return RpcResult(ok: false, error: error.message);
    } catch (e) {
      log.severe('Erro inesperado ao fazer login: $e');
      return RpcResult(ok: false, error: 'Erro de conexão. Verifique sua internet.');
    }
  }

  /// Busca ordens com filtros opcionais (status e termo de busca em tag/equipamento).
  /// Suporta paginação via [page] e [pageSize].
  static Future<List<OrdemServico>> fetchOrders(
    String empresaId, {
    List<String>? statuses,
    String? search,
    int page = 1,
    int pageSize = 50,
  }) async {
    try {
      log.info('Buscando ordens para empresa: $empresaId (página $page)');
      var query = _client
          .from('ordens_servico')
          .select('*')
          .eq('empresa_id', empresaId);

      final statusList = statuses ?? OsStatus.todosAbertos;
      if (statusList.isNotEmpty) {
        query = query.in_('status', statusList);
      }

      if (search != null && search.trim().isNotEmpty) {
        final s = search.trim();
        // Sanitiza caracteres especiais para evitar injeção
        final sanitized = s.replaceAll("'", "''").replaceAll('%', '\\%');
        query = query.or(
            'tag.ilike.%$sanitized%,equipamento.ilike.%$sanitized%,problema.ilike.%$sanitized%');
      }

      // Paginação
      final from = (page - 1) * pageSize;
      final to = from + pageSize - 1;

      final response = await query
          .order('data_solicitacao', ascending: false)
          .range(from, to);

      final records = (response.data as List<dynamic>?) ?? [];
      log.info('Ordens encontradas: ${records.length}');
      return records.map((item) => OrdemServico.fromMap(item)).toList();
    } catch (e) {
      log.severe('Erro ao buscar ordens: $e');
      rethrow;
    }
  }

  /// Mantido por compatibilidade (telas antigas).
  static Future<List<OrdemServico>> fetchOpenOrders(String empresaId) {
    return fetchOrders(empresaId, statuses: OsStatus.todosAbertos);
  }

  static Future<OrdemServico?> fetchOrder(String orderId) async {
    try {
      log.info('Buscando ordem: $orderId');
      final response = await _client
          .from('ordens_servico')
          .select('*')
          .eq('id', orderId)
          .single();
      if (response.data == null) {
        log.warning('Ordem não encontrada: $orderId');
        return null;
      }
      return OrdemServico.fromMap(response.data as Map<String, dynamic>);
    } on PostgrestException catch (e) {
      log.severe('Erro Postgrest ao buscar ordem: ${e.message}');
      return null;
    } catch (e) {
      log.severe('Erro inesperado ao buscar ordem: $e');
      return null;
    }
  }

  static Future<bool> createOrder({
    required String empresaId,
    required String tipo,
    required String prioridade,
    required String tag,
    required String equipamento,
    required String problema,
    required String solicitante,
  }) async {
    try {
      log.info('Criando ordem de serviço');
      final response = await _client.from('ordens_servico').insert({
        'empresa_id': empresaId,
        'tipo': tipo,
        'prioridade': prioridade,
        'status': OsStatus.aberta,
        'tag': tag,
        'equipamento': equipamento,
        'problema': problema,
        'solicitante': solicitante,
        'data_solicitacao': DateTime.now().toIso8601String(),
      });

      if (response.error != null) {
        log.severe('Erro ao criar ordem: ${response.error!.message}');
      }
      return response.error == null;
    } catch (e) {
      log.severe('Erro inesperado ao criar ordem: $e');
      return false;
    }
  }

  /// Atualiza o status de uma OS (ex.: iniciar/pausar/concluir).
  static Future<bool> updateOrderStatus({
    required String orderId,
    required String newStatus,
  }) async {
    try {
      log.info('Atualizando status da ordem $orderId para $newStatus');
      final response = await _client
          .from('ordens_servico')
          .update({'status': newStatus})
          .eq('id', orderId);

      if (response.error != null) {
        log.severe(
            'Erro ao atualizar status: ${response.error!.message}');
      }
      return response.error == null;
    } catch (e) {
      log.severe('Erro inesperado ao atualizar status: $e');
      return false;
    }
  }

  static Future<bool> requestMaterial({
    required String empresaId,
    required String osId,
    required String descricao,
    required int quantidade,
  }) async {
    try {
      log.info('Solicitando material para OS $osId');
      final response = await _client.from('requisicoes_material').insert({
        'empresa_id': empresaId,
        'os_id': osId,
        'descricao_livre': descricao,
        'quantidade': quantidade,
        'status': 'PENDENTE',
        'created_at': DateTime.now().toIso8601String(),
      });

      if (response.error != null) {
        log.severe(
            'Erro ao solicitar material: ${response.error!.message}');
      }
      return response.error == null;
    } catch (e) {
      log.severe('Erro inesperado ao solicitar material: $e');
      return false;
    }
  }

  static Future<void> signOut() async {
    try {
      log.info('Realizando logout');
      await _client.auth.signOut();
    } catch (e) {
      log.severe('Erro ao fazer logout: $e');
    }
  }
}