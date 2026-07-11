import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:flutter_mecanico/src/app.dart';
import 'package:flutter_mecanico/src/providers/auth_provider.dart';

/// Teste smoke básico que verifica se o App carrega sem erros.
/// Usa um AuthProvider mockado para evitar dependências reais.
void main() {
  testWidgets('App deve carregar e mostrar tela de loading inicial',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => AuthProvider(),
        child: const MaterialApp(
          home: RootScreen(),
        ),
      ),
    );

    // Deve mostrar o CircularProgressIndicator inicial (isLoading = true)
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    // Aguarda um frame para processar o estado inicial
    await tester.pump();
  });

  testWidgets('AuthProvider deve iniciar com estados corretos',
      (WidgetTester tester) async {
    final authProvider = AuthProvider();

    // Estado inicial
    expect(authProvider.isLoading, true);
    expect(authProvider.isDeviceBound, false);
    expect(authProvider.isLoggedIn, false);
    expect(authProvider.empresaId, null);
    expect(authProvider.mecanicoId, null);
  });
}