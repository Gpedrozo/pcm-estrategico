import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/auth_provider.dart';
import 'screens/create_os_screen.dart';
import 'screens/device_binding_screen.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/material_request_screen.dart';
import 'screens/os_detail_screen.dart';
import 'widgets/loading_view.dart';

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider()..loadSavedState(),
      child: MaterialApp(
        title: 'PCM Mecânico',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
          useMaterial3: true,
          scaffoldBackgroundColor: const Color(0xFFF4F6FB),
        ),
        initialRoute: '/',
        onGenerateRoute: (settings) {
          // Rotas nomeadas com typed arguments
          switch (settings.name) {
            case '/':
              return MaterialPageRoute(
                builder: (_) => const RootScreen(),
                settings: settings,
              );
            case '/detail':
              final orderId = settings.arguments as String?;
              if (orderId == null) {
                return MaterialPageRoute(
                  builder: (_) => const _NotFoundScreen(
                    message: 'ID da ordem não informado.',
                  ),
                  settings: settings,
                );
              }
              return MaterialPageRoute(
                builder: (_) => OSDetailScreen(orderId: orderId),
                settings: settings,
              );
            case '/create':
              return MaterialPageRoute(
                builder: (_) => const CreateOSScreen(),
                settings: settings,
              );
            case '/material':
              final osId = settings.arguments as String?;
              if (osId == null) {
                return MaterialPageRoute(
                  builder: (_) => const _NotFoundScreen(
                    message: 'ID da OS não informado.',
                  ),
                  settings: settings,
                );
              }
              return MaterialPageRoute(
                builder: (_) => MaterialRequestScreen(osId: osId),
                settings: settings,
              );
            default:
              return MaterialPageRoute(
                builder: (_) => const _NotFoundScreen(),
                settings: settings,
              );
          }
        },
      ),
    );
  }
}

class _NotFoundScreen extends StatelessWidget {
  final String? message;

  const _NotFoundScreen({this.message});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Página não encontrada')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                message ?? 'A página solicitada não existe.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 18),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/',
                  (route) => false,
                ),
                child: const Text('Ir para o início'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class RootScreen extends StatelessWidget {
  const RootScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Usa context.select para escutar apenas propriedades específicas
    // evitando rebuilds desnecessários de toda a árvore
    final isLoading = context.select<AuthProvider, bool>((a) => a.isLoading);
    final isDeviceBound =
        context.select<AuthProvider, bool>((a) => a.isDeviceBound);
    final isLoggedIn =
        context.select<AuthProvider, bool>((a) => a.isLoggedIn);

    if (isLoading) {
      return const LoadingView();
    }

    if (!isDeviceBound) {
      return const DeviceBindingScreen();
    }

    if (!isLoggedIn) {
      return const LoginScreen();
    }

    return const HomeScreen();
  }
}