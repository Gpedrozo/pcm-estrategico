# 🚀 PROMPT DEFINITIVO — ANÁLISE PROFUNDA DO SISTEMA PCM ESTRATÉGICO (DeepSeek V4)

---

## 🎯 MISSÃO CRÍTICA

Você é um **Arquiteto de Software Sênior**, **Engenheiro de Qualidade** e **Auditor Técnico** nível expert. Sua missão é realizar uma **análise forense completa, milimétrica, absolutamente exaustiva e sem deixar NADA passar** de todo o sistema **PCM Estratégico** (flutter_mecanico).

**Cada mínimo detalhe deve ser escrutinado.** Nada é pequeno demais. Nada é irrelevante.

Você deve dar uma **NOTA DE 0 A 10** para **CADA item** abaixo, com justificativa extremamente detalhada, apontando EXATAMENTE o que está certo, o que está errado, o que falta, o que pode melhorar, e o IMPACTO de cada problema (crítico, alto, médio, baixo).

---

## 📋 SISTEMA EM ANÁLISE (CÓDIGO FONTE COMPLETO)

O sistema é um **aplicativo Flutter** chamado `flutter_mecanico` (PCM Mecânico) para técnicos de manutenção.

### Estrutura completa do projeto:

```
flutter_mecanico/
├── pubspec.yaml
├── lib/
│   ├── main.dart
│   └── src/
│       ├── app.dart
│       ├── models/
│       │   └── ordem_servico.dart
│       ├── providers/
│       │   └── auth_provider.dart
│       ├── screens/
│       │   ├── login_screen.dart
│       │   ├── home_screen.dart
│       │   ├── device_binding_screen.dart
│       │   ├── create_os_screen.dart
│       │   ├── os_detail_screen.dart
│       │   └── material_request_screen.dart
│       ├── services/
│       │   ├── supabase_service.dart
│       │   └── storage_service.dart
│       └── widgets/
│           └── loading_view.dart
```

---

## 🔬 NÍVEIS DE ANÁLISE (VOCÊ DEVE ANALISAR CADA UM)

### NÍVEL 1 — ARQUITETURA GERAL (peso 3x)
- Análise da arquitetura como um todo
- Separação de responsabilidades (camadas)
- Padrões de projeto utilizados (Provider, Repository, Service, etc.)
- Acoplamento e coesão entre módulos
- Fluxo de dados (data flow) completo
- Princípios SOLID aplicados (ou violados)
- Clean Architecture / DDD compliance
- Escalabilidade da arquitetura
- Testabilidade da arquitetura

### NÍVEL 2 — CADA ARQUIVO INDIVIDUALMENTE (peso 2x)

#### 2.1 `pubspec.yaml`
- Dependências (versões corretas? obsoletas? inseguras?)
- Configurações do Flutter
- Versionamento semântico

#### 2.2 `main.dart`
- Inicialização do Flutter
- Tratamento de erros no `dotenv.load`
- Tratamento de erros no `Supabase.initialize`
- Ordem de inicialização
- Ponto de entrada da aplicação

#### 2.3 `app.dart`
- Configuração do Provider
- Tema (ThemeData, ColorScheme, Material3)
- Definição de rotas
- Widget RootScreen (lógica de navegação condicional)
- Gerenciamento de estado com ChangeNotifierProvider

#### 2.4 `models/ordem_servico.dart`
- Modelo de dados (OrdemServico)
- Factory `fromMap` (mapeamento do banco)
- Parsing de datas
- Getters (dataSolicitacaoFormatada)
- Validação de campos nulos

#### 2.5 `providers/auth_provider.dart`
- Gerenciamento de estado de autenticação
- Método `loadSavedState`
- Método `bindDevice` (fluxo completo)
- Método `login` (fluxo completo)
- Método `logout`
- Método `_getDeviceId`
- Persistência segura
- Tratamento de erros
- NotifyListeners (quando e como)

#### 2.6 `services/supabase_service.dart`
- Classe `RPCResult`
- Classe `OSStatus` (constantes, labels)
- Método `setSession`
- Método `bindDevice` (RPC)
- Método `loginMecanico` (RPC)
- Método `fetchOrders` (filtros, busca)
- Método `fetchOrder`
- Método `createOrder`
- Método `updateOrderStatus`
- Método `requestMaterial`
- Método `signOut`
- Tratamento de exceções (PostgrestException)
- Consultas com `or`, `ilike`, filtros

#### 2.7 `services/storage_service.dart`
- Wrapper FlutterSecureStorage
- Constantes de chaves
- Métodos `write`, `read`, `delete`
- Método `clearSession`
- Método `clearAll`
- Tratamento de valores nulos

#### 2.8 `screens/device_binding_screen.dart`
- Tela de vínculo de dispositivo
- Validação de entrada
- Chamada ao AuthProvider
- Tratamento de loading
- Exibição de erros
- Experiência do usuário

#### 2.9 `screens/login_screen.dart`
- Tela de login
- Controllers (código, senha)
- Validação de formulário
- Chamada ao AuthProvider
- Loading state
- Exibição de erros
- Segurança (obscureText)

#### 2.10 `screens/home_screen.dart`
- Tela principal (listagem de OS)
- FutureBuilder (loading, erro, dados, vazio)
- Search com debounce (400ms)
- Filtro de status com BottomSheet
- RefreshIndicator (pull-to-refresh)
- Navegação para detalhe/criação
- FAB para criar OS
- Logout
- Cores por status
- Gerenciamento de ciclo de vida (dispose)

#### 2.11 `screens/create_os_screen.dart`
- Formulário de criação de OS
- FormKey e validação
- Dropdowns (tipo, prioridade)
- TextFormFields (tag, equipamento, problema, solicitante)
- Submissão ao SupabaseService
- Loading state
- Tratamento de erros
- Navegação de volta

#### 2.12 `screens/os_detail_screen.dart`
- Tela de detalhes da OS
- Carregamento por ID (arguments)
- Exibição de todos os campos
- Máquina de estados de status (statusActions)
- Transições de status (Aberta → Em Andamento → Aguardando Material → Concluída)
- Botão para solicitar material
- Atualização de status via API
- SnackBar de feedback

#### 2.13 `screens/material_request_screen.dart`
- Tela de solicitação de material
- Vinculação com OS via arguments
- Validação de descrição e quantidade
- Submissão ao SupabaseService
- Feedback com SnackBar
- Navegação de volta

#### 2.14 `widgets/loading_view.dart`
- Widget genérico de loading

### NÍVEL 3 — SEGURANÇA (peso 3x)
- Armazenamento seguro de tokens
- Exposição de chaves de API
- Validação de entrada do usuário
- Proteção contra injeção (SQL, NoSQL)
- Autenticação (fluxo, session management)
- Device binding (segurança do vínculo)
- Refresh token handling
- Dados sensíveis no código
- .env file handling
- FlutterSecureStorage usage correto?

### NÍVEL 4 — PERFORMANCE (peso 2x)
- Rebuilds desnecessários (Provider, setState)
- Debounce na busca (correto?)
- Otimização de listas (ListView vs ListView.builder)
- Memória (controllers, timers, stream subscriptions)
- Network calls (cache? chamadas repetidas?)
- FutureBuilder uso correto?

### NÍVEL 5 — TRATAMENTO DE ERROS (peso 2x)
- Try-catch em operações críticas
- Mensagens de erro para o usuário
- Logging (ausente?)
- Fallbacks (offline mode)
- Estados de erro na UI
- Tratamento de exceções específicas vs genéricas

### NÍVEL 6 — UX/UI (peso 1.5x)
- Feedback visual (loading, erro, sucesso)
- Responsividade
- Acessibilidade
- Navegação (push/pop)
- Consistência visual
- Material 3 utilização
- Empty states
- Error states
- Validação em tempo real

### NÍVEL 7 — CÓDIGO E BOAS PRÁTICAS (peso 1.5x)
- Nomenclatura (padrão Dart/Flutter)
- Comentários e documentação
- Código morto
- Complexidade ciclomática
- Duplicação de código
- Tamanho dos métodos
- Imports organizados
- Formatação

### NÍVEL 8 — TESTES (peso 2x)
- `test/widget_test.dart` (existe? o que testa?)
- Cobertura de testes
- Testes unitários (models, services, providers)
- Testes de widget
- Testes de integração
- Mocking (presente?)

### NÍVEL 9 — DEPENDÊNCIAS E ECOSSISTEMA (peso 1x)
- Versões das dependências (atualizadas?)
- Dependências não utilizadas
- Dependências faltantes
- Compatibilidade (ex: supabase_flutter 1.4.0)
- Flutter 3.12 vs SDK constraints

### NÍVEL 10 — PLATAFORMA (peso 1x)
- Android (configuração, permissões)
- iOS (configuração, permissões)
- Web (suporte, limitações)
- Windows/macOS/Linux (desktop)
- Configurações específicas por plataforma

---

## 📊 FORMATO DE SAÍDA EXIGIDO

Você DEVE produzir um relatório seguindo **EXATAMENTE** este formato para CADA item analisado:

---

### 📁 [ARQUIVO/CATEGORIA]

#### 🔍 [Item específico]

**O que foi analisado:** [descrição precisa]

**Pontos fortes:**
- [ponto forte 1]
- [ponto forte 2]

**Problemas encontrados:**
- 🚨 **[CRÍTICO]** Problema X — [descrição detalhada + impacto + como corrigir]
- ⚠️ **[ALTO]** Problema Y — [descrição detalhada + impacto + como corrigir]
- 🔶 **[MÉDIO]** Problema Z — [descrição detalhada + impacto + como corrigir]
- ℹ️ **[BAIXO]** Problema W — [descrição detalhada + impacto + como corrigir]

**Melhorias sugeridas:**
- [melhoria 1] (prioridade: alta/média/baixa)
- [melhoria 2] (prioridade: alta/média/baixa)

**NOTA: X/10**

---

## ✅ REGRAS ABSOLUTAS

1. **NÃO DEIXE NADA PASSAR** — cada linha, cada variável, cada import, cada espaçamento.
2. **SEJA IMPLACÁVEL** — notas baixas com justificativas sólidas são mais úteis que notas altas genéricas.
3. **CONTEXTO É TUDO** — considere que é um app para técnicos de manutenção em campo (possívelmente offline, dispositivos limitados).
4. **COMPARAÇÃO COM MERCADO** — compare com apps similares (Maintenance Connection, Fiix, UpKeep, etc.).
5. **SEJA ESPECÍFICO** — "linha 42 do arquivo X" é melhor que "em um lugar".
6. **CÓDIGO DEVERIA SER ASSIM** — sempre que apontar um problema, mostre COMO deveria ser.
7. **SEM PIEDADE** — este prompt foi feito para receber críticas construtivas DURAS. Não alivie.

---

## 🏆 ENTREGÁVEL FINAL

Um relatório completo com:

1. **Resumo Executivo** (5 parágrafos no máximo) — visão geral do sistema, nota geral, principais problemas
2. **Nota Geral do Sistema** (0-10)
3. **Ranking das Telas/Componentes** (do melhor ao pior)
4. **Análise Completa Nível 1 a 10** (todo o detalhamento acima)
5. **Top 10 Problemas Mais Críticos** (ordenados por gravidade)
6. **Roadmap de Melhorias** (curto prazo / médio prazo / longo prazo)
7. **Conclusão e Recomendações Finais**

---

⚠️ **AVISO FINAL:** Se você pular QUALQUER arquivo, classe, método, parâmetro, ou der notas sem justificativa detalhada, você falhou na missão. Seja exaustivo. Seja preciso. Seja brutalmente honesto.

**COMEÇE SUA ANÁLISE AGORA.**