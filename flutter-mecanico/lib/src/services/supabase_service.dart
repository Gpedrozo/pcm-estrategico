import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/ordem_servico.dart';

final _client = Supabase.instance.client;

class RPCResult {
  final bool ok;
  final String? error;
  final String? empresaId;
  final String? empresaNome;
  final String? deviceToken;
  final String? accessToken;
  final String? refreshToken;
  final String? mecanicoId;
  final String? mecanicoNome;

  RPCResult({
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
class OSStatus {
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
  static Future<void> setSession(String refreshToken) async {
    await _client.auth.setSession(refreshToken);
  }

  static Future<RPCResult> bindDevice({
    required String qrToken,
    required String deviceId,
    required String deviceName,
    required String deviceOs,
  }) async {
    try {
      final response = await _client.rpc('vincular_dispositivo', params: {
        'p_qr_token': qrToken,
        'p_device_id': deviceId,
        'p_device_nome': deviceName,
        'p_device_os': deviceOs,
      });

      final data = response.data;
      if (data == null) {
        return RPCResult(ok: false, error: 'Resposta inesperada do servidor.');
      }

      return RPCResult(
        ok: true,
        empresaId: data['empresa_id']?.toString(),
        empresaNome: data['empresa_nome']?.toString(),
        deviceToken: data['device_token']?.toString(),
        accessToken: data['access_token']?.toString(),
        refreshToken: data['refresh_token']?.toString(),
      );
    } on PostgrestException catch (error) {
      return RPCResult(ok: false, error: error.message);
    }
  }

  static Future<RPCResult> loginMecanico({
    required String empresaId,
    required String codigo,
    required String senha,
  }) async {
    try {
      final response = await _client.rpc('login_mecanico', params: {
        'p_empresa_id': empresaId,
        'p_codigo': codigo,
        'p_senha': senha,
      });

      final data = response.data;
      if (data == null) {
        return RPCResult(ok: false, error: 'Resposta inesperada do servidor.');
      }

      return RPCResult(
        ok: true,
        mecanicoId: data['mecanico_id']?.toString(),
        mecanicoNome: data['mecanico_nome']?.toString(),
        accessToken: data['access_token']?.toString(),
        refreshToken: data['refresh_token']?.toString(),
      );
    } on PostgrestException catch (error) {
      return RPCResult(ok: false, error: error.message);
    }
  }

  /// Busca ordens com filtros opcionais (status e termo de busca em tag/equipamento).
  static Future<List<OrdemServico>> fetchOrders(
    String empresaId, {
    List<String>? statuses,
    String? search,
  }) async {
    var query = _client
        .from('ordens_servico')
        .select('*')
        .eq('empresa_id', empresaId);

    final statusList = statuses ?? OSStatus.todosAbertos;
    if (statusList.isNotEmpty) {
      query = query.in_('status', statusList);
    }

    if (search != null && search.trim().isNotEmpty) {
      final s = search.trim();
      query = query.or('tag.ilike.%$s%,equipamento.ilike.%$s%,problema.ilike.%$s%');
    }

    final response = await query.order('data_solicitacao', ascending: false);
    final records = (response.data as List<dynamic>?) ?? [];
    return records.map((item) => OrdemServico.fromMap(item)).toList();
  }

  /// Mantido por compatibilidade (telas antigas).
  static Future<List<OrdemServico>> fetchOpenOrders(String empresaId) {
    return fetchOrders(empresaId, statuses: OSStatus.todosAbertos);
  }

  static Future<OrdemServico?> fetchOrder(String orderId) async {
    final response =
        await _client.from('ordens_servico').select('*').eq('id', orderId).single();
    if (response.data == null) return null;
    return OrdemServico.fromMap(response.data as Map<String, dynamic>);
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
    final response = await _client.from('ordens_servico').insert({
      'empresa_id': empresaId,
      'tipo': tipo,
      'prioridade': prioridade,
      'status': OSStatus.aberta,
      'tag': tag,
      'equipamento': equipamento,
      'problema': problema,
      'solicitante': solicitante,
      'data_solicitacao': DateTime.now().toIso8601String(),
    });

    return response.error == null;
  }

  /// Atualiza o status de uma OS (ex.: iniciar/pausar/concluir).
  static Future<bool> updateOrderStatus({
    required String orderId,
    required String newStatus,
  }) async {
    final response = await _client
        .from('ordens_servico')
        .update({'status': newStatus})
        .eq('id', orderId);
    return response.error == null;
  }

  static Future<bool> requestMaterial({
    required String empresaId,
    required String osId,
    required String descricao,
    required int quantidade,
  }) async {
    final response = await _client.from('requisicoes_material').insert({
      'empresa_id': empresaId,
      'os_id': osId,
      'descricao_livre': descricao,
      'quantidade': quantidade,
      'status': 'PENDENTE',
      'created_at': DateTime.now().toIso8601String(),
    });

    return response.error == null;
  }

  static Future<void> signOut() async {
    await _client.auth.signOut();
  }
}
