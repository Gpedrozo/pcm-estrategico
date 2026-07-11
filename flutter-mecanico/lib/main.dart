import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:logging/logging.dart';

import 'src/app.dart';

final log = Logger('PCM');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Configura logging básico
  Logger.root.level = kReleaseMode ? Level.WARNING : Level.ALL;
  Logger.root.onRecord.listen((record) {
    debugPrint('[${record.level.name}] ${record.time}: ${record.message}');
    if (record.error != null) {
      debugPrint('  Error: ${record.error}');
      debugPrint('  StackTrace: ${record.stackTrace}');
    }
  });

  // Carrega o .env de forma segura — no Flutter Web o arquivo não existe
  // na raiz, então tratamos como opcional.
  try {
    await dotenv.load(fileName: '.env');
    log.info('.env carregado com sucesso');
  } catch (e) {
    log.warning('Ambiente sem .env (ex: Web ou CI) — segue com variáveis vazias. Erro: $e');
  }

  // Valida credenciais antes de inicializar
  final supabaseUrl = dotenv.env['SUPABASE_URL'] ?? '';
  final supabaseAnonKey = dotenv.env['SUPABASE_ANON_KEY'] ?? '';

  if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
    log.severe('Credenciais do Supabase não configuradas. Verifique o arquivo .env');
    // Não impede a inicialização, mas loga o erro
  }

  try {
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      authCallbackUrlHostname: 'login-callback',
    );
    log.info('Supabase inicializado com sucesso');
  } catch (e) {
    log.severe('Falha ao inicializar Supabase: $e');
    // App pode funcionar parcialmente offline
  }

  // Configura handler global de erros não capturados
  FlutterError.onError = (details) {
    log.severe('Erro Flutter não capturado', details.exception, details.stack);
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    log.severe('Erro de plataforma não capturado', error, stack);
    return true;
  };

  runApp(const App());
}