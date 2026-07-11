import 'package:flutter/material.dart';

import '../models/ordem_servico.dart';
import '../services/supabase_service.dart';

class OSDetailScreen extends StatefulWidget {
  final String orderId;

  const OSDetailScreen({super.key, required this.orderId});

  @override
  State<OSDetailScreen> createState() => _OSDetailScreenState();
}

class _OSDetailScreenState extends State<OSDetailScreen> {
  Future<OrdemServico?>? _future;
  bool _updating = false;

  @override
  void initState() {
    super.initState();
    _future = SupabaseService.fetchOrder(widget.orderId);
  }

  Future<void> _reload() async {
    setState(() {
      _future = SupabaseService.fetchOrder(widget.orderId);
    });
  }

  Future<void> _changeStatus(String newStatus) async {
    setState(() => _updating = true);
    try {
      final ok = await SupabaseService.updateOrderStatus(
        orderId: widget.orderId,
        newStatus: newStatus,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ok
              ? 'Status atualizado para ${OsStatus.labels[newStatus] ?? newStatus}.'
              : 'Falha ao atualizar status.'),
        ),
      );
      if (ok) await _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Erro ao atualizar status. Tente novamente.')),
      );
    } finally {
      if (mounted) {
        setState(() => _updating = false);
      }
    }
  }

  List<Widget> _statusActions(String? current) {
    final actions = <Widget>[];
    void add(String target, IconData icon, String label, Color color) {
      actions.add(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: color),
              onPressed: _updating ? null : () => _changeStatus(target),
              icon: Icon(icon),
              label: Text(label),
            ),
          ),
        ),
      );
    }

    switch (current) {
      case OsStatus.aberta:
        add(OsStatus.emAndamento, Icons.play_arrow, 'Iniciar atendimento',
            Colors.orange);
        add(OsStatus.cancelada, Icons.cancel, 'Cancelar', Colors.grey);
        break;
      case OsStatus.emAndamento:
        add(OsStatus.aguardandoMaterial, Icons.pause_circle,
            'Aguardar material', Colors.purple);
        add(OsStatus.concluida, Icons.check_circle, 'Concluir', Colors.green);
        break;
      case OsStatus.aguardandoMaterial:
        add(OsStatus.emAndamento, Icons.play_arrow, 'Retomar', Colors.orange);
        add(OsStatus.concluida, Icons.check_circle, 'Concluir', Colors.green);
        break;
      case OsStatus.concluida:
      case OsStatus.cancelada:
        actions.add(const Padding(
          padding: EdgeInsets.symmetric(vertical: 8),
          child: Text('Esta ordem já foi finalizada.',
              style: TextStyle(fontStyle: FontStyle.italic)),
        ));
        break;
      default:
        add(OsStatus.emAndamento, Icons.play_arrow, 'Iniciar atendimento',
            Colors.orange);
    }
    return actions;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalhes da OS'),
        actions: [
          IconButton(
            tooltip: 'Recarregar',
            onPressed: _reload,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: FutureBuilder<OrdemServico?>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          final ordem = snapshot.data;
          if (ordem == null) {
            return const Center(child: Text('Ordem não encontrada.'));
          }

          return Padding(
            padding: const EdgeInsets.all(16),
            child: ListView(
              children: [
                _detailTile('ID', ordem.id ?? '-'),
                _detailTile('Tag', ordem.tag ?? '-'),
                _detailTile('Tipo', ordem.tipo ?? '-'),
                _detailTile('Prioridade', ordem.prioridade ?? '-'),
                _detailTile('Status',
                    OsStatus.labels[ordem.status] ?? ordem.status ?? '-'),
                _detailTile('Equipamento', ordem.equipamento ?? '-'),
                _detailTile('Problema', ordem.problema ?? '-'),
                _detailTile('Solicitante', ordem.solicitante ?? '-'),
                _detailTile('Data', ordem.dataSolicitacaoFormatada),
                const SizedBox(height: 12),
                const Divider(),
                const SizedBox(height: 8),
                const Text('Ações',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 8),
                ..._statusActions(ordem.status),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: _updating
                      ? null
                      : () => Navigator.pushNamed(
                            context,
                            '/material',
                            arguments: ordem.id,
                          ),
                  icon: const Icon(Icons.inventory),
                  label: const Text('Solicitar material para esta OS'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _detailTile(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 16)),
        ],
      ),
    );
  }
}