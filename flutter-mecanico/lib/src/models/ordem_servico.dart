import 'package:intl/intl.dart';

class OrdemServico {
  final String? id;
  final String? empresaId;
  final String? tipo;
  final String? prioridade;
  final String? status;
  final String? tag;
  final String? equipamento;
  final String? problema;
  final String? solicitante;
  final DateTime? dataSolicitacao;

  OrdemServico({
    this.id,
    this.empresaId,
    this.tipo,
    this.prioridade,
    this.status,
    this.tag,
    this.equipamento,
    this.problema,
    this.solicitante,
    this.dataSolicitacao,
  });

  factory OrdemServico.fromMap(Map<String, dynamic> map) {
    DateTime? parsedDate;
    final raw = map['data_solicitacao']?.toString();
    if (raw != null && raw.isNotEmpty) {
      parsedDate = DateTime.tryParse(raw);
      if (parsedDate == null) {
        // Tenta formato alternativo caso o ISO 8601 falhe
        parsedDate = _tryParseAlternateDate(raw);
      }
    }

    return OrdemServico(
      id: map['id']?.toString(),
      empresaId: map['empresa_id']?.toString(),
      tipo: map['tipo']?.toString(),
      prioridade: map['prioridade']?.toString(),
      status: map['status']?.toString(),
      tag: map['tag']?.toString(),
      equipamento: map['equipamento']?.toString(),
      problema: map['problema']?.toString(),
      solicitante: map['solicitante']?.toString(),
      dataSolicitacao: parsedDate,
    );
  }

  /// Converte o modelo para Map para operações de insert/update
  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      if (empresaId != null) 'empresa_id': empresaId,
      if (tipo != null) 'tipo': tipo,
      if (prioridade != null) 'prioridade': prioridade,
      if (status != null) 'status': status,
      if (tag != null) 'tag': tag,
      if (equipamento != null) 'equipamento': equipamento,
      if (problema != null) 'problema': problema,
      if (solicitante != null) 'solicitante': solicitante,
      if (dataSolicitacao != null)
        'data_solicitacao': dataSolicitacao!.toIso8601String(),
    };
  }

  /// Cria uma cópia do modelo com campos alterados
  OrdemServico copyWith({
    String? id,
    String? empresaId,
    String? tipo,
    String? prioridade,
    String? status,
    String? tag,
    String? equipamento,
    String? problema,
    String? solicitante,
    DateTime? dataSolicitacao,
  }) {
    return OrdemServico(
      id: id ?? this.id,
      empresaId: empresaId ?? this.empresaId,
      tipo: tipo ?? this.tipo,
      prioridade: prioridade ?? this.prioridade,
      status: status ?? this.status,
      tag: tag ?? this.tag,
      equipamento: equipamento ?? this.equipamento,
      problema: problema ?? this.problema,
      solicitante: solicitante ?? this.solicitante,
      dataSolicitacao: dataSolicitacao ?? this.dataSolicitacao,
    );
  }

  /// Tenta parsear data em formatos alternativos
  static DateTime? _tryParseAlternateDate(String raw) {
    // Formato brasileiro: dd/MM/yyyy HH:mm
    try {
      return DateFormat('dd/MM/yyyy HH:mm').parse(raw);
    } catch (_) {}
    // Formato americano: MM/dd/yyyy HH:mm
    try {
      return DateFormat('MM/dd/yyyy HH:mm').parse(raw);
    } catch (_) {}
    return null;
  }

  String get dataSolicitacaoFormatada {
    final d = dataSolicitacao;
    if (d == null) return '-';
    return DateFormat('dd/MM/yyyy HH:mm').format(d);
  }
}