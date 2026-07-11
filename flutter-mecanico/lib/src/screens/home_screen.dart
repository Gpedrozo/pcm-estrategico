import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/ordem_servico.dart';
import '../providers/auth_provider.dart';
import '../services/supabase_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<OrdemServico>> _ordersFuture;
  final _searchController = TextEditingController();
  Timer? _debounce;

  /// Filtro de status. `null` significa "todos os abertos".
  List<String>? _statusFilter;

  @override
  void initState() {
    super.initState();
    // Usa addPostFrameCallback para garantir que o provider esteja na árvore
    WidgetsBinding.instance.addPostFrameCallback((_) => _reload());
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _reload() async {
    final auth = context.read<AuthProvider>();

    // Verifica null safety antes de usar empresaId
    final empresaId = auth.empresaId;
    if (empresaId == null) {
      setState(() {
        _ordersFuture = Future.error('Dispositivo não vinculado a uma empresa.');
      });
      return;
    }

    if (!mounted) return;
    setState(() {
      _ordersFuture = SupabaseService.fetchOrders(
        empresaId,
        statuses: _statusFilter,
        search: _searchController.text,
      );
    });
  }

  void _onSearchChanged(String _) {
    _debounce?.cancel();
    if (!mounted) return;
    _debounce = Timer(const Duration(milliseconds: 600), _reload);
  }

  Future<void> _abrirFiltros() async {
    final selected = await showModalBottomSheet<List<String>?>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        final current = _statusFilter ?? OsStatus.todosAbertos;
        final temp = <String>{...current};
        return StatefulBuilder(
          builder: (ctx, setSt) => Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Filtrar por status',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ...OsStatus.labels.entries.map(
                  (e) => CheckboxListTile(
                    value: temp.contains(e.key),
                    title: Text(e.value),
                    onChanged: (v) {
                      setSt(() {
                        if (v == true) {
                          temp.add(e.key);
                        } else {
                          temp.remove(e.key);
                        }
                      });
                    },
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(ctx, <String>[]),
                        child: const Text('Limpar (todos)'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: () => Navigator.pop(ctx, temp.toList()),
                        child: const Text('Aplicar'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );

    if (selected == null) return;
    if (!mounted) return;
    setState(() {
      _statusFilter = selected.isEmpty ? null : selected;
    });
    _reload();
  }

  Color _statusColor(String? status) {
    switch (status) {
      case OsStatus.aberta:
        return Colors.blue;
      case OsStatus.emAndamento:
        return Colors.orange;
      case OsStatus.aguardandoMaterial:
        return Colors.purple;
      case OsStatus.concluida:
        return Colors.green;
      case OsStatus.cancelada:
        return Colors.grey;
      default:
        return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ordens de Serviço'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _abrirFiltros,
            tooltip: 'Filtros',
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: auth.logout,
            tooltip: 'Sair',
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Empresa: ${auth.empresaNome ?? '-'}',
                style: const TextStyle(fontSize: 16)),
            const SizedBox(height: 4),
            Text('Técnico: ${auth.mecanicoNome ?? '-'}',
                style: const TextStyle(fontSize: 16)),
            const SizedBox(height: 12),
            TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Buscar tag, equipamento ou problema...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _reload();
                        },
                      ),
                border: const OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: FutureBuilder<List<OrdemServico>>(
                future: _ordersFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  if (snapshot.hasError) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline, size: 48, color: Colors.red),
                          const SizedBox(height: 8),
                          Text(
                            snapshot.error?.toString() ?? 'Erro ao buscar ordens.',
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton(
                              onPressed: _reload,
                              child: const Text('Recarregar')),
                        ],
                      ),
                    );
                  }

                  final orders = snapshot.data ?? [];
                  if (orders.isEmpty) {
                    return RefreshIndicator(
                      onRefresh: _reload,
                      child: ListView(
                        children: const [
                          SizedBox(height: 80),
                          Center(child: Text('Nenhuma ordem encontrada.')),
                        ],
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: _reload,
                    child: ListView.separated(
                      itemCount: orders.length,
                      separatorBuilder: (_, __) => const Divider(),
                      itemBuilder: (context, index) {
                        final ordem = orders[index];
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor: _statusColor(ordem.status),
                            child: const Icon(Icons.build,
                                color: Colors.white, size: 20),
                          ),
                          title: Text(ordem.tag ?? 'Ordem sem tag'),
                          subtitle: Text(
                            '${ordem.equipamento ?? '-'}\n'
                            '${ordem.tipo ?? '-'} • ${OsStatus.labels[ordem.status] ?? ordem.status ?? '-'}',
                          ),
                          isThreeLine: true,
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () async {
                            await Navigator.pushNamed(
                              context,
                              '/detail',
                              arguments: ordem.id,
                            );
                            _reload();
                          },
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'create',
        onPressed: () async {
          await Navigator.pushNamed(context, '/create');
          _reload();
        },
        icon: const Icon(Icons.add),
        label: const Text('Nova OS'),
      ),
    );
  }
}