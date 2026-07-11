import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/supabase_service.dart';

class CreateOSScreen extends StatefulWidget {
  const CreateOSScreen({super.key});

  @override
  State<CreateOSScreen> createState() => _CreateOSScreenState();
}

class _CreateOSScreenState extends State<CreateOSScreen> {
  final _formKey = GlobalKey<FormState>();
  final _tagController = TextEditingController();
  final _equipamentoController = TextEditingController();
  final _problemaController = TextEditingController();
  final _solicitanteController = TextEditingController();
  String _tipo = 'Corretiva';
  String _prioridade = 'Normal';
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _tagController.dispose();
    _equipamentoController.dispose();
    _problemaController.dispose();
    _solicitanteController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();

    // Verifica null safety
    final empresaId = auth.empresaId;
    if (empresaId == null) {
      setState(() => _error = 'Dispositivo não vinculado a uma empresa.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final success = await SupabaseService.createOrder(
        empresaId: empresaId,
        tipo: _tipo,
        prioridade: _prioridade,
        tag: _tagController.text.trim(),
        equipamento: _equipamentoController.text.trim(),
        problema: _problemaController.text.trim(),
        solicitante: _solicitanteController.text.trim(),
      );

      if (!mounted) return;

      if (!success) {
        setState(() => _error = 'Falha ao criar a ordem de serviço. Tente novamente.');
        return;
      }

      // Feedback de sucesso antes de navegar
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ordem de serviço criada com sucesso!')),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Erro inesperado. Tente novamente.');
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nova Ordem de Serviço')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              DropdownButtonFormField<String>(
                value: _tipo,
                items: const [
                  DropdownMenuItem(value: 'Corretiva', child: Text('Corretiva')),
                  DropdownMenuItem(value: 'Preventiva', child: Text('Preventiva')),
                ],
                onChanged: (value) => setState(() => _tipo = value ?? _tipo),
                decoration: const InputDecoration(
                  labelText: 'Tipo',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.category),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _prioridade,
                items: const [
                  DropdownMenuItem(value: 'Normal', child: Text('Normal')),
                  DropdownMenuItem(value: 'Urgente', child: Text('Urgente')),
                ],
                onChanged: (value) => setState(() => _prioridade = value ?? _prioridade),
                decoration: const InputDecoration(
                  labelText: 'Prioridade',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.priority_high),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _tagController,
                decoration: const InputDecoration(
                  labelText: 'Tag',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.label),
                ),
                validator: (value) => value?.trim().isEmpty == true ? 'Informe a tag da OS' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _equipamentoController,
                decoration: const InputDecoration(
                  labelText: 'Equipamento',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.precision_manufacturing),
                ),
                validator: (value) => value?.trim().isEmpty == true ? 'Informe o equipamento' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _problemaController,
                decoration: const InputDecoration(
                  labelText: 'Problema',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.report_problem),
                ),
                maxLines: 3,
                validator: (value) => value?.trim().isEmpty == true ? 'Descreva o problema' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _solicitanteController,
                decoration: const InputDecoration(
                  labelText: 'Solicitante',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (value) => value?.trim().isEmpty == true ? 'Informe o solicitante' : null,
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: Colors.red)),
              ],
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Criar Ordem'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}