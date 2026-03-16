# ðŸ“‹ DOCUMENTAÃ‡ÃƒO TÃ‰CNICA OFICIAL

## PCM ESTRATÃ‰GICO - Sistema de GestÃ£o de ManutenÃ§Ã£o Industrial

**VersÃ£o:** 2.0  
**Data:** Fevereiro 2026  
**ClassificaÃ§Ã£o:** Documento TÃ©cnico Oficial

---

# PARTE 1 â€” DOCUMENTAÃ‡ÃƒO TÃ‰CNICA COMPLETA

---

## 1ï¸âƒ£ VISÃƒO GERAL DO SISTEMA

### 1.1 Nome do Sistema

**PCM ESTRATÃ‰GICO** - Planejamento e Controle de ManutenÃ§Ã£o Industrial

### 1.2 Objetivo Principal

Fornecer uma plataforma completa e profissional para gestÃ£o de manutenÃ§Ã£o industrial, permitindo:

- Controle total do ciclo de vida de Ordens de ServiÃ§o (OS)

- GestÃ£o hierÃ¡rquica de ativos industriais

- Planejamento e execuÃ§Ã£o de manutenÃ§Ãµes preventivas, preditivas e corretivas

- AnÃ¡lise de confiabilidade com metodologias FMEA, RCA e indicadores KPI

- GestÃ£o de materiais, fornecedores e contratos

- Controle de seguranÃ§a (SSMA) e permissÃµes de trabalho

- Rastreabilidade completa via auditoria

### 1.3 PÃºblico-Alvo

| Perfil | DescriÃ§Ã£o |
|--------|-----------|
| **Gestores de ManutenÃ§Ã£o** | Supervisores e gerentes de PCM industrial |
| **TÃ©cnicos de ManutenÃ§Ã£o** | MecÃ¢nicos, eletricistas, instrumentistas |
| **Planejadores** | Profissionais de planejamento e programaÃ§Ã£o |
| **Analistas de Confiabilidade** | Especialistas em RCM, FMEA, RCA |
| **SeguranÃ§a do Trabalho** | TÃ©cnicos SSMA e gestores de permissÃµes |
| **Administradores** | Gestores de usuÃ¡rios e configuraÃ§Ãµes |

### 1.4 Problemas que Resolve

1. **Falta de rastreabilidade** - HistÃ³rico completo de manutenÃ§Ãµes por equipamento

1. **AusÃªncia de indicadores** - KPIs automatizados (MTBF, MTTR, Disponibilidade)

1. **GestÃ£o descentralizada** - CentralizaÃ§Ã£o de OS, materiais, contratos

1. **AnÃ¡lise reativa** - Metodologias proativas (FMEA, RCA, Preditiva)

1. **Descontrole de custos** - Rastreamento por OS, equipamento e perÃ­odo

1. **Riscos de seguranÃ§a** - GestÃ£o de permissÃµes de trabalho e incidentes

### 1.5 Escopo Atual

O sistema contempla **21 mÃ³dulos funcionais** organizados em categorias:

| Categoria | MÃ³dulos |
|-----------|---------|
| **Principal** | Dashboard |
| **Ordens de ServiÃ§o** | SolicitaÃ§Ãµes, Backlog, Emitir OS, Fechar OS, HistÃ³rico |
| **Planejamento** | ProgramaÃ§Ã£o, Preventiva, Preditiva, InspeÃ§Ãµes |
| **AnÃ¡lises** | FMEA/RCM, Causa Raiz (RCA), Melhorias |
| **Cadastros** | Hierarquia, Equipamentos, MecÃ¢nicos, Materiais, Fornecedores, Contratos, Documentos |
| **RelatÃ³rios** | Custos, RelatÃ³rios Gerenciais |
| **SeguranÃ§a** | SSMA (Incidentes + PermissÃµes) |
| **AdministraÃ§Ã£o** | UsuÃ¡rios, Auditoria |

---

## 2ï¸âƒ£ ARQUITETURA DO SISTEMA

### 2.1 Tipo de Arquitetura

**Single Page Application (SPA)** com arquitetura em camadas:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    FRONTEND (React)                      â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”‚
â”‚  â”‚   Pages     â”‚  â”‚ Components  â”‚  â”‚   Hooks     â”‚     â”‚
â”‚  â”‚  (Views)    â”‚  â”‚    (UI)     â”‚  â”‚  (Logic)    â”‚     â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                 STATE MANAGEMENT                         â”‚
â”‚           TanStack Query + React Context                â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                    BACKEND (Supabase)                   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”‚
â”‚  â”‚   Auth      â”‚  â”‚  Database   â”‚  â”‚  Functions  â”‚     â”‚
â”‚  â”‚  (RLS)      â”‚  â”‚ (PostgreSQL)â”‚  â”‚   (Edge)    â”‚     â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 2.2 Stack TecnolÃ³gico

| Camada | Tecnologia | VersÃ£o |
|--------|------------|--------|
| **Framework** | React | 18.3.1 |
| **Bundler** | Vite | Latest |
| **Linguagem** | TypeScript | Latest |
| **EstilizaÃ§Ã£o** | Tailwind CSS | 3.x |
| **Componentes UI** | shadcn/ui (Radix) | Latest |
| **Roteamento** | React Router DOM | 6.30.1 |
| **Estado Server** | TanStack Query | 5.83.0 |
| **FormulÃ¡rios** | React Hook Form + Zod | 7.61.1 / 3.25 |
| **GrÃ¡ficos** | Recharts | 2.15.4 |
| **Backend** | Supabase Cloud | 2.90.1 |
| **AutenticaÃ§Ã£o** | Supabase Auth | Integrado |

### 2.3 OrganizaÃ§Ã£o dos MÃ³dulos

```
src/
â”œâ”€â”€ components/           # Componentes reutilizÃ¡veis
â”‚   â”œâ”€â”€ dashboard/       # Widgets do dashboard
â”‚   â”œâ”€â”€ equipamentos/    # GestÃ£o de componentes
â”‚   â”œâ”€â”€ layout/          # AppLayout, Sidebar
â”‚   â”œâ”€â”€ os/              # Status badges, Print templates
â”‚   â””â”€â”€ ui/              # shadcn/ui components
â”œâ”€â”€ contexts/            # React Contexts (Auth)
â”œâ”€â”€ hooks/               # Custom hooks (CRUD, lÃ³gica)
â”œâ”€â”€ integrations/        # Supabase client + types
â”œâ”€â”€ pages/               # PÃ¡ginas/Views (21 mÃ³dulos)
â”œâ”€â”€ types/               # TypeScript definitions
â””â”€â”€ lib/                 # UtilitÃ¡rios (cn, utils)
```

### 2.4 Fluxo de Dados

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   User   â”‚â”€â”€â”€â”€â–¶â”‚   Page   â”‚â”€â”€â”€â”€â–¶â”‚   Hook   â”‚â”€â”€â”€â”€â–¶â”‚ Supabase â”‚
â”‚  Action  â”‚     â”‚ Componentâ”‚     â”‚  (Query) â”‚     â”‚    DB    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
      â–²                                                  â”‚
      â”‚              Cache Invalidation                  â”‚
      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 2.5 DependÃªncias Internas

| DependÃªncia | DescriÃ§Ã£o |
|-------------|-----------|
| `useAuth` | Context de autenticaÃ§Ã£o global |
| `useEquipamentos` | Base para seleÃ§Ã£o de TAGs em todos os mÃ³dulos |
| `useMecanicos` | ReferÃªncia para execuÃ§Ãµes de OS |
| `useMateriais` | Controle de estoque e custos |
| `useAuditoria` | Log de todas as aÃ§Ãµes crÃ­ticas |

### 2.6 Pontos de Acoplamento/Desacoplamento

**Acoplamento:**

- Equipamentos â†” Ordens de ServiÃ§o (TAG obrigatÃ³ria)

- Ordens de ServiÃ§o â†” ExecuÃ§Ãµes (relaÃ§Ã£o 1:N)

- Materiais â†” MovimentaÃ§Ãµes (atualizaÃ§Ã£o automÃ¡tica de estoque via trigger)

**Desacoplamento:**

- Cada mÃ³dulo tem seu prÃ³prio hook CRUD independente

- Componentes UI sÃ£o genÃ©ricos e reutilizÃ¡veis

- Design tokens centralizados em `index.css`

---

## 3ï¸âƒ£ MÃ“DULOS E FUNCIONALIDADES

### 3.1 Dashboard

**Finalidade:** Centro de comando com visÃ£o consolidada de indicadores

**Funcionalidades Principais:**

- Cards de indicadores operacionais (OS Abertas, Em Andamento, Fechadas)

- Gauges de KPIs (MTBF, MTTR, Disponibilidade, AderÃªncia PM)

- GrÃ¡fico de evoluÃ§Ã£o de custos (6 meses)

- DistribuiÃ§Ã£o de OS por tipo e status

- Resumo de backlog (quantidade, horas, urgÃªncias)

- Lista de OS recentes com quick actions

**Regras de NegÃ³cio:**

- MTBF = Tempo total operaÃ§Ã£o / NÃºmero de falhas

- MTTR = Tempo total reparos / NÃºmero de reparos

- Disponibilidade = MTBF / (MTBF + MTTR) Ã— 100

- Backlog em semanas = Horas acumuladas / 40h

**ValidaÃ§Ãµes:**

- Dados calculados em tempo real via `useDashboardData`

- Fallback para valores default quando sem dados

---

### 3.2 SolicitaÃ§Ãµes de ManutenÃ§Ã£o

**Finalidade:** Portal para requisiÃ§Ãµes da produÃ§Ã£o/operaÃ§Ã£o

**Funcionalidades:**

- CriaÃ§Ã£o de solicitaÃ§Ã£o com TAG, solicitante, descriÃ§Ã£o

- ClassificaÃ§Ã£o por impacto (Alto/MÃ©dio/Baixo)

- ClassificaÃ§Ã£o por urgÃªncia (Emergencial 2h / Urgente 8h / ProgramÃ¡vel 72h)

- SLA automÃ¡tico baseado na classificaÃ§Ã£o

- Status: PENDENTE â†’ APROVADA â†’ CONVERTIDA (OS) ou REJEITADA

**Regras de NegÃ³cio:**

- SLA calculado automaticamente pela classificaÃ§Ã£o

- Data limite = Data criaÃ§Ã£o + SLA horas

- ConversÃ£o para OS cria vÃ­nculo na tabela

---

### 3.3 Emitir O.S (NovaOS)

**Finalidade:** CriaÃ§Ã£o de ordens de serviÃ§o

**Funcionalidades:**

- SeleÃ§Ã£o de equipamento por TAG (apenas ativos)

- Tipo: CORRETIVA, PREVENTIVA, PREDITIVA, INSPECAO, MELHORIA

- Prioridade: URGENTE, ALTA, MEDIA, BAIXA

- Tempo e custo estimados (opcionais)

- ImpressÃ£o imediata pÃ³s-criaÃ§Ã£o

- Template de impressÃ£o profissional com campos para mecÃ¢nico

**Regras de NegÃ³cio:**

- NÃºmero OS gerado automaticamente (sequence)

- Data de solicitaÃ§Ã£o = NOW()

- UsuÃ¡rio de abertura capturado automaticamente

- Status inicial = ABERTA

**ValidaÃ§Ãµes:**

- TAG obrigatÃ³ria

- Tipo obrigatÃ³rio

- Solicitante obrigatÃ³rio

- Problema obrigatÃ³rio

---

### 3.4 Fechar O.S

**Finalidade:** Encerramento de ordens com registro de execuÃ§Ã£o

**Funcionalidades:**

- SeleÃ§Ã£o de OS pendentes (status â‰  FECHADA)

- Registro de execuÃ§Ã£o (mecÃ¢nico, horÃ¡rios, serviÃ§o executado)

- AdiÃ§Ã£o de materiais utilizados

- Custo automÃ¡tico de mÃ£o de obra (hora Ã— custo/hora do mecÃ¢nico)

- **RCA integrado para corretivas** (Modo de Falha + Causa Raiz Ishikawa 6M)

- LiÃ§Ãµes aprendidas e aÃ§Ãµes corretivas

**Regras de NegÃ³cio:**

- Tempo execuÃ§Ã£o = Hora Fim - Hora InÃ­cio

- Custo M.O = (Tempo / 60) Ã— Custo/hora mecÃ¢nico

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

**Finalidade:** GestÃ£o visual de OS pendentes

**Funcionalidades:**

- Cards estatÃ­sticos (Total, Urgentes, Alta Prioridade, Atrasadas, Horas)

- Filtros por prioridade e busca textual

- VisualizaÃ§Ã£o lista/grid

- Agrupamento por semana

- IndicaÃ§Ã£o visual de OS atrasadas (>7 dias abertas)

**Regras de NegÃ³cio:**

- Backlog = OS com status ABERTA, EM_ANDAMENTO ou AGUARDANDO_MATERIAL

- Atrasada = Aberta hÃ¡ mais de 7 dias

---

### 3.6 ManutenÃ§Ã£o Preventiva

**Finalidade:** GestÃ£o de planos de manutenÃ§Ã£o programada

**Funcionalidades:**

- Cadastro de planos com cÃ³digo, nome, TAG associada

- FrequÃªncia em dias ou ciclos

- Tempo estimado de execuÃ§Ã£o

- Checklist de atividades (JSON)

- Materiais previstos (JSON)

- PrÃ³xima execuÃ§Ã£o calculada automaticamente

**Regras de NegÃ³cio:**

- PrÃ³xima execuÃ§Ã£o = Ãšltima execuÃ§Ã£o + FrequÃªncia dias

- Gatilhos: TEMPO (dias), CICLO (contagem), CONDICAO (sensor)

---

### 3.7 ManutenÃ§Ã£o Preditiva

**Finalidade:** Monitoramento de condiÃ§Ã£o com limites de alerta

**Funcionalidades:**

- Registro de mediÃ§Ãµes (vibraÃ§Ã£o, temperatura, pressÃ£o, etc.)

- Limites de alerta e crÃ­tico configurÃ¡veis

- Status automÃ¡tico (NORMAL, ALERTA, CRITICO)

- Dashboard de alertas ativos

- HistÃ³rico de mediÃ§Ãµes por equipamento

**Tipos de MediÃ§Ã£o:**

- VIBRACAO (mm/s)

- TEMPERATURA (Â°C)

- PRESSAO (bar)

- CORRENTE (A)

- ULTRASSOM (dB)

- TERMOGRAFIA

- ANALISE_OLEO

**Regras de NegÃ³cio:**

- Se valor â‰¥ limite_critico â†’ CRITICO

- Se valor â‰¥ limite_alerta â†’ ALERTA

- Caso contrÃ¡rio â†’ NORMAL

---

### 3.8 FMEA (AnÃ¡lise de Modos e Efeitos de Falha)

**Finalidade:** AnÃ¡lise proativa de riscos de falha

**Funcionalidades:**

- Cadastro por TAG com funÃ§Ã£o do equipamento

- Falha funcional, modo de falha, efeito e causa

- Severidade, OcorrÃªncia, DetecÃ§Ã£o (1-10)

- CÃ¡lculo automÃ¡tico de RPN

- AÃ§Ãµes recomendadas com responsÃ¡vel e prazo

- Status de acompanhamento

**Regras de NegÃ³cio:**

- RPN = Severidade Ã— OcorrÃªncia Ã— DetecÃ§Ã£o

- ClassificaÃ§Ã£o de risco:

  - RPN â‰¥ 200 â†’ CrÃ­tico

  - RPN â‰¥ 100 â†’ Alto

  - RPN â‰¥ 50 â†’ MÃ©dio

  - RPN < 50 â†’ Baixo

---

### 3.9 RCA (AnÃ¡lise de Causa Raiz)

**Finalidade:** InvestigaÃ§Ã£o estruturada de falhas

**Funcionalidades:**

- Metodologias: 5 PorquÃªs, Ishikawa, Ãrvore de Falhas

- VinculaÃ§Ã£o a OS ou equipamento

- Campos estruturados para cada "Por quÃª?"

- Diagrama Ishikawa (JSON)

- AÃ§Ãµes corretivas vinculadas

- VerificaÃ§Ã£o de eficÃ¡cia

**Status do RCA:**

- EM_ANALISE â†’ AGUARDANDO_ACOES â†’ VERIFICANDO_EFICACIA â†’ CONCLUIDA

---

### 3.10 SSMA (SaÃºde, SeguranÃ§a e Meio Ambiente)

**Finalidade:** GestÃ£o de incidentes e permissÃµes de trabalho

**Funcionalidades de Incidentes:**

- Tipos: ACIDENTE, QUASE_ACIDENTE, INCIDENTE_AMBIENTAL, DESVIO

- Severidade: LEVE, MODERADO, GRAVE, FATAL

- Registro de pessoas envolvidas, testemunhas

- AÃ§Ãµes imediatas e dias de afastamento

- VÃ­nculo com RCA para investigaÃ§Ã£o

**Funcionalidades de PermissÃµes de Trabalho (PT):**

- Tipos: GERAL, TRABALHO_QUENTE, ESPACO_CONFINADO, TRABALHO_ALTURA, ELETRICA, ESCAVACAO

- PerÃ­odo de validade

- Riscos identificados, medidas de controle, EPIs

- AprovaÃ§Ãµes (supervisor, seguranÃ§a)

- Status: PENDENTE â†’ APROVADA â†’ EM_EXECUCAO â†’ CONCLUIDA

---

### 3.11 Hierarquia de Ativos

**Finalidade:** Estrutura organizacional conforme ISO 14224

**NÃ­veis HierÃ¡rquicos:**
```
PLANTA â†’ ÃREA â†’ SISTEMA â†’ EQUIPAMENTO â†’ COMPONENTES
```

**Funcionalidades:**

- CRUD completo para cada nÃ­vel

- Relacionamentos via foreign keys

- Filtros e busca por cÃ³digo/nome

- Status ativo/inativo

---

### 3.12 Equipamentos

**Finalidade:** Cadastro detalhado de ativos

**Funcionalidades Principais:**

- TAG Ãºnico, nome, criticidade ABC

- NÃ­vel de risco (CRITICO, ALTO, MEDIO, BAIXO)

- VinculaÃ§Ã£o ao sistema (hierarquia)

- Fabricante, modelo, nÃºmero de sÃ©rie

- Data de instalaÃ§Ã£o

**Funcionalidades de Componentes (Hierarquia Profunda):**

- Ãrvore recursiva de subcomponentes

- EspecificaÃ§Ãµes tÃ©cnicas (potÃªncia, RPM, tensÃ£o, corrente)

- DimensÃµes (JSON flexÃ­vel)

- Status de manutenÃ§Ã£o (Ãºltima, prÃ³xima, intervalo)

- Horas de operaÃ§Ã£o e vida Ãºtil

---

### 3.13 Materiais

**Finalidade:** Controle de estoque de peÃ§as e insumos

**Funcionalidades:**

- CÃ³digo, nome, unidade, localizaÃ§Ã£o

- Estoque atual e mÃ­nimo

- Custo unitÃ¡rio

- Alerta de estoque baixo

- MovimentaÃ§Ãµes (ENTRADA, SAIDA, AJUSTE)

- HistÃ³rico completo de transaÃ§Ãµes

**Regras de NegÃ³cio:**

- Trigger automÃ¡tico atualiza estoque em movimentaÃ§Ãµes

- SaÃ­da em OS deduz do estoque via trigger

- Alerta visual quando estoque_atual â‰¤ estoque_minimo

---

### 3.14 Fornecedores e Contratos

**Funcionalidades de Fornecedores:**

- CÃ³digo, razÃ£o social, nome fantasia, CNPJ

- Tipo (FABRICANTE, DISTRIBUIDOR, PRESTADOR)

- Contatos e especialidade

- AvaliaÃ§Ã£o mÃ©dia (1-5 estrelas)

**Funcionalidades de Contratos:**

- NÃºmero, tÃ­tulo, descriÃ§Ã£o

- Fornecedor vinculado

- Valores (total, mensal)

- SLA de atendimento e resoluÃ§Ã£o (horas)

- PerÃ­odo de vigÃªncia

- Penalidades

---

### 3.15 Auditoria

**Finalidade:** Rastreabilidade de aÃ§Ãµes crÃ­ticas

**AÃ§Ãµes Auditadas:**

- LOGIN, LOGOUT

- CRIAR_OS, FECHAR_OS, IMPRIMIR_OS

- GERAR_PDF

- CRIAR_USUARIO, EDITAR_USUARIO

- CRIAR_PLANO_PREVENTIVO, EXECUTAR_PLANO_PREVENTIVO

- CADASTRAR_MATERIAL, AJUSTAR_ESTOQUE

**Campos Registrados:**

- Data/hora

- UsuÃ¡rio (ID e nome)

- AÃ§Ã£o

- DescriÃ§Ã£o detalhada

- TAG afetada (quando aplicÃ¡vel)

---

## 4ï¸âƒ£ FLUXOS OPERACIONAIS

### 4.1 Fluxo Principal - Ordem de ServiÃ§o

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ SolicitaÃ§Ã£o â”‚â”€â”€â”€â”€â–¶â”‚  EmissÃ£o    â”‚â”€â”€â”€â”€â–¶â”‚  ExecuÃ§Ã£o   â”‚â”€â”€â”€â”€â–¶â”‚ Fechamento  â”‚
â”‚  (ProduÃ§Ã£o) â”‚     â”‚   da OS     â”‚     â”‚  (Campo)    â”‚     â”‚  (PCM)      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚                   â”‚                   â”‚                   â”‚
       â–¼                   â–¼                   â–¼                   â–¼
   PENDENTE           ABERTA            EM_ANDAMENTO          FECHADA
```

### 4.2 Fluxo de ManutenÃ§Ã£o Preventiva

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Plano     â”‚â”€â”€â”€â”€â–¶â”‚  GeraÃ§Ã£o    â”‚â”€â”€â”€â”€â–¶â”‚  ExecuÃ§Ã£o   â”‚â”€â”€â”€â”€â–¶â”‚ AtualizaÃ§Ã£o â”‚
â”‚ Preventivo  â”‚     â”‚   de OS     â”‚     â”‚ do Checklistâ”‚     â”‚ PrÃ³xima Execâ”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 4.3 Fluxo de AnÃ¡lise de Falha (RCA)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Falha     â”‚â”€â”€â”€â”€â–¶â”‚  AnÃ¡lise    â”‚â”€â”€â”€â”€â–¶â”‚   AÃ§Ãµes     â”‚â”€â”€â”€â”€â–¶â”‚ VerificaÃ§Ã£o â”‚
â”‚ Identificadaâ”‚     â”‚  5 PorquÃªs  â”‚     â”‚ Corretivas  â”‚     â”‚  EficÃ¡cia   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 4.4 Tratamento de Erros

| CenÃ¡rio | Tratamento |
|---------|------------|
| Falha de autenticaÃ§Ã£o | Mensagem de erro + permanece na tela de login |
| Erro de API | Toast de erro + log no console |
| ValidaÃ§Ã£o de formulÃ¡rio | Mensagens inline com Zod |
| Estoque insuficiente | Alerta visual, mas nÃ£o bloqueia |
| SessÃ£o expirada | Redirect automÃ¡tico para login |

---

## 5ï¸âƒ£ MODELO DE DADOS

### 5.1 Diagrama ER Simplificado

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   plantas    â”‚â”€â”€â”€â”€â–¶â”‚    areas     â”‚â”€â”€â”€â”€â–¶â”‚   sistemas   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                                 â”‚
                                                 â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  user_roles  â”‚     â”‚   profiles   â”‚     â”‚ equipamentos â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚                    â”‚                    â”‚
       â”‚                    â”‚         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
       â–¼                    â–¼         â–¼                     â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ordens_servicoâ”‚â—€â”€â”€â”€â”‚  auditoria   â”‚     â”‚ componentes  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â”‚ _equipamento â”‚
       â”‚                                  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
       â–¼                     â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ execucoes_os â”‚     â”‚ materiais_os â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 5.2 Tabelas Principais

| Tabela | DescriÃ§Ã£o | Registros TÃ­picos |
|--------|-----------|-------------------|
| `ordens_servico` | Ordens de serviÃ§o | Alto volume |
| `equipamentos` | Ativos industriais | MÃ©dio volume |
| `componentes_equipamento` | Subcomponentes hierÃ¡rquicos | Alto volume |
| `materiais` | PeÃ§as e insumos | MÃ©dio volume |
| `mecanicos` | Executantes | Baixo volume |
| `planos_preventivos` | Planos de manutenÃ§Ã£o | MÃ©dio volume |
| `fmea` | AnÃ¡lises de risco | MÃ©dio volume |
| `analise_causa_raiz` | RCAs | Baixo/MÃ©dio |
| `incidentes_ssma` | Incidentes de seguranÃ§a | Baixo volume |
| `auditoria` | Logs de aÃ§Ã£o | Alto volume |

### 5.3 Campos CrÃ­ticos por Tabela

**ordens_servico:**

- `numero_os` (SERIAL, Ãºnico)

- `tag` (FK para equipamentos.tag)

- `status` (ABERTA, EM_ANDAMENTO, AGUARDANDO_MATERIAL, FECHADA)

- `tipo` (CORRETIVA, PREVENTIVA, PREDITIVA, INSPECAO, MELHORIA)

- `prioridade` (URGENTE, ALTA, MEDIA, BAIXA)

- `modo_falha`, `causa_raiz` (preenchidos no fechamento)

**equipamentos:**

- `tag` (Ãºnico, identificador primÃ¡rio)

- `criticidade` (A, B, C)

- `nivel_risco` (CRITICO, ALTO, MEDIO, BAIXO)

- `sistema_id` (FK para sistemas)

**componentes_equipamento:**

- `parent_id` (auto-referÃªncia para hierarquia)

- `especificacoes` (JSONB flexÃ­vel)

- `dimensoes` (JSONB flexÃ­vel)

### 5.4 Relacionamentos Principais

| Origem | Destino | Tipo | DescriÃ§Ã£o |
|--------|---------|------|-----------|
| plantas â†’ areas | 1:N | Ãreas pertencem a plantas |
| areas â†’ sistemas | 1:N | Sistemas pertencem a Ã¡reas |
| sistemas â†’ equipamentos | 1:N | Equipamentos pertencem a sistemas |
| equipamentos â†’ componentes | 1:N | Componentes pertencem a equipamentos |
| componentes â†’ componentes | 1:N | Hierarquia recursiva |
| equipamentos â†’ ordens_servico | 1:N | Via campo `tag` |
| ordens_servico â†’ execucoes_os | 1:N | ExecuÃ§Ãµes por OS |
| ordens_servico â†’ materiais_os | 1:N | Materiais por OS |

### 5.5 Regras de Integridade

- **Cascade Delete:** Componentes sÃ£o excluÃ­dos com equipamento

- **Restrict Delete:** Equipamentos com OS nÃ£o podem ser excluÃ­dos

- **Unique Constraints:** `tag` em equipamentos, `codigo` em materiais

- **Check Constraints:** ValidaÃ§Ãµes de range (severidade 1-10)

- **Triggers:** AtualizaÃ§Ã£o automÃ¡tica de estoque em movimentaÃ§Ãµes

---

## 6ï¸âƒ£ REGRAS DE NEGÃ“CIO GERAIS

### 6.1 Regras Globais

| Regra | DescriÃ§Ã£o |
|-------|-----------|
| RN001 | Toda OS deve ter uma TAG vÃ¡lida associada |
| RN002 | Apenas usuÃ¡rios autenticados podem acessar o sistema |
| RN003 | Apenas ADMIN pode excluir registros crÃ­ticos |
| RN004 | Todas as aÃ§Ãµes crÃ­ticas devem ser auditadas |
| RN005 | Equipamentos inativos nÃ£o aparecem em seleÃ§Ãµes |

### 6.2 CÃ¡lculos AutomÃ¡ticos

| CÃ¡lculo | FÃ³rmula | Trigger |
|---------|---------|---------|
| RPN (FMEA) | S Ã— O Ã— D | Ao salvar |
| Custo M.O | (tempo/60) Ã— custo_hora | Ao fechar OS |
| Custo Total OS | M.O + Materiais + Terceiros | Ao fechar OS |
| PrÃ³xima Preventiva | Ãšltima + FrequÃªncia dias | Ao executar |
| Backlog Semanas | Horas acumuladas / 40 | Em tempo real |

### 6.3 RestriÃ§Ãµes Operacionais

- OS sÃ³ pode ser fechada apÃ³s preenchimento de execuÃ§Ã£o

- Materiais com estoque zero nÃ£o bloqueiam saÃ­da (apenas alerta)

- Planos preventivos inativos nÃ£o geram OS automÃ¡ticas

- UsuÃ¡rios USUARIO nÃ£o podem excluir registros

### 6.4 AutomatizaÃ§Ãµes

| AutomaÃ§Ã£o | Trigger | AÃ§Ã£o |
|-----------|---------|------|
| NÃºmero OS | INSERT ordens_servico | Sequence nextval |
| NÃºmero RCA | INSERT analise_causa_raiz | Sequence nextval |
| NÃºmero PT | INSERT permissoes_trabalho | Sequence nextval |
| Estoque | INSERT materiais_os | Deduz via trigger |
| Auditoria | Login/Logout | Registro automÃ¡tico |

---

## 7ï¸âƒ£ INTERFACE E EXPERIÃŠNCIA DO USUÃRIO (UX/UI)

### 7.1 PadrÃ£o Visual

**Design System:** Industrial, funcional, cores neutras

**Paleta de Cores:**
| Token | Valor HSL | Uso |
|-------|-----------|-----|
| `--primary` | 213 56% 24% | AÃ§Ãµes principais |
| `--destructive` | 0 72% 51% | Erros, exclusÃµes |
| `--success` | 142 72% 29% | ConfirmaÃ§Ãµes |
| `--warning` | 38 92% 50% | Alertas |
| `--info` | 199 89% 48% | InformaÃ§Ãµes |

**Tipografia:**

- **Body:** Inter (sans-serif)

- **CÃ³digo/NÃºmeros:** JetBrains Mono (monospace)

### 7.2 NavegaÃ§Ã£o

- **Sidebar fixa** com agrupamento por categoria

- **Breadcrumb** via header com data atual

- **Quick Actions** no dashboard para acesso rÃ¡pido

- **Mobile-first** com sidebar colapsÃ¡vel

### 7.3 Comportamento de FormulÃ¡rios

- ValidaÃ§Ã£o em tempo real com Zod

- Mensagens de erro inline

- Campos obrigatÃ³rios marcados com asterisco

- Loading states em botÃµes durante submissÃ£o

- Toast notifications para feedback

### 7.4 ConsistÃªncia Visual

- Tabelas com classe `.table-industrial`

- Cards com classe `.card-industrial`

- Badges de status padronizados

- Ãcones Lucide React em toda aplicaÃ§Ã£o

- Skeleton loaders durante carregamento

---

## 8ï¸âƒ£ SEGURANÃ‡A E CONTROLE DE ACESSO

### 8.1 Tipos de UsuÃ¡rios

| Role | DescriÃ§Ã£o |
|------|-----------|
| `ADMIN` | Acesso total, pode excluir registros |
| `USUARIO` | Acesso operacional, nÃ£o exclui |

### 8.2 NÃ­veis de PermissÃ£o

| Recurso | ADMIN | USUARIO |
|---------|-------|---------|
| Visualizar dados | âœ… | âœ… |
| Criar registros | âœ… | âœ… |
| Editar registros | âœ… | âœ… |
| Excluir registros | âœ… | âŒ |
| Gerenciar usuÃ¡rios | âœ… | âŒ |
| Visualizar auditoria | âœ… | âœ… |

### 8.3 ProteÃ§Ãµes Implementadas

| ProteÃ§Ã£o | ImplementaÃ§Ã£o |
|----------|---------------|
| **AutenticaÃ§Ã£o** | Supabase Auth com JWT |
| **AutorizaÃ§Ã£o** | Row Level Security (RLS) |
| **Rate Limiting** | FunÃ§Ã£o `check_rate_limit` |
| **Roles Segregadas** | Tabela `user_roles` separada |
| **Auditoria** | Log de todas aÃ§Ãµes crÃ­ticas |
| **ValidaÃ§Ã£o Input** | Zod schemas no frontend |
| **Security Logs** | Tabela `security_logs` |

### 8.4 Row Level Security (RLS)

Todas as tabelas tÃªm RLS habilitado com polÃ­ticas:

- SELECT: UsuÃ¡rios autenticados podem ver

- INSERT: UsuÃ¡rios autenticados podem criar

- UPDATE: UsuÃ¡rios autenticados podem atualizar

- DELETE: Apenas ADMIN pode excluir (via `has_role`)

---

## 9ï¸âƒ£ INTEGRAÃ‡Ã•ES

### 9.1 IntegraÃ§Ãµes Internas

| IntegraÃ§Ã£o | DescriÃ§Ã£o |
|------------|-----------|
| Auth â†’ Profiles | CriaÃ§Ã£o automÃ¡tica de profile no signup |
| OS â†’ Materiais | DeduÃ§Ã£o de estoque via trigger |
| OS â†’ Auditoria | Log automÃ¡tico de criaÃ§Ã£o/fechamento |
| Componentes â†’ Equipamentos | Hierarquia via `parent_id` |

### 9.2 IntegraÃ§Ãµes Externas

| IntegraÃ§Ã£o | Status | DescriÃ§Ã£o |
|------------|--------|-----------|
| Supabase Auth | âœ… Ativo | AutenticaÃ§Ã£o via email/senha |
| Supabase Database | âœ… Ativo | PostgreSQL gerenciado |
| React-to-Print | âœ… Ativo | ImpressÃ£o de OS |
| Recharts | âœ… Ativo | GrÃ¡ficos do dashboard |

### 9.3 Fluxo de Dados Externos

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Client  â”‚â—€â”€â”€â”€â–¶â”‚ Supabase â”‚â—€â”€â”€â”€â–¶â”‚ PostgreSQLâ”‚
â”‚  (React) â”‚ JWT â”‚   API    â”‚     â”‚    DB     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## ðŸ”Ÿ MANUTENÃ‡ÃƒO E EVOLUÃ‡ÃƒO

### 10.1 Pontos CrÃ­ticos

| Ponto | DescriÃ§Ã£o | MitigaÃ§Ã£o |
|-------|-----------|-----------|
| `types/index.ts` | 318 linhas, monolÃ­tico | Refatorar em arquivos separados |
| `AppSidebar.tsx` | 250 linhas | Extrair grupos de menu |
| Queries sem paginaÃ§Ã£o | Performance em alto volume | Implementar paginaÃ§Ã£o |
| Sem testes automatizados | Cobertura zero | Implementar Vitest |

### 10.2 LimitaÃ§Ãµes Atuais

1. **Sem paginaÃ§Ã£o** - Todas as queries trazem todos os registros

1. **Sem relatÃ³rios PDF** - Apenas impressÃ£o via browser

1. **Sem notificaÃ§Ãµes push** - UsuÃ¡rio precisa verificar manualmente

1. **Sem integraÃ§Ã£o ERP** - Dados manuais de custos

1. **Sem aplicativo mobile** - Apenas PWA bÃ¡sico

1. **Sem upload de arquivos** - Storage nÃ£o configurado

### 10.3 Gargalos TÃ©cnicos

| Gargalo | Impacto | Prioridade |
|---------|---------|------------|
| Queries N+1 em componentes | Performance | Alta |
| Tipos duplicados (TypeScript vs Supabase) | Manutenibilidade | MÃ©dia |
| CSS inline em alguns componentes | ConsistÃªncia | Baixa |

### 10.4 Pontos FrÃ¡geis

1. DependÃªncia de `tag` como string (nÃ£o UUID)

1. Campos JSON sem validaÃ§Ã£o de schema

1. AusÃªncia de soft delete em algumas tabelas

1. Falta de Ã­ndices otimizados para buscas frequentes

---

## 1ï¸âƒ£1ï¸âƒ£ CONSIDERAÃ‡Ã•ES TÃ‰CNICAS

### 11.1 PadrÃµes Utilizados

| PadrÃ£o | AplicaÃ§Ã£o |
|--------|-----------|
| **Custom Hooks** | AbstraÃ§Ã£o de lÃ³gica CRUD |
| **Compound Components** | shadcn/ui components |
| **Render Props** | Alguns componentes de UI |
| **Context API** | AutenticaÃ§Ã£o global |
| **Server State** | TanStack Query para cache |

### 11.2 DecisÃµes TÃ©cnicas Relevantes

| DecisÃ£o | Justificativa |
|---------|---------------|
| Supabase over Firebase | Melhor suporte SQL e RLS |
| TanStack Query | Cache inteligente e revalidaÃ§Ã£o |
| shadcn/ui | Componentes acessÃ­veis e customizÃ¡veis |
| Tailwind CSS | Produtividade e consistÃªncia |
| TypeScript | Type safety e DX |

### 11.3 ObservaÃ§Ãµes para Desenvolvedores

1. **Nunca editar** `src/integrations/supabase/types.ts` (auto-gerado)

1. **Sempre usar** hooks customizados para CRUD

1. **Seguir** design tokens de `index.css`

1. **Usar** `useAuth()` para verificar permissÃµes

1. **Logar** aÃ§Ãµes crÃ­ticas via `useLogAuditoria()`

1. **Validar** inputs com Zod antes de enviar

---

# PARTE 2 â€” ANÃLISE CRÃTICA E PROPOSTAS DE APRIMORAMENTO

---

## 1ï¸âƒ£ ANÃLISE TÃ‰CNICA GERAL

### 1.1 AvaliaÃ§Ã£o da Arquitetura

| CritÃ©rio | Nota (1-10) | ObservaÃ§Ã£o |
|----------|-------------|------------|
| SeparaÃ§Ã£o de responsabilidades | 8 | Hooks bem isolados |
| Escalabilidade horizontal | 6 | Backend Supabase escala, frontend nÃ£o |
| Testabilidade | 4 | Sem testes implementados |
| Manutenibilidade | 7 | CÃ³digo limpo, mas arquivos grandes |
| SeguranÃ§a | 8 | RLS bem implementado |

### 1.2 AvaliaÃ§Ã£o de MÃ³dulos

| MÃ³dulo | Completude | Qualidade | Prioridade Melhoria |
|--------|------------|-----------|---------------------|
| Dashboard | 90% | Alta | Baixa |
| Ordens de ServiÃ§o | 85% | Alta | MÃ©dia |
| Equipamentos | 80% | Alta | MÃ©dia |
| Preventiva | 60% | MÃ©dia | Alta |
| Preditiva | 70% | MÃ©dia | MÃ©dia |
| FMEA | 75% | Alta | Baixa |
| RCA | 70% | Alta | Baixa |
| SSMA | 80% | Alta | Baixa |
| Materiais | 85% | Alta | Baixa |
| RelatÃ³rios | 30% | Baixa | Alta |

### 1.3 AvaliaÃ§Ã£o de Escalabilidade

**Pontos Fortes:**

- Backend Supabase escala automaticamente

- Queries com React Query tÃªm cache eficiente

- RLS permite segmentaÃ§Ã£o de dados

**Pontos Fracos:**

- AusÃªncia de paginaÃ§Ã£o limita performance

- Falta de Ã­ndices especÃ­ficos para queries pesadas

- Componentes grandes podem causar re-renders

### 1.4 AvaliaÃ§Ã£o de Manutenibilidade

**Pontos Fortes:**

- TypeScript com tipos bem definidos

- Hooks customizados bem documentados

- Design system centralizado

**Pontos Fracos:**

- `types/index.ts` monolÃ­tico

- Alguns componentes de pÃ¡gina muito grandes (>500 linhas)

- Falta de comentÃ¡rios em lÃ³gica complexa

---

## 2ï¸âƒ£ IDENTIFICAÃ‡ÃƒO DE PROBLEMAS E LIMITAÃ‡Ã•ES

### 2.1 Problemas TÃ©cnicos

| ID | Problema | Severidade | Ãrea |
|----|----------|------------|------|
| P01 | AusÃªncia de paginaÃ§Ã£o em listagens | Alta | Performance |
| P02 | Arquivo types.ts monolÃ­tico | MÃ©dia | Manutenibilidade |
| P03 | Sem testes automatizados | Alta | Qualidade |
| P04 | Queries sem otimizaÃ§Ã£o (select *) | MÃ©dia | Performance |
| P05 | Falta de Ã­ndices no banco | MÃ©dia | Performance |

### 2.2 Riscos TÃ©cnicos

| ID | Risco | Probabilidade | Impacto |
|----|-------|---------------|---------|
| R01 | Performance degradada com >10k OS | Alta | Alto |
| R02 | Perda de dados sem soft delete | MÃ©dia | Alto |
| R03 | InconsistÃªncia de tipos TS/DB | MÃ©dia | MÃ©dio |
| R04 | Falhas silenciosas em mutations | Baixa | Alto |

### 2.3 Falhas de Usabilidade

| ID | Falha | Impacto |
|----|-------|---------|
| U01 | Sem busca global | NavegaÃ§Ã£o lenta |
| U02 | Sem atalhos de teclado | Produtividade |
| U03 | Filtros nÃ£o persistem | UX inconsistente |
| U04 | Sem feedback de progresso em operaÃ§Ãµes longas | ConfusÃ£o |

### 2.4 Gargalos de Performance

| Gargalo | Causa | SoluÃ§Ã£o |
|---------|-------|---------|
| Listagem de OS lenta | Sem paginaÃ§Ã£o | Implementar infinite scroll |
| Dashboard inicial lento | MÃºltiplas queries | Agregar no backend |
| SeleÃ§Ã£o de equipamentos | Carrega todos | Implementar search async |

### 2.5 Riscos Futuros

1. **Escalabilidade:** Sistema pode travar com >50k registros

1. **SeguranÃ§a:** Falta de 2FA para admin

1. **Compliance:** Sem exportaÃ§Ã£o de dados (LGPD)

1. **IntegraÃ§Ã£o:** Isolamento dificulta integraÃ§Ã£o com ERPs

---

## 3ï¸âƒ£ PROPOSTAS DE APRIMORAMENTO

### P01 - Implementar PaginaÃ§Ã£o

**Problema:** Queries carregam todos os registros, causando lentidÃ£o

**Impacto:** Performance degradada em ambientes com alto volume de dados

**SoluÃ§Ã£o:**
```typescript
// Implementar hook com paginaÃ§Ã£o
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

**BenefÃ­cios:**

- Carregamento inicial 10x mais rÃ¡pido

- Menos consumo de memÃ³ria

- Melhor UX com infinite scroll

---

### P02 - Refatorar Tipos TypeScript

**Problema:** `types/index.ts` com 318 linhas dificulta manutenÃ§Ã£o

**SoluÃ§Ã£o:**
```
src/types/
â”œâ”€â”€ index.ts          # Re-exports
â”œâ”€â”€ user.types.ts     # User, UserRole
â”œâ”€â”€ os.types.ts       # OrdemServico, Execucao
â”œâ”€â”€ asset.types.ts    # Equipamento, Componente
â”œâ”€â”€ material.types.ts # Material, Movimentacao
â”œâ”€â”€ analytics.types.ts # Indicadores, KPIs
â””â”€â”€ safety.types.ts   # Incidente, PT
```

**BenefÃ­cios:**

- Melhor organizaÃ§Ã£o

- Imports mais especÃ­ficos

- Facilita code splitting

---

### P03 - Implementar Testes Automatizados

**Problema:** Zero cobertura de testes

**SoluÃ§Ã£o:**
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

**BenefÃ­cios:**

- PrevenÃ§Ã£o de regressÃµes

- DocumentaÃ§Ã£o viva

- RefatoraÃ§Ã£o segura

---

### P04 - Implementar Busca Global

**Problema:** UsuÃ¡rio precisa navegar para buscar

**SoluÃ§Ã£o:** Command Palette (Cmd+K)

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

**BenefÃ­cios:**

- Acesso rÃ¡pido a qualquer recurso

- Produtividade aumentada

- UX moderna

---

### P05 - GeraÃ§Ã£o AutomÃ¡tica de Preventivas

**Problema:** Planos preventivos nÃ£o geram OS automaticamente

**SoluÃ§Ã£o:** Edge Function + Cron Job

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
      problema: `ExecuÃ§Ã£o do plano ${plano.codigo}`,
      // ...
    });
    
    await supabase.from('planos_preventivos').update({
      proxima_execucao: addDays(new Date(), plano.frequencia_dias)
    }).eq('id', plano.id);
  }
});
```

**BenefÃ­cios:**

- AutomaÃ§Ã£o real de preventivas

- ReduÃ§Ã£o de esquecimentos

- AderÃªncia ao programa de manutenÃ§Ã£o

---

### P06 - RelatÃ³rios PDF AvanÃ§ados

**Problema:** Sem relatÃ³rios gerenciais exportÃ¡veis

**SoluÃ§Ã£o:** IntegraÃ§Ã£o com biblioteca de PDF

```typescript
// Usar @react-pdf/renderer ou jspdf
import { Document, Page, Text, View, PDFDownloadLink } from '@react-pdf/renderer';

const RelatorioMensal = ({ dados }) => (
  <Document>
    <Page size="A4">
      <View>
        <Text>RelatÃ³rio Mensal de ManutenÃ§Ã£o</Text>
        {/* GrÃ¡ficos, tabelas, KPIs */}
      </View>
    </Page>
  </Document>
);
```

**BenefÃ­cios:**

- RelatÃ³rios para gestÃ£o

- HistÃ³rico documentado

- Compliance e auditorias

---

### P07 - NotificaÃ§Ãµes em Tempo Real

**Problema:** UsuÃ¡rios nÃ£o sÃ£o alertados sobre eventos crÃ­ticos

**SoluÃ§Ã£o:** Supabase Realtime + Toast/Push

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

**BenefÃ­cios:**

- Resposta rÃ¡pida a urgÃªncias

- Melhor comunicaÃ§Ã£o

- Menos verificaÃ§Ãµes manuais

---

### P08 - Dashboard de Confiabilidade

**Problema:** Falta anÃ¡lise de confiabilidade por equipamento

**SoluÃ§Ã£o:** Novo dashboard com curvas de tendÃªncia

**MÃ©tricas Adicionais:**

- Curva da banheira por equipamento

- Pareto de falhas por TAG

- TendÃªncia de MTBF/MTTR por perÃ­odo

- Custo por hora operada

---

### P09 - IntegraÃ§Ã£o com CalendÃ¡rio

**Problema:** ProgramaÃ§Ã£o difÃ­cil de visualizar

**SoluÃ§Ã£o:** Componente de calendÃ¡rio integrado

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

**Problema:** IdentificaÃ§Ã£o manual de equipamentos em campo

**SoluÃ§Ã£o:** GeraÃ§Ã£o de QR Code vinculado Ã  TAG

```typescript
import QRCode from 'qrcode.react';

const EquipamentoQR = ({ tag }) => (
  <QRCode 
    value={`${window.location.origin}/equipamentos?tag=${tag}`}
    size={128}
  />
);
```

**BenefÃ­cios:**

- Acesso rÃ¡pido em campo via mobile

- ReduÃ§Ã£o de erros de digitaÃ§Ã£o

- ModernizaÃ§Ã£o do processo

---

## 4ï¸âƒ£ MELHORIAS ESTRUTURAIS SUGERIDAS

### 4.1 Melhorias na Arquitetura

| Melhoria | DescriÃ§Ã£o | EsforÃ§o |
|----------|-----------|---------|
| Micro-frontends | Separar mÃ³dulos em pacotes | Alto |
| GraphQL | Substituir REST por GraphQL | Alto |
| Service Workers | Cache offline | MÃ©dio |
| Web Workers | Processamento pesado | MÃ©dio |

### 4.2 Melhorias na OrganizaÃ§Ã£o

| Melhoria | DescriÃ§Ã£o | EsforÃ§o |
|----------|-----------|---------|
| Monorepo | Nx ou Turborepo | Alto |
| Design System | Storybook documentado | MÃ©dio |
| Feature Flags | Rollout gradual | MÃ©dio |
| Error Boundary | Tratamento de erros React | Baixo |

### 4.3 Novas Funcionalidades Sugeridas

| Funcionalidade | Prioridade | EsforÃ§o |
|----------------|------------|---------|
| App Mobile (React Native) | Alta | Alto |
| IntegraÃ§Ã£o SAP/TOTVS | Alta | Alto |
| Assinatura Digital | MÃ©dia | MÃ©dio |
| OCR para Notas Fiscais | MÃ©dia | MÃ©dio |
| Chatbot de Suporte | Baixa | MÃ©dio |
| GamificaÃ§Ã£o (pontos) | Baixa | Baixo |

### 4.4 AutomatizaÃ§Ãµes Recomendadas

| AutomaÃ§Ã£o | Trigger | BenefÃ­cio |
|-----------|---------|-----------|
| Alerta estoque baixo | estoque â‰¤ mÃ­nimo | ReposiÃ§Ã£o proativa |
| EscalaÃ§Ã£o de urgentes | OS urgente >2h | GestÃ£o de SLA |
| RelatÃ³rio semanal | Domingo 20h | Visibilidade |
| Backup dados | DiÃ¡rio 02h | SeguranÃ§a |

---

## 5ï¸âƒ£ EVOLUÃ‡ÃƒO DO SISTEMA

### 5.1 Curto Prazo (1-3 meses)

| Item | DescriÃ§Ã£o | Prioridade |
|------|-----------|------------|
| PaginaÃ§Ã£o | Implementar em todas as listagens | P1 |
| Testes unitÃ¡rios | Cobertura mÃ­nima 60% | P1 |
| GeraÃ§Ã£o automÃ¡tica PM | Cron para preventivas | P1 |
| Busca global | Command palette | P2 |
| RelatÃ³rios bÃ¡sicos | PDF mensal | P2 |

### 5.2 MÃ©dio Prazo (3-6 meses)

| Item | DescriÃ§Ã£o | Prioridade |
|------|-----------|------------|
| App Mobile | React Native bÃ¡sico | P1 |
| NotificaÃ§Ãµes push | Firebase/OneSignal | P1 |
| Dashboard confiabilidade | Curvas e Pareto | P2 |
| IntegraÃ§Ã£o calendÃ¡rio | VisualizaÃ§Ã£o programaÃ§Ã£o | P2 |
| QR Code | Etiquetas para equipamentos | P3 |

### 5.3 Longo Prazo (6-12 meses)

| Item | DescriÃ§Ã£o | Prioridade |
|------|-----------|------------|
| IntegraÃ§Ã£o ERP | SAP/TOTVS/Protheus | P1 |
| Machine Learning | PrediÃ§Ã£o de falhas | P2 |
| IoT Sensors | Coleta automÃ¡tica preditiva | P2 |
| BI Embarcado | Dashboards customizÃ¡veis | P3 |
| Multi-tenancy | MÃºltiplas empresas | P3 |

### 5.4 Possibilidades de Escalabilidade

| CenÃ¡rio | SoluÃ§Ã£o |
|---------|---------|
| >100k OS | Particionamento de tabelas |
| >1000 usuÃ¡rios simultÃ¢neos | CDN + Edge Functions |
| Multi-site | ReplicaÃ§Ã£o por regiÃ£o |
| Offline-first | PWA com IndexedDB |

---

## CONCLUSÃƒO

O **PCM ESTRATÃ‰GICO** Ã© um sistema robusto e bem estruturado para gestÃ£o de manutenÃ§Ã£o industrial, com cobertura abrangente das principais necessidades operacionais. A arquitetura baseada em React + Supabase oferece boa escalabilidade e seguranÃ§a.

**Pontos Fortes:**

- Cobertura funcional completa (21 mÃ³dulos)

- Design system consistente

- SeguranÃ§a com RLS bem implementado

- CÃ³digo TypeScript tipado

**Ãreas de Melhoria PrioritÃ¡rias:**

1. Performance (paginaÃ§Ã£o)

1. Qualidade (testes automatizados)

1. AutomaÃ§Ã£o (geraÃ§Ã£o de preventivas)

1. RelatÃ³rios (exportaÃ§Ã£o PDF)

1. Mobilidade (app nativo)

Este documento deve ser atualizado a cada release significativo para refletir o estado atual do sistema.

---

*Documento gerado em: Fevereiro 2026*  
*VersÃ£o do Sistema: 2.0*  
*ClassificaÃ§Ã£o: Documento TÃ©cnico Interno*
