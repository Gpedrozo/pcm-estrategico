import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';

class DeviceBindingScreen extends StatefulWidget {
  const DeviceBindingScreen({super.key});

  @override
  State<DeviceBindingScreen> createState() => _DeviceBindingScreenState();
}

class _DeviceBindingScreenState extends State<DeviceBindingScreen> {
  final _tokenController = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
  }

  Future<void> _bindDevice() async {
    setState(() => _error = null);
    final auth = context.read<AuthProvider>();
    final token = _tokenController.text.trim();

    if (token.isEmpty) {
      setState(() => _error = 'Informe o código do QR ou token de vínculo.');
      return;
    }

    // Validação de formato mínimo do token
    if (token.length < 5) {
      setState(() => _error = 'Token inválido. O token deve ter pelo menos 5 caracteres.');
      return;
    }

    final result = await auth.bindDevice(token);
    if (!mounted) return;

    if (result != null) {
      setState(() => _error = result);
    } else {
      // Feedback de sucesso
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Dispositivo vinculado com sucesso!')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Vincular Dispositivo')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.link, size: 64, color: Colors.indigo),
            const SizedBox(height: 16),
            const Text(
              'Para usar o app, vincule este dispositivo à sua empresa.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _tokenController,
              decoration: const InputDecoration(
                labelText: 'Token / QR',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.qr_code),
              ),
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _bindDevice(),
            ),
            const SizedBox(height: 16),
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(_error!,
                          style: const TextStyle(color: Colors.red)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            ElevatedButton.icon(
              onPressed: auth.isLoading ? null : _bindDevice,
              icon: auth.isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.link),
              label: Text(auth.isLoading ? 'Vinculando...' : 'Vincular Dispositivo'),
            ),
          ],
        ),
      ),
    );
  }
}