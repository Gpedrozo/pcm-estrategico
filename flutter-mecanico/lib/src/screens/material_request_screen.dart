import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/supabase_service.dart';

class MaterialRequestScreen extends StatefulWidget {
  final String osId;

  const MaterialRequestScreen({super.key, required this.osId});

  @override
  State<MaterialRequestScreen> createState() => _MaterialRequestScreenState();
}

class _MaterialRequestScreenState extends State<MaterialRequestScreen> {
  final _descricaoController = TextEditingController();
  final _quantidadeController = TextEditingController();
  String? _error;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _descricaoController.dispose();
    _quantidadeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    final auth = context.read<AuthProvider>();
    final descricao = _descricaoController.text.trim();

    // Validação em tempo real mais robusta
    final quantidadeText = _quantidadeController.text.trim();
    final quantidade = int.tryParse(quantidadeText);

    if (descricao.isEmpty) {
      setState(() => _error = 'Informe a descrição do material.');
      return;
    }

    if (descricao.length < 5) {
      setState(() => _error = 'Descreva o material com pelo menos 5 caracteres.');
      return;
    }

    if (quantidade == null || quantidade <= 0) {
      setState(() => _error = 'Informe uma quantidade válida (número inteiro positivo).');
      return;
    }

    if (quantidade > 99999) {
      setState(() => _error = 'Quantidade máxima permitida é 99.999.');
      return;
    }

    // Verifica null safety
    final empresaId = auth.empresaId;
    if (empresaId == null) {
      setState(() => _error = 'Dispositivo não vinculado a uma empresa.');
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final success = await SupabaseService.requestMaterial(
        empresaId: empresaId,
        osId: widget.osId,
        descricao: descricao,
        quantidade: quantidade,
      );

      if (!mounted) return;

      if (!success) {
        setState(() => _error = 'Falha ao registrar a solicitação de material.');
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Solicitação registrada com sucesso!')),
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
      appBar: AppBar(title: const Text('Solicitar Material')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text('OS: ${widget.osId}',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
            TextFormField(
              controller: _descricaoController,
              decoration: const InputDecoration(
                  labelText: 'Descrição',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.description)),
              maxLines: 3,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _quantidadeController,
              decoration: const InputDecoration(
                  labelText: 'Quantidade',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.numbers)),
              keyboardType: TextInputType.number,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Enviar Solicitação'),
            ),
          ],
        ),
      ),
    );
  }
}