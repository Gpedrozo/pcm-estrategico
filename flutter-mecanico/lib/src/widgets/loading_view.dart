import 'dart:async';

import 'package:flutter/material.dart';

class LoadingView extends StatefulWidget {
  final String? message;

  const LoadingView({super.key, this.message});

  @override
  State<LoadingView> createState() => _LoadingViewState();
}

class _LoadingViewState extends State<LoadingView> {
  Timer? _timeoutTimer;
  bool _timedOut = false;

  @override
  void initState() {
    super.initState();
    // Timeout de 30 segundos para o loading não travar para sempre
    _timeoutTimer = Timer(const Duration(seconds: 30), () {
      if (mounted) {
        setState(() => _timedOut = true);
      }
    });
  }

  @override
  void dispose() {
    _timeoutTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              if (widget.message != null) ...[
                const SizedBox(height: 16),
                Text(
                  widget.message!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16),
                ),
              ],
              if (_timedOut) ...[
                const SizedBox(height: 16),
                const Text(
                  'A operação está demorando mais que o esperado.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.orange),
                ),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: () {
                    setState(() => _timedOut = false);
                    _timeoutTimer = Timer(const Duration(seconds: 30), () {
                      if (mounted) {
                        setState(() => _timedOut = true);
                      }
                    });
                  },
                  child: const Text('Continuar aguardando'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}