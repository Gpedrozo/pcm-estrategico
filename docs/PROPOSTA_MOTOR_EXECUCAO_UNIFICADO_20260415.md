# PROPOSTA SENIOR: Motor Unificado de Execução de Manutenções Programadas

**Data:** 15/04/2026 — Versão 1.0  
**Autor:** Análise técnica de arquitetura  
**Escopo:** Ciclo completo de atividades programadas — Preventivas, Lubrificações, Preditivas, Inspeções

---

## SUMÁRIO EXECUTIVO

O sistema PCM Estratégico possui uma infraestrutura sólida para **cadastro e visualização** de manutenções programadas, mas o **ciclo de execução está aberto**: a O.S. gerada no calendário não retroalimenta o plano, o fechamento da O.S. não marca a preventiva como executada, e os alertas existem no backend mas não chegam ao operador no momento certo.

Esta proposta define um **Motor Unificado de Execução** — uma camada de orquestração que conecta todas as pontas do ciclo, servindo como padrão genérico para qualquer tipo de manutenção programada. A ideia não é reescrever o que já existe, mas **conectar os componentes existentes** com lógica de Estado bem definida.

---

## PARTE 1 — DIAGNÓSTICO COMPLETO

### 1.1 Mapa de Componentes Existentes

| Camada | Componente | Papel |
|--------|-----------|-------|
| Dados | `planos_preventivos` | Plano-mestre preventivo |
| Dados | `planos_lubrificacao` | Plano-mestre lubrificação |
| Dados | `maintenance_schedule` | Agenda unificada (todas as origens) |
| Dados | `execucoes_preventivas` | Execuções de preventiva (com `os_gerada_id` FK) |
| Dados | `execucoes_lubrificacao` | Execuções de lubrificação (com `os_gerada_id` FK) |
| Dados | `ordens_servico` | O.S. (PREVENTIVA, LUBRIFICACAO, etc.) |
| Dados | `execucoes_os` | Execução atômica da O.S. (tempos/custo) |
| Dados | `maintenance_action_suggestions` | Sugestões geradas por trigger |
| Hooks | `useMaintenanceScheduleExpanded` | Expansão de recorrências |
| Hooks | `useUpdateMaintenanceStatus` | Muda status do schedule |
| Hooks | `useCreateExecucao` | Cria execução preventiva |
| Hooks | `useCreateExecucaoLubrificacao` | Cria execução lubrificação |
| Hooks | `useGenerateExecucoesNow` | Batch: exec + O.S. (só lubrificação) |
| Hooks | `useCloseOSAtomic` | RPC de fechamento atômico |
| UI | `Programacao.tsx` | Calendário com emissão de O.S. |
| UI | `Preventiva.tsx` | Cadastro + detalhe com aba "Execução" |
| UI | `Lubrificacao.tsx` | Cadastro de planos |
| UI | `FecharOS.tsx` | Fechamento atômico de O.S. |
| UI | `NotificationCenter.tsx` | Alertas de preventivas atrasadas |
| UI | `QuickActions.tsx` | (preparado, sem dados) |
| UI | `AlertsPanel.tsx` | (preparado, sem dados) |
| Backend | `close_os_with_execution_atomic` | Fecha O.S. atomicamente |
| Backend | `trg_preventiva_overdue_suggest` | Gera suggestion quando vence |

### 1.2 Problemas Identificados — O Ciclo Aberto

| # | Problema | Gravidade |
|---|---------|-----------|
| 1 | Fechar O.S. não retroalimenta o plano — RPC não toca em execucoes_preventivas, planos, nem schedule | CRÍTICO |
| 2 | Emitir O.S. não cria vínculo — handleEmitirOS não preenche os_gerada_id | CRÍTICO |
| 3 | Dois caminhos paralelos desconectados — Executar pelo painel ≠ Executar via O.S. | CRÍTICO |
| 4 | Lubrificação mapeada como PREVENTIVA na O.S. | MÉDIO |
| 5 | Alertas passivos — NotificationCenter sem sidebar; QuickActions sem dados | MÉDIO |
| 6 | maintenance_action_suggestions nunca lido no frontend | MÉDIO |
| 7 | proxima_execucao nunca atualizado após fechar O.S. | CRÍTICO |
| 8 | Checklist técnico ignorado no fechamento | MÉDIO |
| 9 | Batch generation só para lubrificação, não preventivas | MÉDIO |

---

## PARTE 2 — MODELO CONCEITUAL: MÁQUINA DE ESTADOS

### 2.1 Ciclo de Vida de uma Manutenção Programada

Todo tipo de manutenção programada (preventiva, lubrificação, inspeção, preditiva) segue a mesma máquina de estados:

```
PLANO (entidade permanente: frequência, equipamento, checklist, próxima execução)
  │
  │ [proxima_execucao se aproxima]
  ▼
ESTADO 1: AGENDADO
  maintenance_schedule.status = 'programado'
  Calendário: azul (futuro)
  Saída: data - tolerancia ≤ hoje → ALERTADO
         ou operador emite antecipado → EM EMISSÃO

  │
  ▼
ESTADO 2: ALERTADO
  maintenance_schedule.status = 'alertado'
  Calendário: amarelo (próximo)
  Badge na sidebar: "3 manutenções vencendo"
  Toast no Dashboard
  Saída: operador emite → EM EMISSÃO
         ou data + tolerancia < hoje → VENCIDO

  │
  ▼
ESTADO 3: EM EMISSÃO (O.S. GERADA)
  maintenance_schedule.status = 'emitido'
  execucoes_{tipo}.status = 'PENDENTE'
  execucoes_{tipo}.os_gerada_id = ID da O.S.
  O.S. criada com tipo correto
  Saída: mecânico inicia → EM EXECUÇÃO
         ou operador fecha → CONCLUÍDO

  │
  ▼
ESTADO 4: EM EXECUÇÃO
  execucoes_{tipo}.status = 'EM_EXECUCAO'
  ordens_servico.status = 'EM_ANDAMENTO'
  Saída: operador fecha O.S. → CONCLUÍDO

  │
  ▼
ESTADO 5: CONCLUÍDO + CHECKLIST
  Ao fechar a O.S.:
  a) Detecta origem: SELECT execucoes_{tipo} WHERE os_gerada_id = os.id
  b) Apresenta checklist técnico do plano (OK/NOK/N.A. por item)
  c) Fecha atomicamente:
     - execucoes_{tipo}.status = 'CONCLUIDO'
     - execucoes_{tipo}.checklist = respostas
     - plano.ultima_execucao = NOW()
     - plano.proxima_execucao = NOW() + frequencia
     - schedule.status = 'executado'
     - schedule.data_programada = nova próxima
  d) Ciclo recomeça

ESTADO ALTERNATIVO: VENCIDO
  maintenance_schedule.status = 'vencido'
  Calendário: vermelho
  Badge na sidebar: "2 manutenções VENCIDAS"
  Saída: operador emite atrasada → EM EMISSÃO
         ou operador reagenda (com justificativa) → AGENDADO
```

### 2.2 Por Que Máquina de Estados?

1. **Previsibilidade** — Cada componente só precisa saber em que estado está
2. **Auditoria** — Transições registradas com timestamp + operador
3. **Universalidade** — Funciona igual para preventiva, lubrificação, inspeção, preditiva
4. **Extensibilidade** — Novos estados (ex: "APROVAÇÃO_GERENCIA") facilmente adicionáveis

---

## PARTE 3 — ARQUITETURA DA SOLUÇÃO

### 3.1 Visão Macro

```
ENTRADA          DECISÃO           EXECUÇÃO         FECHAMENTO
┌────────┐    ┌───────────┐     ┌──────────┐     ┌───────────┐
│ ALERTA ├───>│ CALENDÁRIO├────>│  O.S.    ├────>│  FECHAR   │
│ sidebar│    │ ou Detalhe│     │ + FICHA  │     │  O.S.     │
│ badge  │    │ do plano  │     │ + EXEC   │     │ + CHECK   │
└────────┘    └───────────┘     └──────────┘     └─────┬─────┘
     ▲                                                  │
     │        ┌──────────────────────────────┐          │
     └────────│ RETROALIMENTAÇÃO AUTOMÁTICA  │◄─────────┘
              │ • plano.proxima_execucao     │
              │ • schedule recalculado       │
              │ • badge atualizado           │
              └──────────────────────────────┘
```

### 3.2 Estrutura das Mudanças

#### Camada 1 — Backend (RPC Expandido)

Expandir `close_os_with_execution_atomic` com parâmetro opcional `p_scheduled_context JSONB DEFAULT NULL`:

```json
{
  "tipo": "preventiva|lubrificacao|inspecao|preditiva",
  "execucao_id": "uuid da execucao_{tipo}",
  "plano_id": "uuid do plano",
  "checklist_respostas": [{ "label": "...", "ok": true, "obs": "..." }],
  "frequencia_dias": 30
}
```

Novo bloco atômico no final do RPC (mesma transaction):
- Se `p_scheduled_context IS NOT NULL`: atualiza execução, plano e schedule

**Vantagem:** Zero breaking change. O.S. corretivas continuam sem p_scheduled_context.

#### Camada 2 — Lógica (Hooks)

**Novo hook:** `useScheduledMaintenanceContext(osId)`
- Busca execucao_{tipo} com os_gerada_id = osId
- Se encontrar, carrega plano e checklist
- Retorna { execucao, plano, checklist, tipo } ou null

**Novo hook:** `useMaintenanceAlertCounts()`
- Contagem de manutenções alertadas/vencidas para sidebar e dashboard

**Modificar:** `handleEmitirOS` em Programacao.tsx
- Criar execução programada com os_gerada_id preenchido
- Mapear tipo corretamente (lubrificacao → LUBRIFICACAO)

#### Camada 3 — UI (Componentes)

**Modificar FecharOS.tsx:**
- Usar useScheduledMaintenanceContext para detectar O.S. programada
- Renderizar Checklist Técnico condicional
- Passar p_scheduled_context no RPC

**Modificar AppSidebar.tsx:**
- Badge com contagem de manutenções vencendo/vencidas

**Ativar Dashboard:**
- QuickActions e AlertsPanel (já preparados)

---

## PARTE 4 — ESPECIFICAÇÃO DETALHADA

### 4.1 Emissão de O.S. — O Momento Chave

Ao clicar "Emitir O.S." no calendário ou detalhe do plano:

**PASSO 1:** Cria O.S. pré-preenchida
- tipo: mapeado corretamente do plano
- prioridade: editável (padrão MEDIA)
- tag + equipamento: do plano
- problema: atividades concatenadas
- tempo_estimado: do plano

**PASSO 2:** Cria registro de execução programada
- plano_id: schedule.origem_id
- status: PENDENTE
- os_gerada_id: ID da O.S. criada ← VINCULAÇÃO
- checklist: cópia do plano.checklist

**PASSO 3:** Atualiza schedule
- maintenance_schedule.status = 'emitido'

**PASSO 4:** Impressão (opcional)
- Página 1: O.S. (formato atual)
- Página 2: Ficha de Serviço Programado (checklist do plano)

### 4.2 Fechamento da O.S. — A Retroalimentação

Ao fechar O.S. no FecharOS.tsx:

**ETAPAS EXISTENTES (sem alteração):**
- Tab Execução: mecânico, horários, pausas, serviço
- Tab Materiais: materiais utilizados, custo terceiros
- Checklist genérico: horário válido, serviço >20 chars

**NOVA SEÇÃO (condicional — só se O.S. veio de manutenção programada):**
- Detectado via os_gerada_id
- Carrega checklist do plano
- Cada item: OK / NOK / N.A. + observação
- Itens obrigatórios bloqueiam se NOK sem justificativa
- Progresso visual (barra de %)

**Ao clicar "Fechar O.S.":**
1. Valida checklist técnico
2. RPC expandido fecha atomicamente:
   - Fecha O.S. (existente)
   - Registra execucao_os (existente)
   - execucoes_{tipo}.status = 'CONCLUIDO' (NOVO)
   - execucoes_{tipo}.checklist = respostas (NOVO)
   - execucoes_{tipo}.tempo_real_min = tempo da O.S. (NOVO)
   - plano.ultima_execucao = NOW() (NOVO)
   - plano.proxima_execucao = NOW() + frequencia (NOVO)
   - schedule.status = 'executado' (NOVO)
3. Ciclo recomeça automaticamente

### 4.3 Sistema de Alertas — A Entrada do Fluxo

**NÍVEL 1 — Sidebar Badge (sempre visível):**
- Programação: total alertados + vencidos
- Preventivas: vencidas em vermelho
- Lubrificações: alertadas em amarelo

**NÍVEL 2 — Dashboard Cards:**
- QuickActions (já preparado, ativar)
- AlertsPanel (já preparado, ativar)

**NÍVEL 3 — NotificationCenter (toast no login):**
- "Você tem X vencidas e Y próximas do vencimento"
- [Ver Programação] / [Dispensar]

**Fonte de dados unificada:**
```sql
SELECT COUNT(*) FROM maintenance_schedule
WHERE empresa_id = $1
  AND status IN ('programado', 'alertado')
  AND data_programada <= NOW() + INTERVAL '7 days'
GROUP BY CASE WHEN data_programada < NOW() THEN 'vencido' ELSE 'proximo' END
```

### 4.4 Ficha Impressa

Impressão composta de 2 páginas:
- **Página 1:** O.S. (formato atual, sem mudança)
- **Página 2:** Ficha de Serviço Programado com tabela de checklist (OK/NOK/N.A./Obs), assinaturas e data

---

## PARTE 5 — FLUXO COMPLETO PONTA-A-PONTA (EXEMPLO REAL)

### Cenário: Preventiva trimestral do Torno CNC vencendo

**DIA 1 — 08:00 — João (Planejador PCM) faz login**

1. NotificationCenter: "2 manutenções vencendo esta semana"
2. Sidebar: Programação ⚠ 2
3. Abre Programação → PRV-001 amarelo (vence amanhã)
4. Clica → Modal com dados do plano + atividades
5. "Emitir O.S." → O.S. nº 1345 + execucao_preventiva (PENDENTE) + ficha impressa
6. Entrega ficha ao Carlos (mecânico)

**DIA 2 — Carlos executa no campo, preenche ficha**

**DIA 2 — 16:00 — João abre FecharOS.tsx**

1. Seleciona O.S. nº 1345
2. Preenche execução (mecânico, horários, serviço)
3. Preenche materiais (2L óleo SAE 68)
4. NOVA SEÇÃO: Checklist Técnico PRV-001 → marca tudo OK
5. "Fechar O.S." → RPC atômico:
   - Fecha O.S. → FECHADA
   - execucao_preventiva → CONCLUIDO
   - PRV-001: ultima_execucao = 16/04, proxima = 15/07 (+90 dias)
   - Schedule: executado + data_programada = 15/07

**RESULTADO:**
- Calendário: 16/04 verde (executado), 15/07 azul (futuro)
- Histórico: execução completa com O.S. vinculada
- Dashboard: aderência atualizada
- Sidebar: badge -1

---

## PARTE 6 — IMPLEMENTAÇÃO TÉCNICA

### 6.1 Ordem de Implementação (respeitando dependências)

| Ordem | Item | Complexidade |
|-------|------|-------------|
| 1 | FIX mapeamento tipo (Programacao.tsx L38) | Trivial |
| 2 | HOOK useScheduledMaintenanceContext | Baixa |
| 3 | HOOK useMaintenanceAlertCounts | Baixa |
| 4 | EXPAND handleEmitirOS (criar execução + vínculo) | Média |
| 5 | EXPAND RPC close_os_with_execution_atomic | Média |
| 6 | EXPAND FecharOS (checklist técnico + contexto) | Média |
| 7 | SIDEBAR badge | Baixa |
| 8 | DASHBOARD alertas | Baixa |
| 9 | FICHA IMPRESSA página 2 | Média |

### 6.2 O Que NÃO Mudar

| Componente | Razão |
|-----------|-------|
| Estrutura de tabelas | os_gerada_id, checklist, proxima_execucao já existem |
| RPC existente | Apenas adicionar parâmetro opcional |
| Ficha impressa pág 1 | Já funciona bem |
| Lógica de recorrência | useMaintenanceScheduleExpanded está correto |
| Calendário visual | Cores e layout estão bons |
| Execução manual pelo painel | Continua como alternativa (sem O.S.) |

---

## CONCLUSÃO

Esta proposta transforma um sistema que tem **todas as peças mas não as conecta** em um **motor unificado de execução** com ciclo fechado. O esforço principal é criar 2 hooks novos, expandir o RPC com 1 parâmetro opcional, e adicionar 1 seção condicional no FecharOS. Não é uma reescrita — é uma **costura cirúrgica** das pontas que já existem.

A máquina de estados garante que qualquer tipo de manutenção programada siga o mesmo fluxo: **AGENDADO → ALERTADO → EMITIDO → EM EXECUÇÃO → CONCLUÍDO → próximo ciclo.**
