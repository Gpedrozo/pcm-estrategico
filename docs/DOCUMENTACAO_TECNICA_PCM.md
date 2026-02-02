# 📋 DOCUMENTAÇÃO TÉCNICA OFICIAL
## PCM ESTRATÉGICO - Sistema de Gestão de Manutenção Industrial

**Versão:** 2.0  
**Data:** Fevereiro 2026  
**Classificação:** Documento Técnico Oficial

---

# PARTE 1 — DOCUMENTAÇÃO TÉCNICA COMPLETA

---

## 1️⃣ VISÃO GERAL DO SISTEMA

### 1.1 Nome do Sistema
**PCM ESTRATÉGICO** - Planejamento e Controle de Manutenção Industrial

### 1.2 Objetivo Principal
Fornecer uma plataforma completa e profissional para gestão de manutenção industrial, permitindo:
- Controle total do ciclo de vida de Ordens de Serviço (OS)
- Gestão hierárquica de ativos industriais
- Planejamento e execução de manutenções preventivas, preditivas e corretivas
- Análise de confiabilidade com metodologias FMEA, RCA e indicadores KPI
- Gestão de materiais, fornecedores e contratos
- Controle de segurança (SSMA) e permissões de trabalho
- Rastreabilidade completa via auditoria

### 1.3 Público-Alvo
| Perfil | Descrição |
|--------|-----------|
| **Gestores de Manutenção** | Supervisores e gerentes de PCM industrial |
| **Técnicos de Manutenção** | Mecânicos, eletricistas, instrumentistas |
| **Planejadores** | Profissionais de planejamento e programação |
| **Analistas de Confiabilidade** | Especialistas em RCM, FMEA, RCA |
| **Segurança do Trabalho** | Técnicos SSMA e gestores de permissões |
| **Administradores** | Gestores de usuários e configurações |

### 1.4 Problemas que Resolve
1. **Falta de rastreabilidade** - Histórico completo de manutenções por equipamento
2. **Ausência de indicadores** - KPIs automatizados (MTBF, MTTR, Disponibilidade)
3. **Gestão descentralizada** - Centralização de OS, materiais, contratos
4. **Análise reativa** - Metodologias proativas (FMEA, RCA, Preditiva)
5. **Descontrole de custos** - Rastreamento por OS, equipamento e período
6. **Riscos de segurança** - Gestão de permissões de trabalho e incidentes

### 1.5 Escopo Atual
O sistema contempla **21 módulos funcionais** organizados em categorias:

| Categoria | Módulos |
|-----------|---------|
| **Principal** | Dashboard |
| **Ordens de Serviço** | Solicitações, Backlog, Emitir OS, Fechar OS, Histórico |
| **Planejamento** | Programação, Preventiva, Preditiva, Inspeções |
| **Análises** | FMEA/RCM, Causa Raiz (RCA), Melhorias |
| **Cadastros** | Hierarquia, Equipamentos, Mecânicos, Materiais, Fornecedores, Contratos, Documentos |
| **Relatórios** | Custos, Relatórios Gerenciais |
| **Segurança** | SSMA (Incidentes + Permissões) |
| **Administração** | Usuários, Auditoria |

---

## 2️⃣ ARQUITETURA DO SISTEMA

### 2.1 Tipo de Arquitetura
**Single Page Application (SPA)** com arquitetura em camadas:

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Pages     │  │ Components  │  │   Hooks     │     │
│  │  (Views)    │  │    (UI)     │  │  (Logic)    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│                 STATE MANAGEMENT                         │
│           TanStack Query + React Context                │
├─────────────────────────────────────────────────────────┤
│                    BACKEND (Supabase)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Auth      │  │  Database   │  │  Functions  │     │
│  │  (RLS)      │  │ (PostgreSQL)│  │   (Edge)    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| **Framework** | React | 18.3.1 |
| **Bundler** | Vite | Latest |
| **Linguagem** | TypeScript | Latest |
| **Estilização** | Tailwind CSS | 3.x |
| **Componentes UI** | shadcn/ui (Radix) | Latest |
| **Roteamento** | React Router DOM | 6.30.1 |
| **Estado Server** | TanStack Query | 5.83.0 |
| **Formulários** | React Hook Form + Zod | 7.61.1 / 3.25 |
| **Gráficos** | Recharts | 2.15.4 |
| **Backend** | Supabase (Lovable Cloud) | 2.90.1 |
| **Autenticação** | Supabase Auth | Integrado |

### 2.3 Organização dos Módulos

```
src/
├── components/           # Componentes reutilizáveis
│   ├── dashboard/       # Widgets do dashboard
│   ├── equipamentos/    # Gestão de componentes
│   ├── layout/          # AppLayout, Sidebar
│   ├── os/              # Status badges, Print templates
│   └── ui/              # shadcn/ui components
├── contexts/            # React Contexts (Auth)
├── hooks/               # Custom hooks (CRUD, lógica)
├── integrations/        # Supabase client + types
├── pages/               # Páginas/Views (21 módulos)
├── types/               # TypeScript definitions
└── lib/                 # Utilitários (cn, utils)
```

### 2.4 Fluxo de Dados

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   User   │────▶│   Page   │────▶│   Hook   │────▶│ Supabase │
│  Action  │     │ Component│     │  (Query) │     │    DB    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
      ▲                                                  │
      │              Cache Invalidation                  │
      └──────────────────────────────────────────────────┘
```

### 2.5 Dependências Internas

| Dependência | Descrição |
|-------------|-----------|
| `useAuth` | Context de autenticação global |
| `useEquipamentos` | Base para seleção de TAGs em todos os módulos |
| `useMecanicos` | Referência para execuções de OS |
| `useMateriais` | Controle de estoque e custos |
| `useAuditoria` | Log de todas as ações críticas |

### 2.6 Pontos de Acoplamento/Desacoplamento

**Acoplamento:**
- Equipamentos ↔ Ordens de Serviço (TAG obrigatória)
- Ordens de Serviço ↔ Execuções (relação 1:N)
- Materiais ↔ Movimentações (atualização automática de estoque via trigger)

**Desacoplamento:**
- Cada módulo tem seu próprio hook CRUD independente
- Componentes UI são genéricos e reutilizáveis
- Design tokens centralizados em `index.css`

---

## 3️⃣ MÓDULOS E FUNCIONALIDADES

### 3.1 Dashboard

**Finalidade:** Centro de comando com visão consolidada de indicadores

**Funcionalidades Principais:**
- Cards de indicadores operacionais (OS Abertas, Em Andamento, Fechadas)
- Gauges de KPIs (MTBF, MTTR, Disponibilidade, Aderência PM)
- Gráfico de evolução de custos (6 meses)
- Distribuição de OS por tipo e status
- Resumo de backlog (quantidade, horas, urgências)
- Lista de OS recentes com quick actions

**Regras de Negócio:**
- MTBF = Tempo total operação / Número de falhas
- MTTR = Tempo total reparos / Número de reparos
- Disponibilidade = MTBF / (MTBF + MTTR) × 100
- Backlog em semanas = Horas acumuladas / 40h

**Validações:**
- Dados calculados em tempo real via `useDashboardData`
- Fallback para valores default quando sem dados

---

### 3.2 Solicitações de Manutenção

**Finalidade:** Portal para requisições da produção/operação

**Funcionalidades:**
- Criação de solicitação com TAG, solicitante, descrição
- Classificação por impacto (Alto/Médio/Baixo)
- Classificação por urgência (Emergencial 2h / Urgente 8h / Programável 72h)
- SLA automático baseado na classificação
- Status: PENDENTE → APROVADA → CONVERTIDA (OS) ou REJEITADA

**Regras de Negócio:**
- SLA calculado automaticamente pela classificação
- Data limite = Data criação + SLA horas
- Conversão para OS cria vínculo na tabela

---

### 3.3 Emitir O.S (NovaOS)

**Finalidade:** Criação de ordens de serviço

**Funcionalidades:**
- Seleção de equipamento por TAG (apenas ativos)
- Tipo: CORRETIVA, PREVENTIVA, PREDITIVA, INSPECAO, MELHORIA
- Prioridade: URGENTE, ALTA, MEDIA, BAIXA
- Tempo e custo estimados (opcionais)
- Impressão imediata pós-criação
- Template de impressão profissional com campos para mecânico

**Regras de Negócio:**
- Número OS gerado automaticamente (sequence)
- Data de solicitação = NOW()
- Usuário de abertura capturado automaticamente
- Status inicial = ABERTA

**Validações:**
- TAG obrigatória
- Tipo obrigatório
- Solicitante obrigatório
- Problema obrigatório

---

### 3.4 Fechar O.S

**Finalidade:** Encerramento de ordens com registro de execução

**Funcionalidades:**
- Seleção de OS pendentes (status ≠ FECHADA)
- Registro de execução (mecânico, horários, serviço executado)
- Adição de materiais utilizados
- Custo automático de mão de obra (hora × custo/hora do mecânico)
- **RCA integrado para corretivas** (Modo de Falha + Causa Raiz Ishikawa 6M)
- Lições aprendidas e ações corretivas

**Regras de Negócio:**
- Tempo execução = Hora Fim - Hora Início
- Custo M.O = (Tempo / 60) × Custo/hora mecânico
- Custo Total = M.O + Materiais + Terceiros
- Materiais deduzidos do estoque automaticamente

**Modos de Falha:**
- DESGASTE, FADIGA, CORROSAO, SOBRECARGA
- DESALINHAMENTO, LUBRIFICACAO_DEFICIENTE
- CONTAMINACAO, ERRO_OPERACIONAL
- FALTA_MANUTENCAO, DEFEITO_FABRICACAO, OUTRO

**Causas Raiz (6M Ishikawa):**
- MAO_OBRA, METODO, MATERIAL
- MAQUINA, MEIO_AMBIENTE, MEDICAO

---

### 3.5 Backlog

**Finalidade:** Gestão visual de OS pendentes

**Funcionalidades:**
- Cards estatísticos (Total, Urgentes, Alta Prioridade, Atrasadas, Horas)
- Filtros por prioridade e busca textual
- Visualização lista/grid
- Agrupamento por semana
- Indicação visual de OS atrasadas (>7 dias abertas)

**Regras de Negócio:**
- Backlog = OS com status ABERTA, EM_ANDAMENTO ou AGUARDANDO_MATERIAL
- Atrasada = Aberta há mais de 7 dias

---

### 3.6 Manutenção Preventiva

**Finalidade:** Gestão de planos de manutenção programada

**Funcionalidades:**
- Cadastro de planos com código, nome, TAG associada
- Frequência em dias ou ciclos
- Tempo estimado de execução
- Checklist de atividades (JSON)
- Materiais previstos (JSON)
- Próxima execução calculada automaticamente

**Regras de Negócio:**
- Próxima execução = Última execução + Frequência dias
- Gatilhos: TEMPO (dias), CICLO (contagem), CONDICAO (sensor)

---

### 3.7 Manutenção Preditiva

**Finalidade:** Monitoramento de condição com limites de alerta

**Funcionalidades:**
- Registro de medições (vibração, temperatura, pressão, etc.)
- Limites de alerta e crítico configuráveis
- Status automático (NORMAL, ALERTA, CRITICO)
- Dashboard de alertas ativos
- Histórico de medições por equipamento

**Tipos de Medição:**
- VIBRACAO (mm/s)
- TEMPERATURA (°C)
- PRESSAO (bar)
- CORRENTE (A)
- ULTRASSOM (dB)
- TERMOGRAFIA
- ANALISE_OLEO

**Regras de Negócio:**
- Se valor ≥ limite_critico → CRITICO
- Se valor ≥ limite_alerta → ALERTA
- Caso contrário → NORMAL

---

### 3.8 FMEA (Análise de Modos e Efeitos de Falha)

**Finalidade:** Análise proativa de riscos de falha

**Funcionalidades:**
- Cadastro por TAG com função do equipamento
- Falha funcional, modo de falha, efeito e causa
- Severidade, Ocorrência, Detecção (1-10)
- Cálculo automático de RPN
- Ações recomendadas com responsável e prazo
- Status de acompanhamento

**Regras de Negócio:**
- RPN = Severidade × Ocorrência × Detecção
- Classificação de risco:
  - RPN ≥ 200 → Crítico
  - RPN ≥ 100 → Alto
  - RPN ≥ 50 → Médio
  - RPN < 50 → Baixo

---

### 3.9 RCA (Análise de Causa Raiz)

**Finalidade:** Investigação estruturada de falhas

**Funcionalidades:**
- Metodologias: 5 Porquês, Ishikawa, Árvore de Falhas
- Vinculação a OS ou equipamento
- Campos estruturados para cada "Por quê?"
- Diagrama Ishikawa (JSON)
- Ações corretivas vinculadas
- Verificação de eficácia

**Status do RCA:**
- EM_ANALISE → AGUARDANDO_ACOES → VERIFICANDO_EFICACIA → CONCLUIDA

---

### 3.10 SSMA (Saúde, Segurança e Meio Ambiente)

**Finalidade:** Gestão de incidentes e permissões de trabalho

**Funcionalidades de Incidentes:**
- Tipos: ACIDENTE, QUASE_ACIDENTE, INCIDENTE_AMBIENTAL, DESVIO
- Severidade: LEVE, MODERADO, GRAVE, FATAL
- Registro de pessoas envolvidas, testemunhas
- Ações imediatas e dias de afastamento
- Vínculo com RCA para investigação

**Funcionalidades de Permissões de Trabalho (PT):**
- Tipos: GERAL, TRABALHO_QUENTE, ESPACO_CONFINADO, TRABALHO_ALTURA, ELETRICA, ESCAVACAO
- Período de validade
- Riscos identificados, medidas de controle, EPIs
- Aprovações (supervisor, segurança)
- Status: PENDENTE → APROVADA → EM_EXECUCAO → CONCLUIDA

---

### 3.11 Hierarquia de Ativos

**Finalidade:** Estrutura organizacional conforme ISO 14224

**Níveis Hierárquicos:**
```
PLANTA → ÁREA → SISTEMA → EQUIPAMENTO → COMPONENTES
```

**Funcionalidades:**
- CRUD completo para cada nível
- Relacionamentos via foreign keys
- Filtros e busca por código/nome
- Status ativo/inativo

---

### 3.12 Equipamentos

**Finalidade:** Cadastro detalhado de ativos

**Funcionalidades Principais:**
- TAG único, nome, criticidade ABC
- Nível de risco (CRITICO, ALTO, MEDIO, BAIXO)
- Vinculação ao sistema (hierarquia)
- Fabricante, modelo, número de série
- Data de instalação

**Funcionalidades de Componentes (Hierarquia Profunda):**
- Árvore recursiva de subcomponentes
- Especificações técnicas (potência, RPM, tensão, corrente)
- Dimensões (JSON flexível)
- Status de manutenção (última, próxima, intervalo)
- Horas de operação e vida útil

---

### 3.13 Materiais

**Finalidade:** Controle de estoque de peças e insumos

**Funcionalidades:**
- Código, nome, unidade, localização
- Estoque atual e mínimo
- Custo unitário
- Alerta de estoque baixo
- Movimentações (ENTRADA, SAIDA, AJUSTE)
- Histórico completo de transações

**Regras de Negócio:**
- Trigger automático atualiza estoque em movimentações
- Saída em OS deduz do estoque via trigger
- Alerta visual quando estoque_atual ≤ estoque_minimo

---

### 3.14 Fornecedores e Contratos

**Funcionalidades de Fornecedores:**
- Código, razão social, nome fantasia, CNPJ
- Tipo (FABRICANTE, DISTRIBUIDOR, PRESTADOR)
- Contatos e especialidade
- Avaliação média (1-5 estrelas)

**Funcionalidades de Contratos:**
- Número, título, descrição
- Fornecedor vinculado
- Valores (total, mensal)
- SLA de atendimento e resolução (horas)
- Período de vigência
- Penalidades

---

### 3.15 Auditoria

**Finalidade:** Rastreabilidade de ações críticas

**Ações Auditadas:**
- LOGIN, LOGOUT
- CRIAR_OS, FECHAR_OS, IMPRIMIR_OS
- GERAR_PDF
- CRIAR_USUARIO, EDITAR_USUARIO
- CRIAR_PLANO_PREVENTIVO, EXECUTAR_PLANO_PREVENTIVO
- CADASTRAR_MATERIAL, AJUSTAR_ESTOQUE

**Campos Registrados:**
- Data/hora
- Usuário (ID e nome)
- Ação
- Descrição detalhada
- TAG afetada (quando aplicável)

---

## 4️⃣ FLUXOS OPERACIONAIS

### 4.1 Fluxo Principal - Ordem de Serviço

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Solicitação │────▶│  Emissão    │────▶│  Execução   │────▶│ Fechamento  │
│  (Produção) │     │   da OS     │     │  (Campo)    │     │  (PCM)      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
   PENDENTE           ABERTA            EM_ANDAMENTO          FECHADA
```

### 4.2 Fluxo de Manutenção Preventiva

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Plano     │────▶│  Geração    │────▶│  Execução   │────▶│ Atualização │
│ Preventivo  │     │   de OS     │     │ do Checklist│     │ Próxima Exec│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 4.3 Fluxo de Análise de Falha (RCA)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Falha     │────▶│  Análise    │────▶│   Ações     │────▶│ Verificação │
│ Identificada│     │  5 Porquês  │     │ Corretivas  │     │  Eficácia   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 4.4 Tratamento de Erros

| Cenário | Tratamento |
|---------|------------|
| Falha de autenticação | Mensagem de erro + permanece na tela de login |
| Erro de API | Toast de erro + log no console |
| Validação de formulário | Mensagens inline com Zod |
| Estoque insuficiente | Alerta visual, mas não bloqueia |
| Sessão expirada | Redirect automático para login |

---

## 5️⃣ MODELO DE DADOS

### 5.1 Diagrama ER Simplificado

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   plantas    │────▶│    areas     │────▶│   sistemas   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  user_roles  │     │   profiles   │     │ equipamentos │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │                    │         ┌──────────┴──────────┐
       ▼                    ▼         ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ ordens_servico│◀───│  auditoria   │     │ componentes  │
└──────────────┘     └──────────────┘     │ _equipamento │
       │                                  └──────────────┘
       ├─────────────────────┐
       ▼                     ▼
┌──────────────┐     ┌──────────────┐
│ execucoes_os │     │ materiais_os │
└──────────────┘     └──────────────┘
```

### 5.2 Tabelas Principais

| Tabela | Descrição | Registros Típicos |
|--------|-----------|-------------------|
| `ordens_servico` | Ordens de serviço | Alto volume |
| `equipamentos` | Ativos industriais | Médio volume |
| `componentes_equipamento` | Subcomponentes hierárquicos | Alto volume |
| `materiais` | Peças e insumos | Médio volume |
| `mecanicos` | Executantes | Baixo volume |
| `planos_preventivos` | Planos de manutenção | Médio volume |
| `fmea` | Análises de risco | Médio volume |
| `analise_causa_raiz` | RCAs | Baixo/Médio |
| `incidentes_ssma` | Incidentes de segurança | Baixo volume |
| `auditoria` | Logs de ação | Alto volume |

### 5.3 Campos Críticos por Tabela

**ordens_servico:**
- `numero_os` (SERIAL, único)
- `tag` (FK para equipamentos.tag)
- `status` (ABERTA, EM_ANDAMENTO, AGUARDANDO_MATERIAL, FECHADA)
- `tipo` (CORRETIVA, PREVENTIVA, PREDITIVA, INSPECAO, MELHORIA)
- `prioridade` (URGENTE, ALTA, MEDIA, BAIXA)
- `modo_falha`, `causa_raiz` (preenchidos no fechamento)

**equipamentos:**
- `tag` (único, identificador primário)
- `criticidade` (A, B, C)
- `nivel_risco` (CRITICO, ALTO, MEDIO, BAIXO)
- `sistema_id` (FK para sistemas)

**componentes_equipamento:**
- `parent_id` (auto-referência para hierarquia)
- `especificacoes` (JSONB flexível)
- `dimensoes` (JSONB flexível)

### 5.4 Relacionamentos Principais

| Origem | Destino | Tipo | Descrição |
|--------|---------|------|-----------|
| plantas → areas | 1:N | Áreas pertencem a plantas |
| areas → sistemas | 1:N | Sistemas pertencem a áreas |
| sistemas → equipamentos | 1:N | Equipamentos pertencem a sistemas |
| equipamentos → componentes | 1:N | Componentes pertencem a equipamentos |
| componentes → componentes | 1:N | Hierarquia recursiva |
| equipamentos → ordens_servico | 1:N | Via campo `tag` |
| ordens_servico → execucoes_os | 1:N | Execuções por OS |
| ordens_servico → materiais_os | 1:N | Materiais por OS |

### 5.5 Regras de Integridade

- **Cascade Delete:** Componentes são excluídos com equipamento
- **Restrict Delete:** Equipamentos com OS não podem ser excluídos
- **Unique Constraints:** `tag` em equipamentos, `codigo` em materiais
- **Check Constraints:** Validações de range (severidade 1-10)
- **Triggers:** Atualização automática de estoque em movimentações

---

## 6️⃣ REGRAS DE NEGÓCIO GERAIS

### 6.1 Regras Globais

| Regra | Descrição |
|-------|-----------|
| RN001 | Toda OS deve ter uma TAG válida associada |
| RN002 | Apenas usuários autenticados podem acessar o sistema |
| RN003 | Apenas ADMIN pode excluir registros críticos |
| RN004 | Todas as ações críticas devem ser auditadas |
| RN005 | Equipamentos inativos não aparecem em seleções |

### 6.2 Cálculos Automáticos

| Cálculo | Fórmula | Trigger |
|---------|---------|---------|
| RPN (FMEA) | S × O × D | Ao salvar |
| Custo M.O | (tempo/60) × custo_hora | Ao fechar OS |
| Custo Total OS | M.O + Materiais + Terceiros | Ao fechar OS |
| Próxima Preventiva | Última + Frequência dias | Ao executar |
| Backlog Semanas | Horas acumuladas / 40 | Em tempo real |

### 6.3 Restrições Operacionais

- OS só pode ser fechada após preenchimento de execução
- Materiais com estoque zero não bloqueiam saída (apenas alerta)
- Planos preventivos inativos não geram OS automáticas
- Usuários USUARIO não podem excluir registros

### 6.4 Automatizações

| Automação | Trigger | Ação |
|-----------|---------|------|
| Número OS | INSERT ordens_servico | Sequence nextval |
| Número RCA | INSERT analise_causa_raiz | Sequence nextval |
| Número PT | INSERT permissoes_trabalho | Sequence nextval |
| Estoque | INSERT materiais_os | Deduz via trigger |
| Auditoria | Login/Logout | Registro automático |

---

## 7️⃣ INTERFACE E EXPERIÊNCIA DO USUÁRIO (UX/UI)

### 7.1 Padrão Visual

**Design System:** Industrial, funcional, cores neutras

**Paleta de Cores:**
| Token | Valor HSL | Uso |
|-------|-----------|-----|
| `--primary` | 213 56% 24% | Ações principais |
| `--destructive` | 0 72% 51% | Erros, exclusões |
| `--success` | 142 72% 29% | Confirmações |
| `--warning` | 38 92% 50% | Alertas |
| `--info` | 199 89% 48% | Informações |

**Tipografia:**
- **Body:** Inter (sans-serif)
- **Código/Números:** JetBrains Mono (monospace)

### 7.2 Navegação

- **Sidebar fixa** com agrupamento por categoria
- **Breadcrumb** via header com data atual
- **Quick Actions** no dashboard para acesso rápido
- **Mobile-first** com sidebar colapsável

### 7.3 Comportamento de Formulários

- Validação em tempo real com Zod
- Mensagens de erro inline
- Campos obrigatórios marcados com asterisco
- Loading states em botões durante submissão
- Toast notifications para feedback

### 7.4 Consistência Visual

- Tabelas com classe `.table-industrial`
- Cards com classe `.card-industrial`
- Badges de status padronizados
- Ícones Lucide React em toda aplicação
- Skeleton loaders durante carregamento

---

## 8️⃣ SEGURANÇA E CONTROLE DE ACESSO

### 8.1 Tipos de Usuários

| Role | Descrição |
|------|-----------|
| `ADMIN` | Acesso total, pode excluir registros |
| `USUARIO` | Acesso operacional, não exclui |

### 8.2 Níveis de Permissão

| Recurso | ADMIN | USUARIO |
|---------|-------|---------|
| Visualizar dados | ✅ | ✅ |
| Criar registros | ✅ | ✅ |
| Editar registros | ✅ | ✅ |
| Excluir registros | ✅ | ❌ |
| Gerenciar usuários | ✅ | ❌ |
| Visualizar auditoria | ✅ | ✅ |

### 8.3 Proteções Implementadas

| Proteção | Implementação |
|----------|---------------|
| **Autenticação** | Supabase Auth com JWT |
| **Autorização** | Row Level Security (RLS) |
| **Rate Limiting** | Função `check_rate_limit` |
| **Roles Segregadas** | Tabela `user_roles` separada |
| **Auditoria** | Log de todas ações críticas |
| **Validação Input** | Zod schemas no frontend |
| **Security Logs** | Tabela `security_logs` |

### 8.4 Row Level Security (RLS)

Todas as tabelas têm RLS habilitado com políticas:
- SELECT: Usuários autenticados podem ver
- INSERT: Usuários autenticados podem criar
- UPDATE: Usuários autenticados podem atualizar
- DELETE: Apenas ADMIN pode excluir (via `has_role`)

---

## 9️⃣ INTEGRAÇÕES

### 9.1 Integrações Internas

| Integração | Descrição |
|------------|-----------|
| Auth → Profiles | Criação automática de profile no signup |
| OS → Materiais | Dedução de estoque via trigger |
| OS → Auditoria | Log automático de criação/fechamento |
| Componentes → Equipamentos | Hierarquia via `parent_id` |

### 9.2 Integrações Externas

| Integração | Status | Descrição |
|------------|--------|-----------|
| Supabase Auth | ✅ Ativo | Autenticação via email/senha |
| Supabase Database | ✅ Ativo | PostgreSQL gerenciado |
| React-to-Print | ✅ Ativo | Impressão de OS |
| Recharts | ✅ Ativo | Gráficos do dashboard |

### 9.3 Fluxo de Dados Externos

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │◀───▶│ Supabase │◀───▶│ PostgreSQL│
│  (React) │ JWT │   API    │     │    DB     │
└──────────┘     └──────────┘     └──────────┘
```

---

## 🔟 MANUTENÇÃO E EVOLUÇÃO

### 10.1 Pontos Críticos

| Ponto | Descrição | Mitigação |
|-------|-----------|-----------|
| `types/index.ts` | 318 linhas, monolítico | Refatorar em arquivos separados |
| `AppSidebar.tsx` | 250 linhas | Extrair grupos de menu |
| Queries sem paginação | Performance em alto volume | Implementar paginação |
| Sem testes automatizados | Cobertura zero | Implementar Vitest |

### 10.2 Limitações Atuais

1. **Sem paginação** - Todas as queries trazem todos os registros
2. **Sem relatórios PDF** - Apenas impressão via browser
3. **Sem notificações push** - Usuário precisa verificar manualmente
4. **Sem integração ERP** - Dados manuais de custos
5. **Sem aplicativo mobile** - Apenas PWA básico
6. **Sem upload de arquivos** - Storage não configurado

### 10.3 Gargalos Técnicos

| Gargalo | Impacto | Prioridade |
|---------|---------|------------|
| Queries N+1 em componentes | Performance | Alta |
| Tipos duplicados (TypeScript vs Supabase) | Manutenibilidade | Média |
| CSS inline em alguns componentes | Consistência | Baixa |

### 10.4 Pontos Frágeis

1. Dependência de `tag` como string (não UUID)
2. Campos JSON sem validação de schema
3. Ausência de soft delete em algumas tabelas
4. Falta de índices otimizados para buscas frequentes

---

## 1️⃣1️⃣ CONSIDERAÇÕES TÉCNICAS

### 11.1 Padrões Utilizados

| Padrão | Aplicação |
|--------|-----------|
| **Custom Hooks** | Abstração de lógica CRUD |
| **Compound Components** | shadcn/ui components |
| **Render Props** | Alguns componentes de UI |
| **Context API** | Autenticação global |
| **Server State** | TanStack Query para cache |

### 11.2 Decisões Técnicas Relevantes

| Decisão | Justificativa |
|---------|---------------|
| Supabase over Firebase | Melhor suporte SQL e RLS |
| TanStack Query | Cache inteligente e revalidação |
| shadcn/ui | Componentes acessíveis e customizáveis |
| Tailwind CSS | Produtividade e consistência |
| TypeScript | Type safety e DX |

### 11.3 Observações para Desenvolvedores

1. **Nunca editar** `src/integrations/supabase/types.ts` (auto-gerado)
2. **Sempre usar** hooks customizados para CRUD
3. **Seguir** design tokens de `index.css`
4. **Usar** `useAuth()` para verificar permissões
5. **Logar** ações críticas via `useLogAuditoria()`
6. **Validar** inputs com Zod antes de enviar

---

# PARTE 2 — ANÁLISE CRÍTICA E PROPOSTAS DE APRIMORAMENTO

---

## 1️⃣ ANÁLISE TÉCNICA GERAL

### 1.1 Avaliação da Arquitetura

| Critério | Nota (1-10) | Observação |
|----------|-------------|------------|
| Separação de responsabilidades | 8 | Hooks bem isolados |
| Escalabilidade horizontal | 6 | Backend Supabase escala, frontend não |
| Testabilidade | 4 | Sem testes implementados |
| Manutenibilidade | 7 | Código limpo, mas arquivos grandes |
| Segurança | 8 | RLS bem implementado |

### 1.2 Avaliação de Módulos

| Módulo | Completude | Qualidade | Prioridade Melhoria |
|--------|------------|-----------|---------------------|
| Dashboard | 90% | Alta | Baixa |
| Ordens de Serviço | 85% | Alta | Média |
| Equipamentos | 80% | Alta | Média |
| Preventiva | 60% | Média | Alta |
| Preditiva | 70% | Média | Média |
| FMEA | 75% | Alta | Baixa |
| RCA | 70% | Alta | Baixa |
| SSMA | 80% | Alta | Baixa |
| Materiais | 85% | Alta | Baixa |
| Relatórios | 30% | Baixa | Alta |

### 1.3 Avaliação de Escalabilidade

**Pontos Fortes:**
- Backend Supabase escala automaticamente
- Queries com React Query têm cache eficiente
- RLS permite segmentação de dados

**Pontos Fracos:**
- Ausência de paginação limita performance
- Falta de índices específicos para queries pesadas
- Componentes grandes podem causar re-renders

### 1.4 Avaliação de Manutenibilidade

**Pontos Fortes:**
- TypeScript com tipos bem definidos
- Hooks customizados bem documentados
- Design system centralizado

**Pontos Fracos:**
- `types/index.ts` monolítico
- Alguns componentes de página muito grandes (>500 linhas)
- Falta de comentários em lógica complexa

---

## 2️⃣ IDENTIFICAÇÃO DE PROBLEMAS E LIMITAÇÕES

### 2.1 Problemas Técnicos

| ID | Problema | Severidade | Área |
|----|----------|------------|------|
| P01 | Ausência de paginação em listagens | Alta | Performance |
| P02 | Arquivo types.ts monolítico | Média | Manutenibilidade |
| P03 | Sem testes automatizados | Alta | Qualidade |
| P04 | Queries sem otimização (select *) | Média | Performance |
| P05 | Falta de índices no banco | Média | Performance |

### 2.2 Riscos Técnicos

| ID | Risco | Probabilidade | Impacto |
|----|-------|---------------|---------|
| R01 | Performance degradada com >10k OS | Alta | Alto |
| R02 | Perda de dados sem soft delete | Média | Alto |
| R03 | Inconsistência de tipos TS/DB | Média | Médio |
| R04 | Falhas silenciosas em mutations | Baixa | Alto |

### 2.3 Falhas de Usabilidade

| ID | Falha | Impacto |
|----|-------|---------|
| U01 | Sem busca global | Navegação lenta |
| U02 | Sem atalhos de teclado | Produtividade |
| U03 | Filtros não persistem | UX inconsistente |
| U04 | Sem feedback de progresso em operações longas | Confusão |

### 2.4 Gargalos de Performance

| Gargalo | Causa | Solução |
|---------|-------|---------|
| Listagem de OS lenta | Sem paginação | Implementar infinite scroll |
| Dashboard inicial lento | Múltiplas queries | Agregar no backend |
| Seleção de equipamentos | Carrega todos | Implementar search async |

### 2.5 Riscos Futuros

1. **Escalabilidade:** Sistema pode travar com >50k registros
2. **Segurança:** Falta de 2FA para admin
3. **Compliance:** Sem exportação de dados (LGPD)
4. **Integração:** Isolamento dificulta integração com ERPs

---

## 3️⃣ PROPOSTAS DE APRIMORAMENTO

### P01 - Implementar Paginação

**Problema:** Queries carregam todos os registros, causando lentidão

**Impacto:** Performance degradada em ambientes com alto volume de dados

**Solução:**
```typescript
// Implementar hook com paginação
export function useOrdensServicoPaginated(page: number, pageSize: number = 20) {
  return useQuery({
    queryKey: ['ordens_servico', page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, count } = await supabase
        .from('ordens_servico')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('data_solicitacao', { ascending: false });
      return { data, count, page, pageSize };
    },
  });
}
```

**Benefícios:**
- Carregamento inicial 10x mais rápido
- Menos consumo de memória
- Melhor UX com infinite scroll

---

### P02 - Refatorar Tipos TypeScript

**Problema:** `types/index.ts` com 318 linhas dificulta manutenção

**Solução:**
```
src/types/
├── index.ts          # Re-exports
├── user.types.ts     # User, UserRole
├── os.types.ts       # OrdemServico, Execucao
├── asset.types.ts    # Equipamento, Componente
├── material.types.ts # Material, Movimentacao
├── analytics.types.ts # Indicadores, KPIs
└── safety.types.ts   # Incidente, PT
```

**Benefícios:**
- Melhor organização
- Imports mais específicos
- Facilita code splitting

---

### P03 - Implementar Testes Automatizados

**Problema:** Zero cobertura de testes

**Solução:**
```typescript
// src/hooks/__tests__/useEquipamentos.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useEquipamentos } from '../useEquipamentos';

describe('useEquipamentos', () => {
  it('should fetch equipamentos', async () => {
    const { result } = renderHook(() => useEquipamentos());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

**Benefícios:**
- Prevenção de regressões
- Documentação viva
- Refatoração segura

---

### P04 - Implementar Busca Global

**Problema:** Usuário precisa navegar para buscar

**Solução:** Command Palette (Cmd+K)

```typescript
// src/components/CommandPalette.tsx
import { CommandDialog, CommandInput, CommandList } from 'cmdk';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar OS, equipamentos, materiais..." />
      <CommandList>
        {/* Resultados de busca */}
      </CommandList>
    </CommandDialog>
  );
}
```

**Benefícios:**
- Acesso rápido a qualquer recurso
- Produtividade aumentada
- UX moderna

---

### P05 - Geração Automática de Preventivas

**Problema:** Planos preventivos não geram OS automaticamente

**Solução:** Edge Function + Cron Job

```typescript
// supabase/functions/generate-preventivas/index.ts
Deno.serve(async () => {
  const { data: planos } = await supabase
    .from('planos_preventivos')
    .select('*')
    .eq('ativo', true)
    .lte('proxima_execucao', new Date().toISOString());
  
  for (const plano of planos) {
    await supabase.from('ordens_servico').insert({
      tag: plano.tag,
      tipo: 'PREVENTIVA',
      problema: `Execução do plano ${plano.codigo}`,
      // ...
    });
    
    await supabase.from('planos_preventivos').update({
      proxima_execucao: addDays(new Date(), plano.frequencia_dias)
    }).eq('id', plano.id);
  }
});
```

**Benefícios:**
- Automação real de preventivas
- Redução de esquecimentos
- Aderência ao programa de manutenção

---

### P06 - Relatórios PDF Avançados

**Problema:** Sem relatórios gerenciais exportáveis

**Solução:** Integração com biblioteca de PDF

```typescript
// Usar @react-pdf/renderer ou jspdf
import { Document, Page, Text, View, PDFDownloadLink } from '@react-pdf/renderer';

const RelatorioMensal = ({ dados }) => (
  <Document>
    <Page size="A4">
      <View>
        <Text>Relatório Mensal de Manutenção</Text>
        {/* Gráficos, tabelas, KPIs */}
      </View>
    </Page>
  </Document>
);
```

**Benefícios:**
- Relatórios para gestão
- Histórico documentado
- Compliance e auditorias

---

### P07 - Notificações em Tempo Real

**Problema:** Usuários não são alertados sobre eventos críticos

**Solução:** Supabase Realtime + Toast/Push

```typescript
useEffect(() => {
  const channel = supabase
    .channel('os-alerts')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'ordens_servico', filter: 'prioridade=eq.URGENTE' },
      (payload) => {
        toast.error(`Nova OS Urgente: ${payload.new.numero_os}`);
      }
    )
    .subscribe();
  
  return () => supabase.removeChannel(channel);
}, []);
```

**Benefícios:**
- Resposta rápida a urgências
- Melhor comunicação
- Menos verificações manuais

---

### P08 - Dashboard de Confiabilidade

**Problema:** Falta análise de confiabilidade por equipamento

**Solução:** Novo dashboard com curvas de tendência

**Métricas Adicionais:**
- Curva da banheira por equipamento
- Pareto de falhas por TAG
- Tendência de MTBF/MTTR por período
- Custo por hora operada

---

### P09 - Integração com Calendário

**Problema:** Programação difícil de visualizar

**Solução:** Componente de calendário integrado

```typescript
// Usar react-big-calendar ou fullcalendar
const eventos = ordensServico.map(os => ({
  id: os.id,
  title: `OS ${os.numero_os} - ${os.tag}`,
  start: new Date(os.data_solicitacao),
  end: new Date(os.data_solicitacao),
  color: getColorByPriority(os.prioridade),
}));
```

---

### P10 - QR Code em Equipamentos

**Problema:** Identificação manual de equipamentos em campo

**Solução:** Geração de QR Code vinculado à TAG

```typescript
import QRCode from 'qrcode.react';

const EquipamentoQR = ({ tag }) => (
  <QRCode 
    value={`${window.location.origin}/equipamentos?tag=${tag}`}
    size={128}
  />
);
```

**Benefícios:**
- Acesso rápido em campo via mobile
- Redução de erros de digitação
- Modernização do processo

---

## 4️⃣ MELHORIAS ESTRUTURAIS SUGERIDAS

### 4.1 Melhorias na Arquitetura

| Melhoria | Descrição | Esforço |
|----------|-----------|---------|
| Micro-frontends | Separar módulos em pacotes | Alto |
| GraphQL | Substituir REST por GraphQL | Alto |
| Service Workers | Cache offline | Médio |
| Web Workers | Processamento pesado | Médio |

### 4.2 Melhorias na Organização

| Melhoria | Descrição | Esforço |
|----------|-----------|---------|
| Monorepo | Nx ou Turborepo | Alto |
| Design System | Storybook documentado | Médio |
| Feature Flags | Rollout gradual | Médio |
| Error Boundary | Tratamento de erros React | Baixo |

### 4.3 Novas Funcionalidades Sugeridas

| Funcionalidade | Prioridade | Esforço |
|----------------|------------|---------|
| App Mobile (React Native) | Alta | Alto |
| Integração SAP/TOTVS | Alta | Alto |
| Assinatura Digital | Média | Médio |
| OCR para Notas Fiscais | Média | Médio |
| Chatbot de Suporte | Baixa | Médio |
| Gamificação (pontos) | Baixa | Baixo |

### 4.4 Automatizações Recomendadas

| Automação | Trigger | Benefício |
|-----------|---------|-----------|
| Alerta estoque baixo | estoque ≤ mínimo | Reposição proativa |
| Escalação de urgentes | OS urgente >2h | Gestão de SLA |
| Relatório semanal | Domingo 20h | Visibilidade |
| Backup dados | Diário 02h | Segurança |

---

## 5️⃣ EVOLUÇÃO DO SISTEMA

### 5.1 Curto Prazo (1-3 meses)

| Item | Descrição | Prioridade |
|------|-----------|------------|
| Paginação | Implementar em todas as listagens | P1 |
| Testes unitários | Cobertura mínima 60% | P1 |
| Geração automática PM | Cron para preventivas | P1 |
| Busca global | Command palette | P2 |
| Relatórios básicos | PDF mensal | P2 |

### 5.2 Médio Prazo (3-6 meses)

| Item | Descrição | Prioridade |
|------|-----------|------------|
| App Mobile | React Native básico | P1 |
| Notificações push | Firebase/OneSignal | P1 |
| Dashboard confiabilidade | Curvas e Pareto | P2 |
| Integração calendário | Visualização programação | P2 |
| QR Code | Etiquetas para equipamentos | P3 |

### 5.3 Longo Prazo (6-12 meses)

| Item | Descrição | Prioridade |
|------|-----------|------------|
| Integração ERP | SAP/TOTVS/Protheus | P1 |
| Machine Learning | Predição de falhas | P2 |
| IoT Sensors | Coleta automática preditiva | P2 |
| BI Embarcado | Dashboards customizáveis | P3 |
| Multi-tenancy | Múltiplas empresas | P3 |

### 5.4 Possibilidades de Escalabilidade

| Cenário | Solução |
|---------|---------|
| >100k OS | Particionamento de tabelas |
| >1000 usuários simultâneos | CDN + Edge Functions |
| Multi-site | Replicação por região |
| Offline-first | PWA com IndexedDB |

---

## CONCLUSÃO

O **PCM ESTRATÉGICO** é um sistema robusto e bem estruturado para gestão de manutenção industrial, com cobertura abrangente das principais necessidades operacionais. A arquitetura baseada em React + Supabase oferece boa escalabilidade e segurança.

**Pontos Fortes:**
- Cobertura funcional completa (21 módulos)
- Design system consistente
- Segurança com RLS bem implementado
- Código TypeScript tipado

**Áreas de Melhoria Prioritárias:**
1. Performance (paginação)
2. Qualidade (testes automatizados)
3. Automação (geração de preventivas)
4. Relatórios (exportação PDF)
5. Mobilidade (app nativo)

Este documento deve ser atualizado a cada release significativo para refletir o estado atual do sistema.

---

*Documento gerado em: Fevereiro 2026*  
*Versão do Sistema: 2.0*  
*Classificação: Documento Técnico Interno*
