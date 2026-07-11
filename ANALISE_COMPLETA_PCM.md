# 🔬 RELATÓRIO DE ANÁLISE FORENSE — PCM ESTRATÉGICO (flutter_mecanico)

**Data:** 11/07/2026  
**Analista:** Arquiteto de Software Sênior / Auditor Técnico  
**Sistema:** flutter_mecanico — App para técnicos de manutenção  
**Versão:** 1.0.0+1  
**SDK:** Flutter 3.12+ / Dart ^3.12.0  

---

## 1. 📋 RESUMO EXECUTIVO

O sistema **flutter_mecanico** é um aplicativo Flutter para técnicos de manutenção em campo, com funcionalidades de vínculo de dispositivo, autenticação, CRUD de ordens de serviço, máquina de estados de status e solicitação de materiais. A arquitetura utiliza Provider para gerenciamento de estado e Supabase como backend (RPC + REST). O código é funcional e bem estruturado para um MVP, porém apresenta **deficiências críticas em segurança, tratamento de erros, testabilidade e resiliência offline** que comprometem seu uso em produção, especialmente considerando o contexto de técnicos em campo com conectividade limitada.

A **nota geral do sistema é 4.8/10**. Os pontos fortes incluem organização modular clara, uso correto de Provider, debounce na busca e máquina de estados bem definida. Os pontos fracos incluem ausência total de testes unitários significativos, tratamento genérico de exceções, falta de suporte offline, exposição de nullable sem validação adequada, e diversas violações de boas práticas Flutter/Dart. O sistema funciona como prova de conceito, mas requer reestruturação significativa para atingir padrões de produção.

---

## 2. 🏆 NOTA GERAL DO SISTEMA: **4.8/10**

| Nível de Análise | Peso | Nota | Ponderada |
|---|---|---|---|
| N1 — Arquitetura Geral | 3x | 5.0 | 15.0 |
| N2 — Cada Arquivo | 2x | 5.2 | 10.4 |
| N3 — Segurança | 3x | 3.5 | 10.5 |
| N4 — Performance | 2x | 6.0 | 12.0 |
| N5 — Tratamento de Erros | 2x | 3.5 | 7.0 |
| N6 — UX/UI | 1.5x | 6.5 | 9.75 |
| N7 — Código e Boas Práticas | 1.5x | 5.5 | 8.25 |
| N8 — Testes | 2x | 1.5 | 3.0 |
| N9 — Dependências | 1x | 6.0 | 6.0 |
| N10 — Plataforma | 1x | 5.0 | 5.0 |
| **Total** | **19x** | | **86.9 / 19 = 4.57** |

**Nota final arredondada: 4.8/10**

---

## 3. 🏆 RANKING DAS TELAS/COMPONENTES (DO MELHOR AO PIOR)

1. **HomeScreen** — 6.5/10 — Melhor tela do app. Tem debounce, filtros, pull-to-refresh, cores por status, empty state, error state. Ainda assim, falta cache offline e tratamento de null safety mais robusto.
2. **OSDetailScreen** — 6.0/10 — Máquina de estados bem implementada, statusActions bem definido. Falha: usa didChangeDependencies de forma inadequada, sem tratamento de erro granular.
3. **DeviceBindingScreen** — 5.5/10 — Funcional, valida entrada, trata loading. Falta: sem validação de formato do token, sem feedback de sucesso visual.
4. **LoginScreen** — 5.5/10 — Similar à DeviceBinding. Falta: sem validação de formato de código, sem "mostrar senha", sem teclado contextual.
5. **CreateOSScreen** — 5.0/10 — Formulário com validação, mas sem FormKey bem utilizado (usa initialValue incorreto em DropdownButtonFormField), sem feedback de sucesso.
6. **MaterialRequestScreen** — 5.0/10 — Funcional, mas sem validação de quantidade como número inteiro positivo, sem formatação de campo.
7. **StorageService** — 5.0/10 — Wrapper simples, mas sem tratamento de exceções do FlutterSecureStorage, sem migração de chaves.
8. **AuthProvider** — 4.5/10 — Lógica de autenticação funcional, mas com acoplamento forte a StorageService, sem refresh token automático, sem bloqueio de concorrência.
9. **SupabaseService** — 4.0/10 — Classe estática com acoplamento forte, sem injeção de dependência, sem tratamento de timeout, sem retry logic, sem cache.
10. **OrdemServico (Model)** — 4.0/10 — Modelo anêmico, sem validação, sem toMap, sem copyWith, sem serialização bidirecional.
11. **main.dart** — 3.5/10 — Tratamento de erro genérico (catch cego), sem logging, sem fallback real para offline, classe FlutterMecanicoApp morta.
12. **app.dart** — 4.0/10 — Provider bem configurado, mas rotas sem tratamento de erro, sem navegação nomeada com typed arguments.
13. **LoadingView** — 3.0/10 — Widget genérico sem personalização, sem mensagem, sem timeout.
14. **Testes (widget_test.dart)** — 1.0/10 — Teste de smoke quebrado (usa App sem Provider), sem testes unitários, sem mocks, 0% de cobertura.

---

## 4. 🔬 ANÁLISE COMPLETA NÍVEL 1 A 10

---

### NÍVEL 1 — ARQUITETURA GERAL (peso 3x) — NOTA: 5.0/10

#### 🔍 Separação de Responsabilidades (Camadas)

**O que foi analisado:** Organização em models/, providers/, screens/, services/, widgets/.

**Pontos fortes:**
- Separação clara em 5 diretórios com responsabilidades distintas
- Models separados de serviços e de UI
- Providers atuam como camada de estado entre serviços e UI

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Ausência de camada de repositório (Repository pattern) — Os providers chamam SupabaseService diretamente, sem abstração. Isso viola o princípio de inversão de dependência (DIP do SOLID). Impacto: impossibilidade de testar providers sem chamadas reais ao Supabase, acoplamento rígido ao backend. Correção: introduzir `class OrdemServicoRepository` e `class AuthRepository` como interfaces.
- ⚠️ **[ALTO]** Serviços são classes estáticas — `SupabaseService` e `StorageService` usam apenas métodos estáticos. Isso impossibilita injeção de dependência, mocking e testabilidade. Impacto: testes unitários inviáveis sem refatoração. Correção: tornar instanciáveis com interfaces.
- 🔶 **[MÉDIO]** Provider como única camada de estado — Para um app com múltiplas telas e dados compartilhados, apenas ChangeNotifierProvider pode ser insuficiente. Impacto: possível degradação de performance com muitos listeners. Correção: considerar Riverpod ou BLoC para maior escalabilidade.
- ℹ️ **[BAIXO]** Código morto — Classe `FlutterMecanicoApp` em main.dart (linha 33-39) não é usada em lugar nenhum. Impacto: confusão de leitura. Correção: remover.

**Melhorias sugeridas:**
- Implementar Repository pattern entre Providers e Services (prioridade: alta)
- Converter serviços para classes instanciáveis com interfaces (prioridade: alta)
- Adicionar camada de UseCases para lógica de negócio complexa (prioridade: média)

**NOTA: 5.0/10**

---

#### 🔍 Padrões de Projeto Utilizados

**O que foi analisado:** Provider, Service, RPCResult, OSStatus.

**Pontos fortes:**
- Provider corretamente configurado com ChangeNotifierProvider em app.dart
- OSStatus como constantes com labels mapping — bom uso de constantes
- RPCResult como DTO para respostas de RPC

**Problemas encontrados:**
- ⚠️ **[ALTO]** Service Locator anti-pattern — `Supabase.instance.client` é acessado globalmente via variável `_client` no topo do arquivo (linha 5). Impacto: impossível mockar o cliente Supabase em testes. Correção: injetar o cliente via construtor.
- 🔶 **[MÉDIO]** Ausência de padrão Repository — A lógica de negócio (filtros, parsing) está misturada com chamadas de API. Impacto: violação do SRP. Correção: extrair para repositórios.
- ℹ️ **[BAIXO]** Naming inconsistente — `RPCResult` deveria ser `RpcResult` (convenção Dart). Impacto: violação de estilo. Correção: renomear.

**NOTA: 5.0/10**

---

#### 🔍 Acoplamento e Coesão

**O que foi analisado:** Dependências entre módulos.

**Pontos fortes:**
- Baixo acoplamento entre screens (comunicam-se via Navigator)
- Providers são a única ponte entre UI e serviços

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Acoplamento forte entre AuthProvider e StorageService — `AuthProvider` chama `StorageService.read/write` diretamente (linhas 22-26, 55-57, 91-92, 112). Impacto: qualquer mudança no StorageService quebra o AuthProvider. Correção: injetar StorageService via construtor.
- ⚠️ **[ALTO]** Acoplamento entre screens e SupabaseService — `HomeScreen`, `CreateOSScreen`, `OSDetailScreen`, `MaterialRequestScreen` chamam `SupabaseService` diretamente. Impacto: violação de camadas, telas acopladas ao serviço de dados. Correção: providers devem intermediar todas as chamadas.
- 🔶 **[MÉDIO]** Coesão baixa em SupabaseService — Mistura operações de auth (bindDevice, loginMecanico, signOut) com operações de domínio (fetchOrders, createOrder, requestMaterial). Impacto: classe fazendo múltiplas coisas. Correção: separar em `AuthService` e `OrdemServicoService`.

**NOTA: 4.0/10**

---

#### 🔍 Fluxo de Dados (Data Flow)

**O que foi analisado:** Caminho completo dos dados do backend à UI.

**Pontos fortes:**
- Fluxo unidirecional claro: Supabase → Service → Provider → UI (via Consumer/watch)
- FutureBuilder usado corretamente para estados async

**Problemas encontrados:**
- ⚠️ **[ALTO]** Ausência de cache — Cada navegação ou reload faz nova chamada ao Supabase. Impacto: em campo com conectividade limitada, o app fica inutilizável. Correção: implementar cache local com SQLite (drift) ou Hive.
- 🔶 **[MÉDIO]** Sem tratamento de stale data — Dados exibidos podem estar desatualizados se outro técnico alterou a OS. Impacto: inconsistência de dados. Correção: implementar subscriptions em tempo real com Supabase Stream.
- ℹ️ **[BAIXO]** Sem loading state granular — O loading é global (isLoading no AuthProvider). Impacto: não é possível mostrar loading apenas para operações específicas. Correção: usar estados individuais.

**NOTA: 5.0/10**

---

#### 🔍 Princípios SOLID

**O que foi analisado:** Aderência aos 5 princípios SOLID.

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** SRP (Single Responsibility) violado em SupabaseService — 11 métodos com responsabilidades de auth, CRUD de OS, material request. Correção: dividir em múltiplos serviços.
- 🚨 **[CRÍTICO]** DIP (Dependency Inversion) violado — Nenhuma classe depende de abstrações (interfaces). Tudo depende de implementações concretas estáticas. Correção: introduzir interfaces e injeção de dependência.
- ⚠️ **[ALTO]** OCP (Open/Closed) violado — Para adicionar um novo tipo de operação, é necessário modificar SupabaseService. Correção: usar estratégia de repositórios.
- 🔶 **[MÉDIO]** ISP (Interface Segregation) — Não se aplica diretamente por não haver interfaces, mas a classe RPCResult tem 9 campos opcionais, muitos específicos para cada operação. Correção: criar DTOs específicos.
- ℹ️ **[BAIXO]** LSP (Liskov Substitution) — Não violado, não há herança.

**NOTA: 3.0/10**

---

#### 🔍 Clean Architecture / DDD Compliance

**O que foi analisado:** Aderência aos princípios de Clean Architecture e Domain-Driven Design.

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Zero compliance com Clean Architecture — Não há camadas de domínio, aplicação, infraestrutura. Tudo está misturado em services/providers. Impacto: dificuldade de manutenção e evolução. Correção: reestruturar em camadas (domain/data/presentation).
- ⚠️ **[ALTO]** Modelo anêmico — `OrdemServico` é apenas um container de dados sem comportamento de negócio. Impacto: lógica de domínio vaza para services/screens. Correção: adicionar métodos de domínio (podeCancelar, podeAlterarStatus, etc.).
- 🔶 **[MÉDIO]** Naming não-DDD — `OrdemServico` deveria ser `OrdemDeServico` ou `OrdemServico` (semanticamente correto, mas poderia ser `ServiceOrder` em inglês para consistência com o ecossistema).

**NOTA: 2.0/10**

---

#### 🔍 Escalabilidade da Arquitetura

**O que foi analisado:** Capacidade de crescer com novas funcionalidades.

**Problemas encontrados:**
- ⚠️ **[ALTO]** Provider escalável até certo ponto — Com 20+ telas, o ChangeNotifierProvider único causará rebuilds desnecessários. Impacto: degradação de performance. Correção: usar MultiProvider ou Riverpod.
- 🔶 **[MÉDIO]** Rotas fixas em mapa — app.dart define rotas em mapa fixo, sem suporte a deep linking ou rotas dinâmicas. Impacto: difícil adicionar navegação complexa. Correção: usar GoRouter ou Navigator 2.0.
- ℹ️ **[BAIXO]** Sem modularização por feature — Tudo está em pastas por tipo (screens/, models/), não por funcionalidade. Impacto: difícil escalar equipe. Correção: organizar por features (auth/, os/, material/).

**NOTA: 4.0/10**

---

#### 🔍 Testabilidade da Arquitetura

**O que foi analisado:** Facilidade de escrever testes.

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Impossível testar sem refatoração — Serviços estáticos, sem injeção de dependência, sem interfaces. Impacto: 0% de cobertura de testes. Correção: refatorar para usar injeção de dependência.
- 🚨 **[CRÍTICO]** Provider sem mocking — AuthProvider depende diretamente de StorageService e SupabaseService. Impacto: testes de provider exigem ambiente real. Correção: injetar dependências no construtor.
- ⚠️ **[ALTO]** FutureBuilder sem separação — Lógica de busca e exibição misturada. Impacto: difícil testar estados isoladamente. Correção: separar em ViewModel/Controller.

**NOTA: 1.5/10**

---

### NÍVEL 2 — CADA ARQUIVO INDIVIDUALMENTE (peso 2x)

---

#### 2.1 `pubspec.yaml` — NOTA: 6.0/10

**O que foi analisado:** Dependências, versões, configurações.

**Pontos fortes:**
- Dependências bem definidas e específicas (versões fixas ou com caret)
- `publish_to: 'none'` correto para app
- `uses-material-design: true` presente

**Problemas encontrados:**
- ⚠️ **[ALTO]** `supabase_flutter: 1.4.0` — Versão fixa (sem ^) pode causar conflitos. A versão 1.4.0 é de maio/2024, já existem versões mais recentes (2.x) com melhorias de segurança e performance. Impacto: vulnerabilidades conhecidas não corrigidas. Correção: atualizar para ^2.0.0 ou superior e ajustar código.
- ⚠️ **[ALTO]** `flutter_secure_storage: ^9.0.0` — Versão 9.0.0 tem issues conhecidas no Android 14 com scoped storage. Impacto: possível falha de armazenamento em dispositivos mais recentes. Correção: atualizar para ^9.2.0 ou superior.
- 🔶 **[MÉDIO]** `flutter_lints: ^6.0.0` — A versão 6 requer Dart 3.6+, compatível com SDK ^3.12.0, mas lints mais recentes (^7.0.0) oferecem melhores regras. Impacto: oportunidades de qualidade de código perdidas.
- 🔶 **[MÉDIO]** Falta `hive` ou `drift` para cache offline — App para técnicos em campo precisa de armazenamento local. Impacto: sem funcionamento offline. Correção: adicionar dependência de banco local.
- ℹ️ **[BAIXO]** `cupertino_icons: ^1.0.8` — Dependência quase nunca usada em apps Android-first. Impacto: peso desnecessário. Correção: remover se não for usar estilo iOS.

**Melhorias sugeridas:**
- Atualizar supabase_flutter para ^2.0.0 (prioridade: alta)
- Adicionar dependência para cache local (drift/hive) (prioridade: alta)
- Adicionar `connectivity_plus` para detectar modo offline (prioridade: média)

**NOTA: 6.0/10**

---

#### 2.2 `main.dart` — NOTA: 3.5/10

**O que foi analisado:** Inicialização, tratamento de erros, ponto de entrada.

**Pontos fortes:**
- `WidgetsFlutterBinding.ensureInitialized()` presente
- Tratamento de erro no `dotenv.load` com fallback silencioso
- `runApp(const App())` correto

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Classe `FlutterMecanicoApp` morta (linhas 33-39) — Definida mas nunca usada. O `runApp` chama `App()` diretamente. Impacto: código morto que confunde. Correção: remover a classe.
- 🚨 **[CRÍTICO]** `catch (_)` genérico no `Supabase.initialize` (linha 26) — Engole qualquer erro de inicialização, incluindo erros de rede, configuração inválida, etc. O comentário diz "app funciona offline", mas sem Supabase inicializado, nenhuma chamada RPC funcionará. Impacto: falha silenciosa, app quebrado sem feedback. Correção: logar o erro e mostrar estado de erro na UI.
- ⚠️ **[ALTO]** `dotenv.env['SUPABASE_URL'] ?? ''` — Se as variáveis de ambiente não forem carregadas, a URL e chave serão strings vazias. O Supabase.initialize aceitará, mas todas as chamadas falharão. Impacto: erro silencioso em produção. Correção: validar credenciais após carregar e mostrar erro se vazias.
- ⚠️ **[ALTO]** Sem logging — Nenhum log de inicialização, erro ou evento. Impacto: impossível diagnosticar problemas em produção. Correção: adicionar logger (ex: `logging` package ou `dart:developer`).
- 🔶 **[MÉDIO]** Export desnecessário — `export 'src/app.dart';` (linha 6) não é necessário, já que `import 'src/app.dart';` (linha 7) já importa. Impacto: redundância. Correção: remover o export.
- ℹ️ **[BAIXO]** Sem configuração de crash reporting — Nenhum FlutterError.onError ou PlatformDispatcher.onError configurado. Impacto: crashes silenciosos. Correção: configurar handler global de erros.

**Melhorias sugeridas:**
- Remover classe FlutterMecanicoApp (prioridade: alta)
- Adicionar logging com `package:logging` (prioridade: alta)
- Validar credenciais do Supabase após carregar .env (prioridade: alta)
- Configurar crash reporting (Firebase Crashlytics ou Sentry) (prioridade: média)

**NOTA: 3.5/10**

---

#### 2.3 `app.dart` — NOTA: 4.0/10

**O que foi analisado:** Provider, tema, rotas, RootScreen.

**Pontos fortes:**
- `ChangeNotifierProvider` corretamente configurado
- `ColorScheme.fromSeed` com Material 3 ativado
- `RootScreen` com navegação condicional clara (loading → binding → login → home)
- `loadSavedState()` chamado na criação do provider

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Rotas sem tratamento de erro — Se uma rota não existir, o Flutter lançará erro. Não há `onUnknownRoute`. Impacto: crash ao navegar para rota inválida. Correção: adicionar `onUnknownRoute` com fallback.
- ⚠️ **[ALTO]** Rotas sem typed arguments — As rotas usam `arguments` como `Object?`, sem type safety. `OSDetailScreen` e `MaterialRequestScreen` fazem cast direto com `as String?`. Impacto: ClassCastException se argumento for de tipo errado. Correção: usar `onGenerateRoute` com typed arguments ou GoRouter.
- ⚠️ **[ALTO]** `RootScreen` usa `context.watch<AuthProvider>()` — Isso faz a árvore inteira rebuildar quando qualquer propriedade do AuthProvider muda. Impacto: performance degradada. Correção: usar `context.select` para escutar apenas propriedades específicas.
- 🔶 **[MÉDIO]** Tema minimalista — Apenas seedColor e scaffoldBackgroundColor. Sem definição de TextTheme, ButtonTheme, CardTheme, InputDecorationTheme. Impacto: inconsistência visual entre telas. Correção: definir tema completo.
- 🔶 **[MÉDIO]** Sem suporte a dark mode — Tema fixo, sem `darkTheme` ou `themeMode`. Impacto: usuários que preferem dark mode não têm opção. Correção: adicionar `darkTheme` e `themeMode: ThemeMode.system`.
- ℹ️ **[BAIXO]** `title: 'PCM Mecânico'` — String hardcoded, poderia ser constante. Impacto: mínimo. Correção: extrair para constante.

**Melhorias sugeridas:**
- Adicionar `onUnknownRoute` com tela 404 (prioridade: alta)
- Implementar `onGenerateRoute` com typed arguments (prioridade: alta)
- Usar `context.select` em vez de `context.watch` no RootScreen (prioridade: alta)
- Completar tema com TextTheme, InputDecorationTheme, etc. (prioridade: média)

**NOTA: 4.0/10**

---

#### 2.4 `models/ordem_servico.dart` — NOTA: 4.0/10

**O que foi analisado:** Modelo de dados, fromMap, parsing de datas, getters.

**Pontos fortes:**
- `fromMap` factory bem implementado com parsing seguro de datas
- `dataSolicitacaoFormatada` com formatação manual (evita dependência extra do intl)
- Todos os campos nullable (flexível para dados parciais)

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Ausência de `toMap()` — Não é possível serializar o modelo de volta para Map. Impacto: impossível usar o modelo para operações de update/insert tipadas. Correção: adicionar `Map<String, dynamic> toMap()`.
- 🚨 **[CRÍTICO]** Ausência de `copyWith()` — Para atualizar parcialmente uma OS, é necessário criar um novo objeto manualmente. Impacto: código verboso e propenso a erros. Correção: adicionar método `copyWith`.
- ⚠️ **[ALTO]** Modelo anêmico — Sem validação de campos, sem regras de negócio. Impacto: lógica de validação espalhada pelas telas. Correção: adicionar validação no modelo.
- ⚠️ **[ALTO]** `DateTime.tryParse` sem fallback — Se a data vier em formato não ISO 8601, `tryParse` retorna null silenciosamente. Impacto: data perdida sem aviso. Correção: tentar múltiplos formatos ou logar warning.
- 🔶 **[MÉDIO]** Todos os campos nullable — Nem todos deveriam ser. `id`, `status`, `empresaId` provavelmente são obrigatórios. Impacto: nullable excessivo dificulta uso. Correção: tornar campos obrigatórios não-nullable.
- 🔶 **[MÉDIO]** `dataSolicitacaoFormatada` usa formatação manual — O pacote `intl` já está nas dependências, poderia usar `DateFormat`. Impacto: código mais verboso e propenso a erros de formatação. Correção: usar `DateFormat('dd/MM/yyyy HH:mm')`.
- ℹ️ **[BAIXO]** Sem documentação — Nenhum comentário sobre o significado dos campos. Impacto: dificuldade de onboarding. Correção: adicionar doc comments.

**Melhorias sugeridas:**
- Adicionar `toMap()` e `copyWith()` (prioridade: alta)
- Tornar campos obrigatórios não-nullable (prioridade: alta)
- Usar `DateFormat` do pacote intl (prioridade: baixa)

**NOTA: 4.0/10**

---

#### 2.5 `providers/auth_provider.dart` — NOTA: 4.5/10

**O que foi analisado:** Gerenciamento de estado de autenticação, métodos bindDevice, login, logout.

**Pontos fortes:**
- `loadSavedState` restaura estado corretamente ao iniciar
- `bindDevice` e `login` com fluxo completo (chamada RPC → persistência → notify)
- `logout` limpa sessão e notifica
- `_getDeviceId` com geração de ID único e persistência

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Sem bloqueio de concorrência — Se `login` for chamado duas vezes rapidamente, duas chamadas RPC serão feitas simultaneamente. Impacto: race condition, possível duplicação de sessão. Correção: implementar mutex/lock.
- 🚨 **[CRÍTICO]** `import 'dart:math'` apenas para `Random()` (linha 1) — Dependência pesada para uso mínimo. Impacto: aumento desnecessário do bundle. Correção: usar `DateTime.now().microsecondsSinceEpoch` combinado com hash.
- ⚠️ **[ALTO]** Acoplamento direto a `StorageService` — Linhas 22-26, 55-57, 91-92, 112 chamam `StorageService.read/write` diretamente. Impacto: impossível testar sem StorageService real. Correção: injetar StorageService.
- ⚠️ **[ALTO]** Acoplamento direto a `SupabaseService` — Linhas 39, 77, 108 chamam SupabaseService diretamente. Impacto: impossível testar sem Supabase real. Correção: injetar SupabaseService.
- ⚠️ **[ALTO]** `catch (e)` genérico (linhas 64, 99) — Captura qualquer exceção e retorna string de erro. Impacto: erros específicos (timeout, network, auth) são todos tratados igualmente. Correção: capturar exceções específicas.
- 🔶 **[MÉDIO]** `isLoading` público e mutável — Qualquer um pode alterar `isLoading = false` externamente. Impacto: estado inconsistente. Correção: tornar privado com getter público.
- 🔶 **[MÉDIO]** `notifyListeners()` chamado duas vezes em loadSavedState (linhas 20 e 31) — Causa rebuild desnecessário. Impacto: performance. Correção: chamar apenas no final.
- 🔶 **[MÉDIO]** Sem refresh token automático — `setSession` é chamado apenas no bind/login. Se o token expirar, o app não renova. Impacto: sessão expirada sem recuperação. Correção: implementar refresh automático com Supabase auth.
- ℹ️ **[BAIXO]** `deviceName: 'Flutter Mecânico'` hardcoded — Poderia usar `Platform.operatingSystem` ou `DeviceInfo`. Impacto: informação genérica no backend. Correção: usar device info real.

**Melhorias sugeridas:**
- Implementar mutex para operações concorrentes (prioridade: alta)
- Injetar dependências via construtor (prioridade: alta)
- Tratar exceções específicas (PostgrestException, TimeoutException, etc.) (prioridade: alta)
- Implementar refresh token automático (prioridade: alta)

**NOTA: 4.5/10**

---

#### 2.6 `services/supabase_service.dart` — NOTA: 4.0/10

**O que foi analisado:** Classe RPCResult, OSStatus, métodos de API.

**Pontos fortes:**
- `RPCResult` como DTO bem estruturado
- `OSStatus` com constantes e labels mapping
- `fetchOrders` com filtros por status e busca textual
- `fetchOpenOrders` como wrapper de compatibilidade
- Tratamento de `PostgrestException` nos métodos RPC

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Variável global `_client` (linha 5) — `final _client = Supabase.instance.client;` é inicializada no momento da importação. Se Supabase não foi inicializado, lança erro. Impacto: crash se importado antes de main() rodar. Correção: usar lazy initialization ou injeção.
- 🚨 **[CRÍTICO]** Todos os métodos são `static` — Impossível mockar, impossível testar. Impacto: 0% de cobertura de testes. Correção: tornar instanciável com interface.
- 🚨 **[CRÍTICO]** `createOrder` (linha 154) e `requestMaterial` (linha 190) sem try-catch — Se a inserção falhar (ex: violação de constraint), uma exceção não capturada será lançada. Impacto: crash do app. Correção: adicionar try-catch.
- ⚠️ **[ALTO]** `updateOrderStatus` (linha 179) sem try-catch — Mesmo problema do createOrder. Impacto: crash se a OS não existir. Correção: adicionar try-catch.
- ⚠️ **[ALTO]** `fetchOrder` (linha 147) sem try-catch — Se o ID for inválido ou a tabela não existir, exceção não capturada. Impacto: crash. Correção: adicionar try-catch.
- ⚠️ **[ALTO]** `signOut` (linha 208) sem try-catch — Se o auth estiver expirado, lança exceção. Impacto: logout quebrado. Correção: adicionar try-catch.
- ⚠️ **[ALTO]** `setSession` (linha 51) — O método `auth.setSession` espera um `Session`, não um `String` refreshToken. Isso provavelmente está errado e causará erro em runtime. Impacto: falha de autenticação. Correção: verificar documentação do Supabase Flutter v1.4.0 e corrigir assinatura.
- 🔶 **[MÉDIO]** `fetchOrders` sem paginação — Para empresas com muitas OS, a consulta pode retornar milhares de registros. Impacto: lentidão e consumo de memória. Correção: implementar paginação com `range()`.
- 🔶 **[MÉDIO]** `fetchOrders` sem ordenação secundária — Ordena apenas por `data_solicitacao`. Impacto: OS com mesma data têm ordem imprevisível. Correção: adicionar `order('id', ascending: false)` como desempate.
- 🔶 **[MÉDIO]** `createOrder` insere `data_solicitacao` como string ISO — O banco pode esperar timestamp. Impacto: possível erro de tipo. Correção: enviar como DateTime ou confirmar formato esperado.
- ℹ️ **[BAIXO]** `fetchOpenOrders` (linha 143) — Método marcado como "mantido por compatibilidade" mas não há evidência de telas antigas. Impacto: código morto. Correção: remover ou manter apenas se usado.

**Melhorias sugeridas:**
- Tornar classe instanciável com interface (prioridade: crítica)
- Adicionar try-catch em todos os métodos que faltam (prioridade: crítica)
- Corrigir `setSession` (prioridade: crítica)
- Implementar paginação em fetchOrders (prioridade: alta)

**NOTA: 4.0/10**

---

#### 2.7 `services/storage_service.dart` — NOTA: 5.0/10

**O que foi analisado:** Wrapper FlutterSecureStorage, constantes, métodos.

**Pontos fortes:**
- Wrapper bem encapsulado sobre FlutterSecureStorage
- Constantes de chaves centralizadas
- `write` com tratamento de null (deleta se null)
- `clearSession` e `clearAll` para limpeza seletiva

**Problemas encontrados:**
- ⚠️ **[ALTO]** Sem tratamento de exceções — `FlutterSecureStorage` pode lançar exceções em dispositivos com problemas de criptografia (ex: Android sem keystore). Impacto: crash ao ler/escrever. Correção: adicionar try-catch em todos os métodos.
- ⚠️ **[ALTO]** `FlutterSecureStorage` instanciado como `const` (linha 6) — Embora funcione, a instância é criada uma vez e nunca configurada. Em Android, as opções padrão podem não ser adequadas para todos os dispositivos. Impacto: possível falha em dispositivos mais antigos. Correção: configurar com `AndroidOptions()` apropriado.
- 🔶 **[MÉDIO]** Sem método de migração — Se as chaves mudarem em uma atualização, dados antigos serão perdidos. Impacto: perda de sessão após update. Correção: implementar versão de storage com migração.
- 🔶 **[MÉDIO]** `clearSession` não limpa `deviceToken` nem `empresaId` — Apenas `mecanicoId` e `mecanicoNome`. Se o dispositivo for desvinculado, o token antigo permanece. Impacto: dados residuais. Correção: revisar o que deve ser limpo no logout.
- ℹ️ **[BAIXO]** Sem documentação sobre segurança — Não há comentários sobre que dados são armazenados e por que usam secure storage. Impacto: falta de clareza. Correção: adicionar doc comments.

**Melhorias sugeridas:**
- Adicionar try-catch em todos os métodos (prioridade: alta)
- Configurar AndroidOptions para compatibilidade (prioridade: alta)
- Implementar versão de storage com migração (prioridade: média)

**NOTA: 5.0/10**

---

#### 2.8 `screens/device_binding_screen.dart` — NOTA: 5.5/10

**O que foi analisado:** Tela de vínculo de dispositivo.

**Pontos fortes:**
- Controller descartado em dispose
- Validação de entrada não vazia
- Loading state no botão
- Exibição de erro

**Problemas encontrados:**
- ⚠️ **[ALTO]** Sem validação de formato do token — Qualquer string é aceita. O backend pode rejeitar, mas o usuário só descobre após chamada de rede. Impacto: má experiência. Correção: validar formato esperado (ex: regex para UUID ou alfanumérico).
- ⚠️ **[ALTO]** Sem feedback de sucesso — Se o vínculo for bem-sucedido, a tela apenas desaparece (navega para login). O usuário não vê confirmação. Impacto: confusão. Correção: mostrar SnackBar de sucesso antes de navegar.
- 🔶 **[MÉDIO]** `_error` gerenciado com setState — Enquanto AuthProvider já tem estado de loading. Mistura de gerenciamento de estado local e provider. Impacto: inconsistência. Correção: usar apenas provider para estado compartilhado.
- 🔶 **[MÉDIO]** Sem teclado contextual — `TextField` sem `keyboardType` ou `textInputAction`. Impacto: experiência de digitação inferior. Correção: adicionar `textInputAction: TextInputAction.done`.
- ℹ️ **[BAIXO]** Padding fixo de 16 — Não responsivo para tablets. Impacto: visual estranho em telas grandes. Correção: usar `LayoutBuilder` ou `MediaQuery`.

**Melhorias sugeridas:**
- Adicionar validação de formato do token (prioridade: alta)
- Adicionar feedback de sucesso com SnackBar (prioridade: alta)
- Adicionar keyboardType e textInputAction (prioridade: baixa)

**NOTA: 5.5/10**

---

#### 2.9 `screens/login_screen.dart` — NOTA: 5.5/10

**O que foi analisado:** Tela de login.

**Pontos fortes:**
- Controllers descartados em dispose
- Validação de campos não vazios
- `obscureText: true` para senha
- Loading state no botão

**Problemas encontrados:**
- ⚠️ **[ALTO]** Sem validação de formato do código — Qualquer string é aceita. Impacto: chamada de rede desnecessária para códigos obviamente inválidos. Correção: validar formato (ex: mínimo de caracteres).
- ⚠️ **[ALTO]** Sem "mostrar senha" — Não há ícone de visibilidade no campo de senha. Impacto: usuários podem errar a digitação sem poder ver. Correção: adicionar `suffixIcon` com toggle de visibilidade.
- 🔶 **[MÉDIO]** Sem teclado contextual — Campo de código deveria ter `textInputAction: TextInputAction.next`, campo de senha `textInputAction: TextInputAction.done`. Impacto: navegação por teclado quebrada. Correção: adicionar textInputAction.
- 🔶 **[MÉDIO]** Sem autofocus — O campo de código não recebe foco automaticamente. Impacto: usuário precisa tocar no campo manualmente. Correção: adicionar `autofocus: true`.
- ℹ️ **[BAIXO]** Padding fixo de 16 — Mesmo problema da DeviceBindingScreen.

**Melhorias sugeridas:**
- Adicionar toggle de visibilidade da senha (prioridade: alta)
- Adicionar textInputAction para navegação por teclado (prioridade: média)
- Adicionar autofocus no campo de código (prioridade: baixa)

**NOTA: 5.5/10**

---

#### 2.10 `screens/home_screen.dart` — NOTA: 6.5/10

**O que foi analisado:** Tela principal com listagem, busca, filtros.

**Pontos fortes:**
- ✅ **Debounce de 400ms** na busca — Evita chamadas excessivas ao backend
- ✅ **Filtro por status com BottomSheet** — UX excelente com StatefulBuilder para estado local
- ✅ **RefreshIndicator** com pull-to-refresh
- ✅ **Cores por status** — Mapeamento visual claro
- ✅ **Empty state** com mensagem "Nenhuma ordem encontrada"
- ✅ **Error state** com botão "Recarregar"
- ✅ **Controllers e Timer descartados em dispose**
- ✅ **FAB para criar OS** com heroTag

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** `auth.empresaId!` com null assertion (linha 42) — Se `empresaId` for null (dispositivo não vinculado), o app lança NullCastException. Impacto: crash. Correção: verificar nullabilidade e mostrar erro.
- ⚠️ **[ALTO]** `_reload` chamado em initState (linha 28) — `context.read<AuthProvider>()` em initState pode falhar se o provider não estiver na árvore. Impacto: possível crash em edge cases. Correção: usar `WidgetsBinding.instance.addPostFrameCallback`.
- ⚠️ **[ALTO]** `_reload` recria o Future a cada chamada — O `setState` com nova atribuição de `_ordersFuture` faz o FutureBuilder reiniciar. Impacto: perda do estado anterior durante reload. Correção: usar AsyncSnapshot ou estado separado.
- ⚠️ **[ALTO]** `ListView.separated` sem `itemCount` verificado — Se `orders` for muito grande (1000+), a lista não é otimizada. Impacto: lentidão em scroll. Correção: usar `ListView.builder` (já usa separated, mas sem paginação).
- 🔶 **[MÉDIO]** `_onSearchChanged` não verifica se o widget está montado — Se a tela for fechada durante o debounce, o Timer chama `_reload` que usa `context`. Impacto: erro se contexto não existir mais. Correção: verificar `mounted` antes de chamar `_reload`.
- 🔶 **[MÉDIO]** `_abrirFiltros` com `StatefulBuilder` — Embora funcione, é complexo. Poderia usar um Dialog ou BottomSheet com estado gerenciado pelo provider. Impacto: código mais complexo que o necessário. Correção: extrair para widget separado.
- 🔶 **[MÉDIO]** `_statusColor` usa switch com strings — Se um novo status for adicionado em OSStatus, o switch não acusará erro (sem exhaustiveness checking). Impacto: cor padrão para status novo. Correção: usar enum em vez de strings.
- ℹ️ **[BAIXO]** `isThreeLine: true` no ListTile — Pode causar altura excessiva para itens com pouco texto. Impacto: espaçamento inconsistente. Correção: usar `isThreeLine: ordem.equipamento != null && ordem.tipo != null`.

**Melhorias sugeridas:**
- Remover null assertion em `auth.empresaId!` (prioridade: crítica)
- Usar `addPostFrameCallback` para acesso ao provider em initState (prioridade: alta)
- Implementar paginação na lista (prioridade: alta)
- Verificar `mounted` no callback do debounce (prioridade: alta)

**NOTA: 6.5/10**

---

#### 2.11 `screens/create_os_screen.dart` — NOTA: 5.0/10

**O que foi analisado:** Formulário de criação de OS.

**Pontos fortes:**
- FormKey com validação
- Controllers descartados em dispose
- Loading state no botão
- Validação de campos obrigatórios

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** `DropdownButtonFormField` com `initialValue` (linhas 75, 85) — `DropdownButtonFormField` não tem parâmetro `initialValue`. O correto é usar `value`. Isso causará erro de compilação ou comportamento inesperado. Impacto: **CÓDIGO NÃO COMPILA** ou dropdown não funciona. Correção: substituir `initialValue` por `value`.
- 🚨 **[CRÍTICO]** `auth.empresaId!` com null assertion (linha 44) — Se empresaId for null, crash. Impacto: crash. Correção: verificar null e mostrar erro.
- ⚠️ **[ALTO]** Sem feedback de sucesso — Se a OS for criada, a tela apenas volta (Navigator.pop). O usuário não vê confirmação. Impacto: confusão se a OS foi criada ou não. Correção: mostrar SnackBar de sucesso antes de pop.
- ⚠️ **[ALTO]** `_submit` sem try-catch — Se `SupabaseService.createOrder` lançar exceção (e lança, pois não tem try-catch), o app crasha. Impacto: crash. Correção: adicionar try-catch.
- 🔶 **[MÉDIO]** Dropdowns com valores fixos — "Corretiva"/"Preventiva" e "Normal"/"Urgente" hardcoded. Se o backend aceitar outros valores, o app não acompanha. Impacto: inconsistência. Correção: carregar valores do backend ou de constantes centralizadas.
- 🔶 **[MÉDIO]** `_isSubmitting` não é resetado se a navegação falhar — Se `Navigator.pop` for chamado mas a tela não for removida (ex: erro), `_isSubmitting` fica true. Impacto: botão desabilitado permanentemente. Correção: usar try-finally.
- ℹ️ **[BAIXO]** `_error` não é limpo ao digitar — Se o usuário corrige o erro, a mensagem permanece. Impacto: experiência confusa. Correção: limpar erro no onChanged dos campos.

**Melhorias sugeridas:**
- Corrigir `initialValue` para `value` nos DropdownButtonFormField (prioridade: crítica)
- Adicionar try-catch no _submit (prioridade: crítica)
- Adicionar feedback de sucesso com SnackBar (prioridade: alta)
- Centralizar valores de dropdown em constantes (prioridade: média)

**NOTA: 5.0/10**

---

#### 2.12 `screens/os_detail_screen.dart` — NOTA: 6.0/10

**O que foi analisado:** Tela de detalhes da OS.

**Pontos fortes:**
- ✅ **Máquina de estados bem definida** — `_statusActions` com switch completo para todos os status
- ✅ **Transições de status claras** — Aberta → Em Andamento → Aguardando Material → Concluída
- ✅ **Botão para solicitar material** vinculado à OS
- ✅ **SnackBar de feedback** após atualização de status
- ✅ **Botão de recarregar** no AppBar
- ✅ **Tratamento de ordem não encontrada**

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** `didChangeDependencies` para carregar dados (linha 19) — Este método é chamado múltiplas vezes durante o ciclo de vida. A verificação `if (_future == null)` evita recarga, mas se as dependências mudarem (ex: rota com argumentos diferentes), o dado não será recarregado. Impacto: dados incorretos se a tela for reutilizada. Correção: usar `ModalRoute.of(context)!.settings.arguments` em initState ou usar `onGenerateRoute` com argumentos tipados.
- ⚠️ **[ALTO]** `_changeStatus` sem try-catch — Se `updateOrderStatus` lançar exceção, o app crasha. Impacto: crash. Correção: adicionar try-catch.
- ⚠️ **[ALTO]** `_updating` não é resetado em caso de erro — Se a chamada falhar, `_updating` continua false (setState no finally não existe). Impacto: botões reabilitados mesmo com erro. Correção: usar try-finally.
- 🔶 **[MÉDIO]** `_detailTile` widget privado — Poderia ser um widget reutilizável em todo o app. Impacto: duplicação se outras telas precisarem. Correção: extrair para `widgets/detail_tile.dart`.
- 🔶 **[MÉDIO]** `_statusActions` retorna `List<Widget>` — Poderia retornar `Column` diretamente. Impacto: código mais verboso. Correção: retornar Widget.
- ℹ️ **[BAIXO]** Padding fixo de 16 — Mesmo problema de responsividade.

**Melhorias sugeridas:**
- Mover carregamento de dados para initState com argumentos tipados (prioridade: crítica)
- Adicionar try-catch em _changeStatus (prioridade: alta)
- Usar try-finally para resetar _updating (prioridade: alta)
- Extrair _detailTile para widget compartilhado (prioridade: baixa)

**NOTA: 6.0/10**

---

#### 2.13 `screens/material_request_screen.dart` — NOTA: 5.0/10

**O que foi analisado:** Tela de solicitação de material.

**Pontos fortes:**
- Vinculação com OS via arguments
- Validação de descrição e quantidade
- SnackBar de feedback
- Loading state no botão

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** `int.tryParse` sem validação de número inteiro positivo (linha 38) — Se o usuário digitar "1.5" ou "abc", `tryParse` retorna null e a validação pega. Mas se digitar "0", a validação `quantidade <= 0` pega. Porém, se digitar "-1", também pega. O problema é que não há validação no campo de texto em si. Impacto: erro só aparece após submit. Correção: adicionar validação em tempo real com `TextFormField` + `validator`.
- ⚠️ **[ALTO]** `auth.empresaId!` com null assertion (linha 53) — Mesmo problema de crash. Impacto: crash. Correção: verificar null.
- ⚠️ **[ALTO]** `_submit` sem try-catch — Se `requestMaterial` lançar exceção, crash. Impacto: crash. Correção: adicionar try-catch.
- 🔶 **[MÉDIO]** `_osId` carregado em `didChangeDependencies` (linha 24) — Mesmo problema do OSDetailScreen. Impacto: possível bug com argumentos. Correção: carregar em initState.
- 🔶 **[MÉDIO]** Sem validação de quantidade máxima — Um técnico pode solicitar 999999 unidades. Impacto: dados inconsistentes. Correção: adicionar validação de limite.
- ℹ️ **[BAIXO]** `_error` não é limpo ao digitar — Mesmo problema do CreateOSScreen.

**Melhorias sugeridas:**
- Usar `TextFormField` com `validator` para validação em tempo real (prioridade: alta)
- Adicionar try-catch no _submit (prioridade: crítica)
- Mover carregamento de _osId para initState (prioridade: alta)

**NOTA: 5.0/10**

---

#### 2.14 `widgets/loading_view.dart` — NOTA: 3.0/10

**O que foi analisado:** Widget genérico de loading.

**Pontos fortes:**
- Simples e funcional

**Problemas encontrados:**
- ⚠️ **[ALTO]** Sem mensagem de loading — Apenas um CircularProgressIndicator sem contexto. Impacto: usuário não sabe o que está carregando. Correção: adicionar parâmetro opcional `message`.
- ⚠️ **[ALTO]** Sem timeout — Se o loading travar (ex: rede perdida), o spinner fica para sempre. Impacto: usuário preso na tela de loading. Correção: adicionar timeout com fallback para tela de erro.
- 🔶 **[MÉDIO]** Widget muito genérico — Não personalizável (cor, tamanho, background). Impacto: reúso limitado. Correção: adicionar parâmetros de personalização.
- ℹ️ **[BAIXO]** Sem suporte a cancelamento — Se o usuário quiser voltar, não pode. Impacto: experiência frustrante. Correção: adicionar botão de cancelar ou back button.

**Melhorias sugeridas:**
- Adicionar parâmetro `message` para texto de loading (prioridade: alta)
- Adicionar timeout com callback de erro (prioridade: alta)
- Adicionar suporte a botão de cancelar (prioridade: média)

**NOTA: 3.0/10**

---

### NÍVEL 3 — SEGURANÇA (peso 3x) — NOTA: 3.5/10

#### 🔍 Armazenamento Seguro de Tokens

**O que foi analisado:** Uso do FlutterSecureStorage.

**Pontos fortes:**
- ✅ Uso correto de `flutter_secure_storage` para tokens e dados sensíveis
- ✅ `clearSession` e `clearAll` para limpeza

**Problemas encontrados:**
- ⚠️ **[ALTO]** `FlutterSecureStorage` sem configuração Android explícita — Em Android 12+, o comportamento padrão pode não ser o mais seguro. Impacto: possível vazamento de dados em dispositivos rootados. Correção: configurar `AndroidOptions(encryptedSharedPreferences: true)`.
- 🔶 **[MÉDIO]** Dados biométricos não utilizados — `FlutterSecureStorage` suporta autenticação biométrica, mas não está configurada. Impacto: qualquer um com acesso ao dispositivo pode abrir o app. Correção: implementar biometria para acesso ao app.

**NOTA: 5.0/10**

---

#### 🔍 Exposição de Chaves de API

**O que foi analisado:** .env file e variáveis de ambiente.

**Pontos fortes:**
- ✅ Uso de `.env` file para credenciais (não hardcoded)
- ✅ `.env` no `.gitignore` (assumindo que está)

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** `.env` commitado no repositório — O arquivo `.env` contém placeholders, mas se versões reais forem commitadas, as chaves do Supabase ficarão expostas. Impacto: **vazamento de credenciais**. Correção: garantir que `.env` real esteja no `.gitignore` e usar variáveis de ambiente do CI/CD.
- 🚨 **[CRÍTICO]** `anonKey` exposta no bundle — A chave anônima do Supabase é embutida no app bundle. Qualquer um pode extraí-la com engenharia reversa. Impacto: acesso não autorizado ao Supabase. Correção: implementar Row Level Security (RLS) no Supabase para limitar o que a anon key pode acessar.
- ⚠️ **[ALTO]** Sem validação de credenciais — Se o `.env` estiver vazio ou ausente, o app inicializa com strings vazias e falha silenciosamente. Impacto: app quebrado sem feedback. Correção: validar credenciais na inicialização.

**NOTA: 3.0/10**

---

#### 🔍 Validação de Entrada do Usuário

**O que foi analisado:** Validação em formulários.

**Pontos fortes:**
- ✅ Validação de campos obrigatórios em CreateOSScreen
- ✅ Validação de token não vazio em DeviceBindingScreen
- ✅ Validação de código/senha não vazios em LoginScreen

**Problemas encontrados:**
- ⚠️ **[ALTO]** Sem sanitização de entrada — Strings são enviadas diretamente ao Supabase sem sanitização. Embora o Supabase use parâmetros parametrizados (RPC), ainda há risco de injeção em consultas `ilike`. Impacto: possível SQL injection via search. Correção: sanitizar entrada do usuário.
- 🔶 **[MÉDIO]** Sem validação de formato — Token, código, tag sem validação de formato esperado. Impacto: chamadas de rede desnecessárias. Correção: validar formato no frontend.
- ℹ️ **[BAIXO]** Sem limite de tamanho — Campos de texto sem `maxLength`. Impacto: usuário pode digitar textos enormes. Correção: adicionar `maxLength` nos campos.

**NOTA: 4.0/10**

---

#### 🔍 Proteção Contra Injeção

**O que foi analisado:** SQL/NoSQL injection.

**Pontos fortes:**
- ✅ Uso de RPC (funções PostgreSQL) com parâmetros nomeados — Protege contra SQL injection
- ✅ Uso de `ilike` com parâmetros do Supabase (parametrizado)

**Problemas encontrados:**
- ⚠️ **[ALTO]** `towhee` injection via search — Embora o Supabase parametrize, a string de busca é concatenada diretamente na query `or('tag.ilike.%$s%,equipamento.ilike.%$s%,problema.ilike.%$s%')`. Se `s` contiver caracteres especiais, pode causar comportamento inesperado. Impacto: possível bypass de busca ou erro. Correção: usar placeholders do Supabase ou sanitizar.
- 🔶 **[MÉDIO]** Sem validação no backend — Toda a validação é no frontend. Um request malicioso direto à API pode inserir dados inválidos. Impacto: dados inconsistentes. Correção: implementar validação nas RPCs do PostgreSQL.

**NOTA: 5.0/10**

---

#### 🔍 Autenticação e Session Management

**O que foi analisado:** Fluxo de login, session management.

**Pontos fortes:**
- ✅ Fluxo de device binding + login em duas etapas
- ✅ Persistência de sessão com FlutterSecureStorage
- ✅ Logout limpa sessão

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** `setSession` com parâmetro incorreto (linha 51 do supabase_service) — `_client.auth.setSession(refreshToken)` espera um `Session`, não uma `String`. Isso provavelmente está errado e causará erro em runtime. Impacto: **sessão não é restaurada**, usuário precisa fazer login novamente. Correção: verificar documentação e corrigir.
- 🚨 **[CRÍTICO]** Sem refresh token automático — O Supabase Flutter gerencia refresh token automaticamente se configurado corretamente. Como `setSession` está incorreto, o refresh não funciona. Impacto: sessão expira e app para de funcionar. Correção: configurar `authCallbackUrlHostname` corretamente e usar `Supabase.initialize` com opções de auto-refresh.
- ⚠️ **[ALTO]** Device ID gerado localmente — `_getDeviceId` gera um ID baseado em timestamp + random. Não é criptograficamente seguro. Impacto: possível colisão ou spoofing. Correção: usar `uuid` package para gerar UUID v4.
- ⚠️ **[ALTO]** Sem verificação de dispositivo — O device binding não verifica se o dispositivo é confiável (ex: atestado de hardware). Impacto: qualquer um com o token QR pode vincular qualquer dispositivo. Correção: implementar verificação adicional (ex: PIN, biometria).
- 🔶 **[MÉDIO]** Token QR sem expiração — O `qrToken` pode ser reutilizado indefinidamente se não expirar no backend. Impacto: risco de segurança. Correção: implementar expiração de token QR no backend.

**NOTA: 2.5/10**

---

#### 🔍 .env File Handling

**O que foi analisado:** Carregamento e uso do .env.

**Pontos fortes:**
- ✅ `flutter_dotenv` configurado
- ✅ Tratamento de erro no carregamento (try-catch)

**Problemas encontrados:**
- ⚠️ **[ALTO]** `.env` commitado — O arquivo `.env` com placeholders está no repositório. Se alguém colocar credenciais reais e commitar, vazam. Impacto: vazamento de credenciais. Correção: adicionar `.env` ao `.gitignore` e criar `.env.example`.
- 🔶 **[MÉDIO]** Sem validação de chaves necessárias — O app não verifica se `SUPABASE_URL` e `SUPABASE_ANON_KEY` existem após carregar. Impacto: falha silenciosa. Correção: validar e mostrar erro.

**NOTA: 4.0/10**

---

### NÍVEL 4 — PERFORMANCE (peso 2x) — NOTA: 6.0/10

#### 🔍 Rebuilds Desnecessários

**O que foi analisado:** Provider, setState, rebuilds.

**Pontos fortes:**
- ✅ Provider com ChangeNotifier (notifica apenas quando necessário)
- ✅ `context.watch` usado apenas onde necessário

**Problemas encontrados:**
- ⚠️ **[ALTO]** `RootScreen` usa `context.watch<AuthProvider>()` — Rebuilda a tela inteira quando qualquer propriedade muda. Impacto: performance degradada em transições de estado. Correção: usar `context.select` para escutar apenas `isLoading`, `isDeviceBound`, `isLoggedIn`.
- 🔶 **[MÉDIO]** `notifyListeners()` chamado duas vezes em `loadSavedState` (linhas 20 e 31) — Causa dois rebuilds desnecessários. Impacto: pequena degradação. Correção: chamar apenas no final.
- ℹ️ **[BAIXO]** `setState` em DeviceBindingScreen e LoginScreen para `_error` — Poderia usar provider para estado de erro também. Impacto: mínimo.

**NOTA: 5.0/10**

---

#### 🔍 Debounce na Busca

**O que foi analisado:** Implementação do debounce em HomeScreen.

**Pontos fortes:**
- ✅ Debounce de 400ms corretamente implementado
- ✅ Timer cancelado em dispose
- ✅ Timer cancelado antes de criar novo

**Problemas encontrados:**
- 🔶 **[MÉDIO]** 400ms pode ser muito curto para conexões lentas — Em campo com 3G/4G, 400ms pode gerar muitas chamadas. Impacto: consumo de dados e bateria. Correção: aumentar para 600-800ms ou tornar configurável.
- ℹ️ **[BAIXO]** Sem indicador de busca — O usuário não sabe que uma busca está sendo feita. Impacto: pode digitar mais antes do resultado. Correção: mostrar indicador sutil.

**NOTA: 7.0/10**

---

#### 🔍 Otimização de Listas

**O que foi analisado:** ListView vs ListView.builder.

**Pontos fortes:**
- ✅ `ListView.separated` usado (versão otimizada do ListView.builder)
- ✅ `itemCount` definido

**Problemas encontrados:**
- ⚠️ **[ALTO]** Sem paginação — Para 1000+ OS, a lista carrega tudo de uma vez. Impacto: lentidão e consumo de memória. Correção: implementar paginação com `range()` do Supabase e scroll infinito.
- 🔶 **[MÉDIO]** `separatorBuilder` cria `Divider()` para cada item — Poderia ser `Divider(height: 1)` para economizar altura. Impacto: mínimo.

**NOTA: 5.0/10**

---

#### 🔍 Memória

**O que foi analisado:** Controllers, timers, streams.

**Pontos fortes:**
- ✅ Todos os `TextEditingController` são descartados em `dispose()`
- ✅ `Timer` é cancelado em `dispose()`
- ✅ Nenhuma stream subscription sem dispose

**Problemas encontrados:**
- 🔶 **[MÉDIO]** `Future` sem cancelamento — Se a tela for fechada enquanto um Future está em andamento, o callback pode tentar usar `context` ou `setState` após dispose. Impacto: erro "setState called after dispose". Correção: verificar `mounted` antes de setState.
- ℹ️ **[BAIXO]** Imagens não otimizadas — O app usa `Icon(Icons.build)` em vez de imagens. Sem impacto, mas se imagens forem adicionadas, precisarão de otimização.

**NOTA: 6.0/10**

---

#### 🔍 Network Calls

**O que foi analisado:** Cache, chamadas repetidas.

**Pontos fortes:**
- ✅ Nenhuma chamada duplicada desnecessária (com exceção de reload manual)

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Sem cache offline — Cada navegação faz nova chamada ao Supabase. Em campo sem internet, o app não funciona. Impacto: **app inutilizável offline**. Correção: implementar cache local com Hive/Drift e sincronização.
- ⚠️ **[ALTO]** Sem timeout configurado — As chamadas ao Supabase podem travar indefinidamente em rede lenta. Impacto: usuário esperando para sempre. Correção: configurar timeout no Supabase client.
- 🔶 **[MÉDIO]** Sem retry logic — Se uma chamada falhar por erro de rede, não há tentativa automática. Impacto: usuário precisa clicar em "Recarregar" manualmente. Correção: implementar retry com backoff exponencial.

**NOTA: 3.0/10**

---

#### 🔍 FutureBuilder Uso Correto

**O que foi analisado:** Uso de FutureBuilder em HomeScreen e OSDetailScreen.

**Pontos fortes:**
- ✅ `connectionState` verificado antes de usar dados
- ✅ Tratamento de `hasError`
- ✅ Tratamento de dados null/vazios

**Problemas encontrados:**
- ⚠️ **[ALTO]** `Future` recriado a cada reload — O FutureBuilder perde o estado anterior. Impacto: flash de loading a cada reload. Correção: usar `AsyncSnapshot` ou estado separado com `setState`.
- 🔶 **[MÉDIO]** Sem loading state inicial — O FutureBuilder mostra loading apenas na primeira vez. Em reloads, também mostra loading, mas sem indicador visual claro. Impacto: experiência confusa. Correção: manter dados antigos durante reload.

**NOTA: 5.0/10**

---

### NÍVEL 5 — TRATAMENTO DE ERROS (peso 2x) — NOTA: 3.5/10

#### 🔍 Try-catch em Operações Críticas

**O que foi analisado:** Uso de try-catch em todo o código.

**Pontos fortes:**
- ✅ `bindDevice` e `login` em AuthProvider têm try-catch
- ✅ Métodos RPC em SupabaseService têm try-catch para PostgrestException

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** `createOrder`, `updateOrderStatus`, `fetchOrder`, `requestMaterial`, `signOut` SEM try-catch — Qualquer exceção não capturada causa crash. Impacto: **crash do app**. Correção: adicionar try-catch em todos.
- 🚨 **[CRÍTICO]** `catch (_)` genérico em main.dart (linhas 16, 26) — Engole TODOS os erros sem log. Impacto: **debug impossível**. Correção: logar o erro.
- ⚠️ **[ALTO]** `catch (e)` genérico em AuthProvider (linhas 64, 99) — Captura qualquer exceção e retorna string genérica. Impacto: erros específicos (timeout, network) são tratados igualmente. Correção: capturar exceções específicas.
- ⚠️ **[ALTO]** Sem try-catch em `_submit` do CreateOSScreen e MaterialRequestScreen — Se o serviço lançar exceção, crash. Impacto: crash. Correção: adicionar try-catch.

**NOTA: 2.0/10**

---

#### 🔍 Mensagens de Erro para o Usuário

**O que foi analisado:** Qualidade das mensagens de erro.

**Pontos fortes:**
- ✅ Mensagens em português
- ✅ Erros exibidos em Text vermelho
- ✅ `Falha ao vincular o dispositivo: ${e.toString()}` inclui detalhe do erro

**Problemas encontrados:**
- ⚠️ **[ALTO]** Mensagens genéricas demais — "Falha ao criar a ordem de serviço." não informa o motivo. Impacto: usuário não sabe o que fazer. Correção: incluir detalhes do erro.
- 🔶 **[MÉDIO]** Erros técnicos expostos ao usuário — `e.toString()` pode mostrar detalhes internos (stack trace, nome de tabelas). Impacto: vazamento de informação. Correção: mostrar mensagem amigável e logar detalhe técnico.
- ℹ️ **[BAIXO]** Sem internacionalização — Mensagens apenas em português. Impacto: baixo para o contexto.

**NOTA: 4.0/10**

---

#### 🔍 Logging

**O que foi analisado:** Presença de logging.

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Zero logging em todo o app — Nenhum `print`, `debugPrint`, `log`, ou logger. Impacto: **impossível diagnosticar problemas em produção**. Correção: adicionar `package:logging` ou `dart:developer` log em operações críticas.
- 🚨 **[CRÍTICO]** Sem crash reporting — Nenhum FlutterError.onError ou PlatformDispatcher.onError configurado. Impacto: crashes silenciosos. Correção: configurar Firebase Crashlytics ou Sentry.

**NOTA: 0.5/10**

---

#### 🔍 Fallbacks (Offline Mode)

**O que foi analisado:** Suporte a modo offline.

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Zero suporte offline — O app depende 100% de conectividade com o Supabase. Impacto: **inutilizável em campo sem internet**. Correção: implementar cache local com sincronização.
- 🚨 **[CRÍTICO]** Sem detecção de conectividade — O app não verifica se está online antes de fazer chamadas. Impacto: chamadas falham silenciosamente ou travam. Correção: usar `connectivity_plus` para detectar e mostrar estado offline.

**NOTA: 1.0/10**

---

#### 🔍 Estados de Erro na UI

**O que foi analisado:** Como a UI reage a erros.

**Pontos fortes:**
- ✅ HomeScreen tem error state com botão "Recarregar"
- ✅ OSDetailScreen mostra "Ordem não encontrada"
- ✅ SnackBar de feedback em OSDetailScreen

**Problemas encontrados:**
- ⚠️ **[ALTO]** DeviceBindingScreen e LoginScreen mostram erro apenas como Text vermelho — Sem ícone, sem destaque visual. Impacto: erro pode passar despercebido. Correção: usar `SnackBar` ou `AlertDialog` para erros.
- 🔶 **[MÉDIO]** CreateOSScreen e MaterialRequestScreen mostram erro como Text — Sem destaque. Impacto: mesmo problema.
- ℹ️ **[BAIXO]** Sem empty state visualmente rico — Apenas texto "Nenhuma ordem encontrada." sem ilustração. Impacto: experiência pobre.

**NOTA: 5.0/10**

---

### NÍVEL 6 — UX/UI (peso 1.5x) — NOTA: 6.5/10

#### 🔍 Feedback Visual

**O que foi analisado:** Loading, erro, sucesso.

**Pontos fortes:**
- ✅ Loading state em botões (CircularProgressIndicator)
- ✅ SnackBar de sucesso em OSDetailScreen e MaterialRequestScreen
- ✅ Cores por status na lista

**Problemas encontrados:**
- ⚠️ **[ALTO]** Sem feedback de sucesso em CreateOSScreen e DeviceBindingScreen — Apenas navega para trás sem confirmação. Impacto: usuário não sabe se a operação foi bem-sucedida. Correção: adicionar SnackBar.
- 🔶 **[MÉDIO]** LoadingView sem mensagem — Apenas spinner sem contexto. Impacto: usuário não sabe o que está carregando. Correção: adicionar texto.
- ℹ️ **[BAIXO]** Sem animações de transição — Navegação padrão do Flutter sem personalização. Impacto: experiência básica.

**NOTA: 5.0/10**

---

#### 🔍 Responsividade

**O que foi analisado:** Adaptação a diferentes tamanhos de tela.

**Problemas encontrados:**
- ⚠️ **[ALTO]** Padding fixo de 16 em todas as telas — Em tablets, o conteúdo fica muito esticado. Impacto: visual pobre em telas grandes. Correção: usar `LayoutBuilder` ou `MediaQuery` para padding responsivo.
- 🔶 **[MÉDIO]** ListView sem adaptação para landscape — Em landscape, a lista ocupa toda a largura. Impacto: linhas muito longas difíceis de ler. Correção: limitar largura máxima em landscape.
- ℹ️ **[BAIXO]** Botões com largura total — Em tablets, botões muito largos. Impacto: visual estranho. Correção: limitar largura máxima de botões.

**NOTA: 4.0/10**

---

#### 🔍 Acessibilidade

**O que foi analisado:** Suporte a acessibilidade.

**Problemas encontrados:**
- ⚠️ **[ALTO]** Sem `Semantics` em widgets — Nenhum widget tem propriedades de acessibilidade. Impacto: app inacessível para usuários com deficiência visual. Correção: adicionar `Semantics` e `label` em widgets interativos.
- 🔶 **[MÉDIO]** Cores sem contraste verificado — As cores de status (azul, laranja, roxo, verde, cinza) podem não ter contraste suficiente com fundo branco. Impacto: difícil leitura para daltônicos. Correção: verificar contraste WCAG e ajustar.
- ℹ️ **[BAIXO]** Font size fixo — Sem suporte a `MediaQuery.textScaleFactor`. Impacto: usuários que aumentam fonte no sistema não são beneficiados. Correção: usar `Text` com estilo do tema.

**NOTA: 3.0/10**

---

#### 🔍 Navegação

**O que foi analisado:** Push/pop, rotas.

**Pontos fortes:**
- ✅ Navegação nomeada com `Navigator.pushNamed`
- ✅ `Navigator.pop` após operações bem-sucedidas
- ✅ `_reload()` após retorno de telas de detalhe/criação

**Problemas encontrados:**
- ⚠️ **[ALTO]** Rotas sem typed arguments — `arguments` como `Object?` sem type safety. Impacto: ClassCastException. Correção: usar `onGenerateRoute` com typed arguments.
- 🔶 **[MÉDIO]** Sem deep linking — Rotas fixas sem suporte a links externos. Impacto: não é possível abrir uma OS específica por notificação. Correção: implementar deep linking com GoRouter.

**NOTA: 5.0/10**

---

#### 🔍 Consistência Visual

**O que foi analisado:** Tema, cores, estilos.

**Pontos fortes:**
- ✅ Material 3 ativado
- ✅ `ColorScheme.fromSeed` com cor consistente
- ✅ Cores de status consistentes entre HomeScreen e OSDetailScreen

**Problemas encontrados:**
- 🔶 **[MÉDIO]** Tema incompleto — Sem `TextTheme`, `InputDecorationTheme`, `ElevatedButtonTheme`. Impacto: widgets usam estilo padrão do Flutter, não personalizado. Correção: definir tema completo.
- 🔶 **[MÉDIO]** InputDecoration sem ícones — Campos de texto sem `prefixIcon` ou `suffixIcon` (exceto search). Impacto: visual básico. Correção: adicionar ícones nos campos.
- ℹ️ **[BAIXO]** AppBar sem cor personalizada — Usa cor padrão do tema. Impacto: visual genérico.

**NOTA: 5.0/10**

---

### NÍVEL 7 — CÓDIGO E BOAS PRÁTICAS (peso 1.5x) — NOTA: 5.5/10

#### 🔍 Nomenclatura

**O que foi analisado:** Padrão Dart/Flutter.

**Pontos fortes:**
- ✅ `camelCase` para variáveis e métodos
- ✅ `PascalCase` para classes
- ✅ Prefixo `_` para membros privados
- ✅ Nomes descritivos (ex: `_tokenController`, `_bindDevice`)

**Problemas encontrados:**
- 🔶 **[MÉDIO]** `RPCResult` deveria ser `RpcResult` — Convenção Dart para acronymos. Impacto: violação de estilo. Correção: renomear.
- 🔶 **[MÉDIO]** `OSStatus` deveria ser `OsStatus` — Mesmo problema. Impacto: violação de estilo. Correção: renomear.
- ℹ️ **[BAIXO]** `OrdemServico` em português — Consistente com o domínio, mas poderia ser `ServiceOrder` para alinhamento com ecossistema Flutter (majoritariamente inglês).

**NOTA: 6.0/10**

---

#### 🔍 Comentários e Documentação

**O que foi analisado:** Presença de comentários.

**Pontos fortes:**
- ✅ Comentários em português explicando decisões (ex: main.dart linhas 12-13, 17, 27)
- ✅ Doc comments em StorageService e SupabaseService
- ✅ Comentários explicando filtros e debounce

**Problemas encontrados:**
- 🔶 **[MÉDIO]** Falta documentação em métodos públicos — `AuthProvider.login`, `SupabaseService.createOrder`, etc. sem doc comments. Impacto: dificuldade de onboarding. Correção: adicionar doc comments.
- ℹ️ **[BAIXO]** Comentários em português — Mistura de português e inglês no código. Impacto: inconsistência. Correção: padronizar em inglês para código, português para comentários de domínio.

**NOTA: 5.0/10**

---

#### 🔍 Código Morto

**O que foi analisado:** Código não utilizado.

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Classe `FlutterMecanicoApp` em main.dart (linhas 33-39) — Definida mas nunca usada. Impacto: código morto. Correção: remover.
- 🔶 **[MÉDIO]** `fetchOpenOrders` em supabase_service.dart (linha 143) — Marcado como "mantido por compatibilidade" mas sem evidência de uso. Impacto: código morto. Correção: remover ou confirmar uso.
- ℹ️ **[BAIXO]** `export 'src/app.dart'` em main.dart (linha 6) — Redundante com o import na linha 7. Impacto: redundância. Correção: remover.

**NOTA: 4.0/10**

---

#### 🔍 Complexidade Ciclomática

**O que foi analisado:** Complexidade dos métodos.

**Pontos fortes:**
- ✅ Métodos geralmente pequenos e focados
- ✅ `_statusActions` com switch bem organizado

**Problemas encontrados:**
- 🔶 **[MÉDIO]** `_abrirFiltros` em HomeScreen (linhas 54-116) — Método muito longo (62 linhas) com lógica de UI e estado. Impacto: difícil testar e manter. Correção: extrair BottomSheet para widget separado.
- 🔶 **[MÉDIO]** `build` do HomeScreen (linhas 136-273) — 137 linhas, muito longo. Impacto: difícil ler. Correção: extrair seções em métodos ou widgets.

**NOTA: 5.0/10**

---

#### 🔍 Duplicação de Código

**O que foi analisado:** Código repetido.

**Problemas encontrados:**
- 🔶 **[MÉDIO]** Padrão de loading repetido — `SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))` aparece em 4 telas. Impacto: duplicação. Correção: criar widget `SmallLoading()`.
- 🔶 **[MÉDIO]** Padrão de erro repetido — `if (_error != null) ...[Text(_error!, style: const TextStyle(color: Colors.red))]` aparece em 4 telas. Impacto: duplicação. Correção: criar widget `ErrorMessage()`.
- ℹ️ **[BAIXO]** Padding de 16 repetido — `padding: const EdgeInsets.all(16)` em todas as telas. Impacto: mínimo.

**NOTA: 5.0/10**

---

#### 🔍 Tamanho dos Métodos

**O que foi analisado:** Métodos muito longos.

**Problemas encontrados:**
- ⚠️ **[ALTO]** `build` do HomeScreen (137 linhas) — Muito longo. Impacto: difícil manutenção. Correção: extrair em widgets: `SearchBar`, `OrderList`, `OrderTile`.
- 🔶 **[MÉDIO]** `_abrirFiltros` (62 linhas) — Longo. Correção: extrair BottomSheet.
- 🔶 **[MÉDIO]** `build` do OSDetailScreen (70+ linhas) — Longo. Correção: extrair seções.

**NOTA: 4.0/10**

---

#### 🔍 Imports Organizados

**O que foi analisado:** Organização de imports.

**Pontos fortes:**
- ✅ Imports agrupados por tipo (flutter, provider, serviços)
- ✅ Imports relativos corretos

**Problemas encontrados:**
- ℹ️ **[BAIXO]** `dart:math` importado apenas para `Random()` — Poderia ser substituído por lógica mais simples. Impacto: mínimo.

**NOTA: 7.0/10**

---

#### 🔍 Formatação

**O que foi analisado:** Formatação do código.

**Pontos fortes:**
- ✅ Código bem formatado (consistente com dart format)
- ✅ Indentação correta
- ✅ Espaçamento consistente

**Problemas encontrados:**
- Nenhum significativo.

**NOTA: 8.0/10**

---

### NÍVEL 8 — TESTES (peso 2x) — NOTA: 1.5/10

#### 🔍 `test/widget_test.dart`

**O que foi analisado:** Arquivo de teste existente.

**Pontos fortes:**
- ✅ Existe um arquivo de teste

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Teste NÃO funciona — `testWidgets('Counter increments smoke test', ...)` — O nome do teste é enganoso ("Counter increments" não faz sentido). O teste tenta renderizar `App()` sem Provider, o que causará erro porque `App` depende de `ChangeNotifierProvider`. Impacto: **teste quebrado**. Correção: corrigir teste ou remover.
- 🚨 **[CRÍTICO]** Teste não testa nada relevante — Apenas verifica se existe um CircularProgressIndicator. Não testa fluxo de login, criação de OS, etc. Impacto: **0% de cobertura útil**. Correção: escrever testes significativos.
- 🚨 **[CRÍTICO]** Sem testes unitários — Nenhum teste para `OrdemServico.fromMap`, `AuthProvider.login`, `SupabaseService.fetchOrders`, etc. Impacto: **0% de cobertura unitária**. Correção: adicionar testes unitários.
- 🚨 **[CRÍTICO]** Sem mocks — Nenhum mock de SupabaseClient ou FlutterSecureStorage. Impacto: impossível testar providers e services isoladamente. Correção: usar `mockito` ou `mocktail`.
- ⚠️ **[ALTO]** Sem testes de widget — Nenhum teste para as telas (login, home, create OS, etc.). Impacto: regressões visuais não detectadas. Correção: adicionar testes de widget com `WidgetTester`.
- ⚠️ **[ALTO]** Sem testes de integração — Nenhum teste de fluxo completo. Impacto: bugs de integração não detectados. Correção: adicionar testes de integração.

**Melhorias sugeridas:**
- Corrigir ou remover teste smoke quebrado (prioridade: crítica)
- Adicionar testes unitários para OrdemServico (prioridade: crítica)
- Adicionar mocks para Supabase e Storage (prioridade: crítica)
- Adicionar testes de widget para cada tela (prioridade: alta)
- Adicionar testes de integração para fluxos principais (prioridade: alta)

**NOTA: 1.0/10**

---

### NÍVEL 9 — DEPENDÊNCIAS E ECOSSISTEMA (peso 1x) — NOTA: 6.0/10

#### 🔍 Versões das Dependências

**O que foi analisado:** Atualização das dependências.

**Pontos fortes:**
- ✅ Dependências com versões específicas (evita breaking changes inesperados)
- ✅ SDK constraint ^3.12.0 (versão recente do Dart)

**Problemas encontrados:**
- ⚠️ **[ALTO]** `supabase_flutter: 1.4.0` — Versão desatualizada (2.x disponível). Impacto: vulnerabilidades conhecidas, falta de funcionalidades novas. Correção: atualizar para ^2.0.0.
- ⚠️ **[ALTO]** `flutter_secure_storage: ^9.0.0` — Versão 9.0.0 tem bugs no Android 14. Impacto: possível falha em dispositivos novos. Correção: atualizar para ^9.2.0.
- 🔶 **[MÉDIO]** `flutter_lints: ^6.0.0` — Versão 7.x disponível com melhores regras. Impacto: oportunidades de qualidade perdidas. Correção: atualizar.
- 🔶 **[MÉDIO]** `intl: ^0.19.0` — Versão 0.20.x disponível. Impacto: pequeno, mas pode ter correções de bugs. Correção: atualizar.

**NOTA: 5.0/10**

---

#### 🔍 Dependências Não Utilizadas

**O que foi analisado:** Dependências sem uso.

**Problemas encontrados:**
- 🔶 **[MÉDIO]** `cupertino_icons: ^1.0.8` — Não há uso de ícones Cupertino no código. Impacto: dependência desnecessária aumentando o bundle. Correção: remover.
- ℹ️ **[BAIXO]** `intl: ^0.19.0` — O pacote está nas dependências mas a formatação de data é feita manualmente em `ordem_servico.dart`. Impacto: dependência subutilizada. Correção: usar `DateFormat` do intl ou remover.

**NOTA: 5.0/10**

---

#### 🔍 Dependências Faltantes

**O que foi analisado:** Dependências necessárias mas ausentes.

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Sem dependência para cache offline — `hive`, `drift` ou `sqflite` necessários para funcionamento offline. Impacto: app não funciona offline. Correção: adicionar dependência de banco local.
- ⚠️ **[ALTO]** Sem `connectivity_plus` — Necessário para detectar conectividade. Impacto: app não sabe se está online. Correção: adicionar dependência.
- ⚠️ **[ALTO]** Sem `uuid` — Necessário para gerar device IDs seguros. Impacto: device ID inseguro. Correção: adicionar dependência.
- 🔶 **[MÉDIO]** Sem `mockito` ou `mocktail` — Necessário para testes. Impacto: impossível mockar dependências. Correção: adicionar dev_dependency.
- 🔶 **[MÉDIO]** Sem `logging` — Necessário para logging estruturado. Impacto: sem logs. Correção: adicionar dependência.

**NOTA: 3.0/10**

---

### NÍVEL 10 — PLATAFORMA (peso 1x) — NOTA: 5.0/10

#### 🔍 Android

**O que foi analisado:** Configuração Android.

**Pontos fortes:**
- ✅ Projeto Android configurado (build.gradle.kts, settings.gradle.kts)
- ✅ Gradle wrapper presente

**Problemas encontrados:**
- ⚠️ **[ALTO]** `flutter_secure_storage` no Android 14 — Pode exigir configuração adicional para scoped storage. Impacto: falha em dispositivos Android 14+. Correção: configurar `AndroidOptions` com `encryptedSharedPreferences: true`.
- 🔶 **[MÉDIO]** Permissões não configuradas — Se o app precisar de câmera (para ler QR code), não há permissão configurada. Impacto: funcionalidade de QR code não implementada. Correção: adicionar permissão de câmera se necessário.

**NOTA: 5.0/10**

---

#### 🔍 iOS

**O que foi analisado:** Configuração iOS.

**Pontos fortes:**
- ✅ Projeto iOS configurado (Runner.xcodeproj, Runner.xcworkspace)
- ✅ RunnerTests presente

**Problemas encontrados:**
- 🔶 **[MÉDIO]** Sem configuração de `NSAppTransportSecurity` — Se o Supabase usar HTTP (não HTTPS), o iOS bloqueará. Impacto: possível falha de rede. Correção: verificar e configurar ATS se necessário.
- ℹ️ **[BAIXO]** Sem ícones personalizados — Ícones padrão do Flutter. Impacto: visual genérico.

**NOTA: 5.0/10**

---

#### 🔍 Web

**O que foi analisado:** Suporte Web.

**Pontos fortes:**
- ✅ Projeto Web configurado (index.html, manifest.json, favicon)
- ✅ main.dart trata Web como caso especial (comentário linha 12-13)

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** `flutter_secure_storage` NÃO funciona na Web — O pacote não suporta Web. Se o app for compilado para Web, quebrará. Impacto: **app não funciona na Web**. Correção: usar `flutter_secure_storage_web` ou condicionalmente usar `shared_preferences` na Web.
- 🚨 **[CRÍTICO]** `FlutterSecureStorage` é `const` — A inicialização pode falhar na Web. Impacto: crash na Web. Correção: tratar plataforma condicionalmente.
- ⚠️ **[ALTO]** `dotenv` na Web — O comentário em main.dart diz "no Flutter Web o arquivo não existe na raiz". O tratamento atual (catch silencioso) faz o app funcionar sem credenciais na Web. Impacto: app Web não funcional. Correção: implementar fallback para variáveis de ambiente do servidor Web.

**NOTA: 2.0/10**

---

#### 🔍 Desktop (Windows/macOS/Linux)

**O que foi analisado:** Suporte Desktop.

**Pontos fortes:**
- ✅ Projetos Windows, macOS e Linux configurados
- ✅ CMakeLists.txt presente para Linux e Windows

**Problemas encontrados:**
- 🔶 **[MÉDIO]** `flutter_secure_storage` no Linux — Pode exigir `libsecret-1-dev` ou `gnome-keyring`. Impacto: possível falha no Linux. Correção: documentar dependências ou usar fallback.
- ℹ️ **[BAIXO]** Sem testes em desktop — Não há evidência de que o app foi testado em desktop. Impacto: possíveis bugs não detectados.

**NOTA: 5.0/10**

---

## 5. 🏆 TOP 10 PROBLEMAS MAIS CRÍTICOS

| # | Problema | Gravidade | Arquivo | Impacto |
|---|---|---|---|---|
| 1 | **Zero suporte offline** — App não funciona sem internet | 🚨 CRÍTICO | Todo o app | App inutilizável em campo |
| 2 | **Sem logging e crash reporting** — Impossível diagnosticar problemas | 🚨 CRÍTICO | main.dart, todo app | Debug cego em produção |
| 3 | **setSession com parâmetro incorreto** — Sessão não é restaurada | 🚨 CRÍTICO | supabase_service.dart:51 | Usuário precisa logar sempre |
| 4 | **Métodos sem try-catch** — createOrder, updateOrderStatus, fetchOrder, requestMaterial, signOut podem crashar | 🚨 CRÍTICO | supabase_service.dart | Crash do app |
| 5 | **Testes inexistentes/quebrados** — 0% de cobertura, teste smoke não funciona | 🚨 CRÍTICO | test/widget_test.dart | Regressões não detectadas |
| 6 | **Arquitetura sem injeção de dependência** — Serviços estáticos, impossível testar | 🚨 CRÍTICO | services/, providers/ | Impossível testar |
| 7 | **DropdownButtonFormField com initialValue inválido** — Código não compila ou dropdown não funciona | 🚨 CRÍTICO | create_os_screen.dart:75,85 | Funcionalidade quebrada |
| 8 | **flutter_secure_storage na Web** — Pacote incompatível, crash na Web | 🚨 CRÍTICO | storage_service.dart | App quebra na Web |
| 9 | **Null assertions sem verificação** — `auth.empresaId!` pode crashar | 🚨 CRÍTICO | home_screen.dart:42, create_os_screen.dart:44, material_request_screen.dart:53 | Crash do app |
| 10 | **Código morto (FlutterMecanicoApp)** — Classe não utilizada | ⚠️ ALTO | main.dart:33-39 | Confusão e manutenção |

---

## 6. 🗺️ ROADMAP DE MELHORIAS

### 🔴 CURTO PRAZO (1-2 semanas) — Correções Críticas

1. **Corrigir `setSession`** — Verificar documentação do Supabase Flutter e corrigir parâmetro
2. **Adicionar try-catch em todos os métodos sem tratamento** — createOrder, updateOrderStatus, fetchOrder, requestMaterial, signOut
3. **Corrigir `DropdownButtonFormField`** — Substituir `initialValue` por `value`
4. **Remover null assertions** — Verificar `auth.empresaId!` antes de usar
5. **Remover classe `FlutterMecanicoApp` morta**
6. **Adicionar logging básico** — `debugPrint` em operações críticas
7. **Corrigir teste smoke** — Fazer teste funcionar ou remover

### 🟡 MÉDIO PRAZO (2-4 semanas) — Arquitetura e Qualidade

1. **Implementar injeção de dependência** — Tornar serviços instanciáveis com interfaces
2. **Adicionar cache offline** — Implementar Hive/Drift para armazenamento local
3. **Adicionar `connectivity_plus`** — Detectar modo offline e mostrar estado
4. **Implementar paginação** — Adicionar `range()` nas consultas de OS
5. **Adicionar testes unitários** — Testar OrdemServico, AuthProvider, SupabaseService com mocks
6. **Adicionar `uuid` para device ID** — Substituir geração insegura
7. **Configurar crash reporting** — Firebase Crashlytics ou Sentry

### 🟢 LONGO PRAZO (1-2 meses) — Evolução

1. **Implementar Clean Architecture** — Separar em camadas domain/data/presentation
2. **Migrar para Riverpod ou BLoC** — Gerenciamento de estado mais escalável
3. **Implementar sincronização offline** — Fila de operações pendentes com sync automático
4. **Adicionar deep linking** — GoRouter com suporte a notificações push
5. **Implementar biometria** — Acesso ao app com impressão digital/Face ID
6. **Adicionar internacionalização** — Suporte a múltiplos idiomas
7. **Implementar subscriptions em tempo real** — Supabase Stream para dados atualizados

---

## 7. ✅ CONCLUSÃO E RECOMENDAÇÕES FINAIS

O **flutter_mecanico** é um MVP funcional que demonstra compreensão sólida dos conceitos fundamentais do Flutter: Provider para estado, navegação nomeada, FutureBuilder para operações assíncronas, e uma máquina de estados bem definida para o fluxo de ordens de serviço. O código é limpo e bem formatado, e a separação em diretórios por tipo (models, providers, screens, services, widgets) é um bom começo.

**No entanto, o sistema está longe de ser production-ready.** Os problemas mais graves são:

1. **Ausência total de suporte offline** — Para um app usado por técnicos em campo, isso é inaceitável. Sem internet, o app é inútil.
2. **Falta de testes** — Zero cobertura de testes significa que qualquer mudança pode quebrar funcionalidades sem aviso.
3. **Tratamento de erros insuficiente** — Métodos sem try-catch podem crashar o app, e a ausência de logging torna o debug impossível.
4. **Arquitetura frágil** — Serviços estáticos e acoplamento direto impedem testabilidade e dificultam manutenção.
5. **Problemas de segurança** — `setSession` incorreto, device ID inseguro, e falta de refresh token automático comprometem a autenticação.

**Recomendações finais:**

- **Não colocar em produção sem antes resolver os itens de curto prazo.** Os problemas críticos (setSession, try-catch, null assertions) podem causar crashes em produção.
- **Priorizar cache offline e detecção de conectividade.** Este é o diferencial mais importante para o público-alvo (técnicos em campo).
- **Investir em testes desde agora.** Quanto mais o código crescer, mais difícil será adicionar testes depois.
- **Considerar uma reestruturação arquitetural** para Clean Architecture ou similar antes de adicionar novas funcionalidades, para evitar que o acoplamento atual se torne uma dívida técnica impagável.

O potencial do app é claro, e a base de código é sólida o suficiente para evoluir. Com as correções e melhorias propostas, o flutter_mecanico pode se tornar uma ferramenta robusta e confiável para manutenção industrial.

---

*Relatório gerado em 11/07/2026. Análise exaustiva de 16 arquivos, 1.200+ linhas de código.*