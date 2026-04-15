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

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPONENTES DO SISTEMA ATUAL                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CAMADA DE DADOS (Supabase)                                                 │
│  ├── planos_preventivos ............ Plano-mestre preventivo                │
│  ├── planos_lubrificacao ........... Plano-mestre lubrificação              │
│  ├── maintenance_schedule .......... Agenda unificada (todas as origens)    │
│  ├── execucoes_preventivas ......... Execuções de preventiva (os_gerada_id)│
│  ├── execucoes_lubrificacao ........ Execuções de lubrificação (os_gerada_id│
│  ├── ordens_servico ................ O.S. (PREVENTIVA, LUBRIFICACAO, etc.)  │
│  ├── execucoes_os .................. Execução atômica da O.S. (tempos/custo)│
│  ├── maintenance_action_suggestions  Sugestões geradas por trigger          │
│  └── materiais_os .................. Materiais utilizados                   │
│                                                                             │
│  CAMADA DE LÓGICA (Hooks)                                                   │
│  ├── useMaintenanceScheduleExpanded  Expansão de recorrências               │
│  ├── useUpdateMaintenanceStatus .... Muda status do schedule                │
│  ├── useCreateExecucao ............. Cria execução preventiva               │
│  ├── useCreateExecucaoLubrificacao . Cria execução lubrificação             │
│  ├── useGenerateExecucoesNow ....... Batch: exec + O.S. (só lubrificação)  │
│  ├── useCloseOSAtomic .............. RPC de fechamento atômico              │
│  └── upsertMaintenanceSchedule ..... Cria/atualiza entrada no calendário   │
│                                                                             │
│  CAMADA DE UI                                                               │
│  ├── Programacao.tsx ............... Calendário com emissão de O.S.         │
│  ├── Preventiva.tsx ................ Cadastro + detalhe com aba "Execução"  │
│  ├── Lubrificacao.tsx .............. Cadastro de planos                     │
│  ├── LubrificacaoDetalhe.tsx ....... Pontos + execução                     │
│  ├── FecharOS.tsx .................. Fechamento atômico de O.S.             │
│  ├── NotificationCenter.tsx ........ Alertas de preventivas atrasadas      │
│  ├── QuickActions.tsx .............. (preparado, sem dados)                 │
│  └── AlertsPanel.tsx ............... (preparado, sem dados)                 │
│                                                                             │
│  CAMADA NO BACKEND (Triggers/RPCs)                                          │
│  ├── close_os_with_execution_atomic  Fecha O.S. atomicamente               │
│  └── trg_preventiva_overdue_suggest  Gera suggestion quando vence          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Problemas Identificados — O Ciclo Aberto

| # | Problema | Gravidade | Onde |
|---|---------|-----------|------|
| 1 | **Fechar O.S. não retroalimenta o plano** — `close_os_with_execution_atomic` não toca em `execucoes_preventivas`, `planos_preventivos`, nem `maintenance_schedule` | 🔴 Crítico | RPC + FecharOS.tsx |
| 2 | **Emitir O.S. não cria vínculo** — `handleEmitirOS` não preenche `os_gerada_id` nem cria registro em `execucoes_preventivas` | 🔴 Crítico | Programacao.tsx |
| 3 | **Dois caminhos paralelos desconectados** — Executar pelo painel do plano ≠ Executar via O.S. Os dois não se cruzam | 🔴 Crítico | Preventiva.tsx + FecharOS.tsx |
| 4 | **Lubrificação mapeada como PREVENTIVA na O.S.** — `mapMaintenanceTipoToOsTipo('lubrificacao')` retorna `'PREVENTIVA'` | 🟡 Médio | Programacao.tsx L38 |
| 5 | **Alertas passivos** — NotificationCenter consulta vencidas mas não aparece na sidebar; QuickActions preparado mas sem dados | 🟡 Médio | Sidebar + Dashboard |
| 6 | **`maintenance_action_suggestions` nunca lido** — trigger gera sugestões que ninguém consome | 🟡 Médio | Frontend |
| 7 | **`proxima_execucao` nunca atualizado** — campo existe mas ninguém escreve nele após fechar O.S. | 🔴 Crítico | Planos |
| 8 | **Checklist técnico ignorado no fechamento** — plano tem checklist JSONB, mas FecharOS usa checklist genérico (mecânico selecionado, horário válido) | 🟡 Médio | FecharOS.tsx |
| 9 | **Batch generation só para lubrificação** — `useGenerateExecucoesNow` existe em `useLubrificacao.ts` mas não em preventivas | 🟡 Médio | Hooks |

---

## PARTE 2 — MODELO CONCEITUAL: MÁQUINA DE ESTADOS

### 2.1 Ciclo de Vida de uma Manutenção Programada

O conceito central é que **todo tipo de manutenção programada** (preventiva, lubrificação, inspeção, preditiva) segue exatamente a mesma máquina de estados:

```
                           ┌──────────────────────────────────────────┐
                           │    PLANO (entidade permanente)           │
                           │    • frequência                          │
                           │    • equipamento                         │
                           │    • checklist                           │
                           │    • próxima execução                    │
                           └──────────────┬───────────────────────────┘
                                          │
                                   [proxima_execucao se aproxima]
                                          │
                                          ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │  ESTADO 1: AGENDADO                                                  │
   │  maintenance_schedule.status = 'programado'                          │
   │  Visível no calendário como 🔵 futuro                                │
   │                                                                      │
   │  Gatilho de saída:                                                   │
   │  • (data - tolerancia_antes) ≤ hoje → vai para ALERTADO              │
   │  • operador clica "Emitir O.S." antecipado → vai para EM EMISSÃO    │
   └───────────────────────────────┬──────────────────────────────────────┘
                                   │
                  [proxima_execucao - tolerancia ≤ hoje]
                                   │
                                   ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │  ESTADO 2: ALERTADO                                                  │
   │  maintenance_schedule.status = 'alertado'                            │
   │  Visível no calendário como 🟡 próximo                               │
   │  Badge na sidebar: "3 manutenções vencendo"                          │
   │  Notificação: toast + banner no Dashboard                            │
   │                                                                      │
   │  Gatilho de saída:                                                   │
   │  • operador clica "Emitir O.S." → vai para EM EMISSÃO               │
   │  • data + tolerancia_depois < hoje → vai para VENCIDO               │
   └───────────────────────────────┬──────────────────────────────────────┘
                                   │
                        [operador decide emitir]
                                   │
                                   ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │  ESTADO 3: EM EMISSÃO (O.S. GERADA)                                 │
   │  maintenance_schedule.status = 'emitido'                             │
   │  execucoes_{tipo}.status = 'PENDENTE'                                │
   │  execucoes_{tipo}.os_gerada_id = <ID da O.S.>                       │
   │  ordens_servico criada com tipo correto                              │
   │                                                                      │
   │  Neste ponto, o sistema gerou:                                       │
   │  ├── 1 registro em execucoes_preventivas/lubrificacao (PENDENTE)     │
   │  ├── 1 O.S. pré-preenchida (ABERTA) vinculada à execução            │
   │  └── Ficha impressa: O.S. + Ficha de Serviço Programado             │
   │                                                                      │
   │  Gatilho de saída:                                                   │
   │  • mecânico inicia → vai para EM EXECUÇÃO                           │
   │  • operador fecha O.S. → vai para CONCLUÍDO                         │
   └───────────────────────────────┬──────────────────────────────────────┘
                                   │
                       [mecânico executa o serviço]
                                   │
                                   ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │  ESTADO 4: EM EXECUÇÃO                                               │
   │  execucoes_{tipo}.status = 'EM_EXECUCAO'                             │
   │  ordens_servico.status = 'EM_ANDAMENTO'                              │
   │  (opcional: atualizado pelo app mecânico)                            │
   │                                                                      │
   │  Gatilho de saída:                                                   │
   │  • operador fecha O.S. no FecharOS.tsx → vai para CONCLUÍDO         │
   └───────────────────────────────┬──────────────────────────────────────┘
                                   │
                     [operador fecha a O.S. no sistema]
                                   │
                                   ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │  ESTADO 5: CONCLUÍDO + CHECKLIST                                     │
   │                                                                      │
   │  Ao fechar a O.S., o sistema:                                        │
   │                                                                      │
   │  5a. DETECTA a origem programada                                     │
   │      └─ SELECT execucoes_{tipo} WHERE os_gerada_id = <os.id>        │
   │      └─ Se encontrou: sabe o plano_id e o tipo                      │
   │                                                                      │
   │  5b. APRESENTA o checklist técnico do plano                          │
   │      └─ Carrega plano.checklist (JSONB)                             │
   │      └─ Cada item: ☑ OK / ☐ NOK / N/A + observação                 │
   │      └─ Itens obrigatórios bloqueiam fechamento se NOK               │
   │                                                                      │
   │  5c. FECHA ATOMICAMENTE                                              │
   │      ├─ execucoes_{tipo}.status = 'CONCLUIDO'                       │
   │      ├─ execucoes_{tipo}.tempo_real_min = tempo da O.S.             │
   │      ├─ execucoes_{tipo}.checklist = respostas do operador           │
   │      ├─ plano.ultima_execucao = NOW()                               │
   │      ├─ plano.proxima_execucao = calcular(frequencia)                │
   │      ├─ maintenance_schedule.status = 'executado'                    │
   │      ├─ maintenance_schedule.data_programada = nova próxima          │
   │      └─ O.S. fechada normalmente (RPC existente)                     │
   │                                                                      │
   │  5d. CICLO RECOMEÇA                                                  │
   │      └─ Nova data programada já aparece no calendário                │
   │      └─ Quando essa data se aproximar → ESTADO 1 novamente          │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────────────────┐
   │  ESTADO ALTERNATIVO: VENCIDO                                         │
   │  maintenance_schedule.status = 'vencido'                             │
   │  Visível no calendário como 🔴 vencido                               │
   │  Badge na sidebar: "⚠ 2 manutenções VENCIDAS"                       │
   │  Notificação: alert crítico no Dashboard                             │
   │                                                                      │
   │  Gatilho de saída:                                                   │
   │  • operador emite O.S. atrasada → vai para EM EMISSÃO               │
   │  • operador reagenda → volta para AGENDADO (com justificativa)       │
   └──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Por Que Máquina de Estados?

1. **Previsibilidade** — Cada componente do sistema só precisa saber em que estado está. Não precisa inferir "se tem O.S." ou "se a data já passou"
2. **Auditoria** — A transição entre estados é registrada com timestamp + operador
3. **Universalidade** — Funciona igual para preventiva, lubrificação, inspeção, preditiva
4. **Extensibilidade** — Novos estados (ex: "APROVAÇÃO_GERENCIA") são facilmente adicionáveis

---

## PARTE 3 — ARQUITETURA DA SOLUÇÃO

### 3.1 Visão Macro — Fluxo Unificado

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   ENTRADA                    DECISÃO              EXECUÇÃO           FECHAMENTO   │
│                                                                                  │
│   ┌─────────┐            ┌────────────┐        ┌──────────┐      ┌────────────┐ │
│   │ ALERTA  │───click───▸│ CALENDÁRIO │──emit──▸│   O.S.   │─────▸│  FECHAR   │ │
│   │ sidebar │            │ ou Detalhe │        │ + FICHA  │      │   O.S.    │ │
│   │ badge   │            │ do plano   │        │ + EXEC   │      │ + CHECK   │ │
│   └─────────┘            └────────────┘        └──────────┘      └─────┬──────┘ │
│       ▲                                                                │        │
│       │                                                                │        │
│       │                      ┌──────────────────────────────────┐      │        │
│       └──────────────────────│  RETROALIMENTAÇÃO AUTOMÁTICA     │◂─────┘        │
│                              │  • plano.proxima_execucao +=freq │                │
│                              │  • schedule recalculado           │                │
│                              │  • badge atualizado               │                │
│                              └──────────────────────────────────┘                │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Estrutura das Mudanças

#### Camada 1 — Backend (RPC Expandido)

**O que mudar:** Expandir `close_os_with_execution_atomic` para aceitar um parâmetro opcional `p_scheduled_context`:

```sql
-- NOVO PARÂMETRO OPCIONAL:
p_scheduled_context JSONB DEFAULT NULL
-- Formato quando presente:
-- {
--   "tipo": "preventiva" | "lubrificacao" | "inspecao" | "preditiva",
--   "execucao_id": "uuid da execucao_{tipo}",
--   "plano_id": "uuid do plano",
--   "checklist_respostas": [{ "label": "...", "ok": true, "obs": "..." }],
--   "frequencia_dias": 30
-- }
```

**Novo bloco atômico no final do RPC (dentro da mesma transaction):**

```sql
IF p_scheduled_context IS NOT NULL THEN
  -- 1. Atualiza execução programada
  -- 2. Atualiza plano (ultima_execucao, proxima_execucao)
  -- 3. Atualiza maintenance_schedule
END IF;
```

**Vantagem:** Zero breaking change. O.S. corretivas continuam funcionando sem passar `p_scheduled_context`. Manutenções programadas passam o contexto e tudo fecha atomicamente.

#### Camada 2 — Lógica (Hooks)

**Novo hook:** `useScheduledMaintenanceContext`

```typescript
// Responsabilidade:
// 1. Dado um os_id, busca se existe execucao_{tipo} com os_gerada_id = os_id
// 2. Se encontrar, carrega o plano associado e seu checklist
// 3. Retorna { execucao, plano, checklist, tipo } ou null

export function useScheduledMaintenanceContext(osId: string | null) {
  // SELECT execucoes_preventivas WHERE os_gerada_id = osId
  // UNION
  // SELECT execucoes_lubrificacao WHERE os_gerada_id = osId
  // → Se encontrou, busca o plano e seu checklist
}
```

**Modificar:** `handleEmitirOS` em Programacao.tsx para:
1. Criar execução programada com `os_gerada_id` preenchido
2. Mapear tipo corretamente (`lubrificacao` → `LUBRIFICACAO`)

#### Camada 3 — UI (Componentes)

**Modificar:** FecharOS.tsx
- Usar `useScheduledMaintenanceContext` para detectar se a O.S. veio de manutenção programada
- Se sim: renderizar seção extra de **Checklist Técnico** entre a aba de execução e o botão Fechar
- Passar `p_scheduled_context` no payload do RPC

**Modificar:** AppSidebar.tsx
- Badge com contagem de manutenções vencendo/vencidas

---

## PARTE 4 — ESPECIFICAÇÃO DETALHADA DOS COMPONENTES

### 4.1 Emissão de O.S — O Momento Chave

Quando o operador clica "Emitir O.S." no calendário ou no detalhe do plano:

```
┌─ MODAL DE CONFIRMAÇÃO DE EMISSÃO ──────────────────────────────────────────┐
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════╗          │
│  ║  Emitir Ordem de Serviço Programada                          ║          │
│  ╚═══════════════════════════════════════════════════════════════╝          │
│                                                                             │
│  ┌─ Dados do Plano ──────────────────────────────────────────────┐         │
│  │  Código:       PRV-001                                        │         │
│  │  Plano:        Preventiva Trimestral — Torno CNC #3           │         │
│  │  Equipamento:  TAG-0045 • Torno CNC Romi Galaxy 20            │         │
│  │  Frequência:   90 dias                                        │         │
│  │  Última exec:  15/01/2026                                     │         │
│  │  Vencimento:   15/04/2026 (HOJE)                              │         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                                                             │
│  ┌─ A O.S. será gerada com: ─────────────────────────────────────┐         │
│  │                                                                │         │
│  │  Tipo:          PREVENTIVA                                     │         │
│  │  Prioridade:    [MEDIA ▾]  (editável)                         │         │
│  │  Equipamento:   TAG-0045 • Torno CNC Romi Galaxy 20           │         │
│  │  Descrição:     "Preventiva trimestral conforme plano PRV-001" │         │
│  │  Mecânico:      [Selecionar mecânico ▾]  (opcional)           │         │
│  │  Tempo est.:    120 min (do plano)                             │         │
│  │                                                                │         │
│  │  ┌─ Serviços/Atividades do plano (pré-carregadas): ────────┐ │         │
│  │  │  1. Verificação completa de folgas nos eixos   (30 min)  │ │         │
│  │  │  2. Troca de óleo do cabeçote                  (45 min)  │ │         │
│  │  │  3. Limpeza e inspeção das guias              (25 min)  │ │         │
│  │  │  4. Teste de precisão dimensional              (20 min)  │ │         │
│  │  └──────────────────────────────────────────────────────────┘ │         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                                                             │
│  [ ] Imprimir ficha automaticamente após emissão                           │
│                                                                             │
│  ┌──────────┐  ┌──────────────────┐  ┌───────────────┐                    │
│  │ Cancelar │  │ Emitir O.S.      │  │ Emitir + Print│                    │
│  └──────────┘  └──────────────────┘  └───────────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**O que acontece ao clicar "Emitir O.S.":**

```
PASSO 1 — Cria O.S. pré-preenchida
  INSERT ordens_servico {
    tipo: 'PREVENTIVA',          -- mapeado corretamente do plano
    prioridade: selecionada,
    tag: equipamento.tag,
    equipamento: equipamento.nome,
    solicitante: 'Programação de Manutenção',
    problema: atividades concatenadas com quebra de linha,
    tempo_estimado: plano.tempo_estimado_min,
    status: 'ABERTA'
  }
  → Retorna os_id, numero_os

PASSO 2 — Cria registro de execução programada
  INSERT execucoes_{tipo} {
    plano_id: schedule.origem_id,
    empresa_id: tenantId,
    data_execucao: schedule.data_programada,
    status: 'PENDENTE',
    os_gerada_id: os_id,               ← AQUI É A VINCULAÇÃO
    checklist: cópia do plano.checklist ← SNAPSHOT do checklist
  }

PASSO 3 — Atualiza schedule
  UPDATE maintenance_schedule SET
    status = 'emitido'
  WHERE id = schedule.id

PASSO 4 — Impressão (se selecionado)
  Abre ficha em nova janela com:
  • Página 1: O.S. (formato atual)
  • Página 2: Ficha de Serviço Programado (com checklist do plano)
```

### 4.2 Fechamento da O.S — A Retroalimentação

Quando o operador fecha uma O.S. no FecharOS.tsx:

```
┌─ FLUXO DE FECHAMENTO (MELHORADO) ──────────────────────────────────────────┐
│                                                                             │
│  ETAPA EXISTENTE (sem alteração):                                           │
│  ├── Tab "Execução": mecânico, horários, pausas, serviço                   │
│  ├── Tab "Materiais": materiais utilizados, custo terceiros                │
│  └── Checklist genérico: horário válido, serviço >20 chars                 │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════╗          │
│  ║  NOVA SEÇÃO (só aparece se O.S. veio de manutenção          ║          │
│  ║  programada — detectado via os_gerada_id)                    ║          │
│  ╚═══════════════════════════════════════════════════════════════╝          │
│                                                                             │
│  ┌─ Checklist Técnico: Preventiva PRV-001 ───────────────────────┐         │
│  │                                                                │         │
│  │  Origem:  Plano PRV-001 — Preventiva Trimestral Torno CNC #3  │         │
│  │                                                                │         │
│  │  ┌─────────────────────────────────┬──────┬─────┬─────┬──────┐│         │
│  │  │ Item                            │  OK  │ NOK │ N/A │ Obs  ││         │
│  │  ├─────────────────────────────────┼──────┼─────┼─────┼──────┤│         │
│  │  │ Verificar folgas eixos X/Y/Z   │  ●   │  ○  │  ○  │ [  ] ││         │
│  │  │ Trocar óleo cabeçote SAE 68    │  ●   │  ○  │  ○  │ [  ] ││         │
│  │  │ Limpar e inspecionar guias     │  ○   │  ●  │  ○  │ [ok] ││         │
│  │  │ Teste precisão ± 0.01mm        │  ●   │  ○  │  ○  │ [  ] ││         │
│  │  └─────────────────────────────────┴──────┴─────┴─────┴──────┘│         │
│  │                                                                │         │
│  │  Progresso: ████████████░░ 75% (3/4 OK)                       │         │
│  │  ⚠ Item "Limpar guias" marcado como NOK — requer observação  │         │
│  │                                                                │         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                                                             │
│  Ao clicar "Fechar O.S.":                                                  │
│  ├── 1. Valida: todos itens obrigatórios OK ou com justificativa?          │
│  ├── 2. RPC expandido fecha tudo atomicamente:                             │
│  │   ├── Fecha O.S. (existente)                                            │
│  │   ├── Registra execucao_os (existente)                                  │
│  │   ├── execucoes_{tipo}.status = 'CONCLUIDO' (NOVO)                     │
│  │   ├── execucoes_{tipo}.checklist = respostas (NOVO)                     │
│  │   ├── execucoes_{tipo}.tempo_real_min = tempo da O.S. (NOVO)           │
│  │   ├── plano.ultima_execucao = NOW() (NOVO)                             │
│  │   ├── plano.proxima_execucao = NOW() + frequencia (NOVO)               │
│  │   └── schedule.status = 'executado', data_programada = prox (NOVO)     │
│  └── 3. Ciclo recomeça automaticamente                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Sistema de Alertas — A Entrada do Fluxo

```
┌─ HIERARQUIA DE ALERTAS ────────────────────────────────────────────────────┐
│                                                                             │
│  NÍVEL 1 — Sidebar Badge (sempre visível)                                  │
│  ┌──────────────────────────────┐                                          │
│  │  📋 Programação        ⚠ 5  │  ← Total de alertados + vencidos         │
│  │  🔧 Preventivas        🔴 2  │  ← Vencidas em vermelho                  │
│  │  🛢️ Lubrificações      🟡 3  │  ← Alertadas em amarelo                  │
│  └──────────────────────────────┘                                          │
│                                                                             │
│  NÍVEL 2 — Dashboard Cards (QuickActions + AlertsPanel)                    │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────┐    │
│  │  Preventivas  [🔴 2 vencidas]│  │  ⚠ PRV-001 venceu há 3 dias     │    │
│  │  [Ir para Programação →]     │  │  ⚠ LUB-007 vence amanhã         │    │
│  └──────────────────────────────┘  │  ⚠ INS-003 vence em 2 dias      │    │
│                                     └──────────────────────────────────┘    │
│                                                                             │
│  NÍVEL 3 — NotificationCenter (toast na abertura)                          │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  🔔 Você tem 2 manutenções vencidas e 3 próximas do vencimento  │      │
│  │     [Ver Programação]  [Dispensar]                                │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                             │
│  Fonte de dados unificada:                                                  │
│  SELECT COUNT(*) FROM maintenance_schedule                                  │
│  WHERE empresa_id = $1                                                      │
│    AND status IN ('programado', 'alertado')                                │
│    AND data_programada <= NOW() + INTERVAL '7 days'                        │
│  GROUP BY                                                                   │
│    CASE WHEN data_programada < NOW() THEN 'vencido'                        │
│         ELSE 'proximo' END                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Ficha Impressa — O.S. + Ficha de Serviço Programado

A impressão atual já é bem feita. A melhoria é torná-la **composta**:

```
┌─ PÁGINA 1: ORDEM DE SERVIÇO (formato atual, sem mudança) ──────────────────┐
│  Logo | O.S. nº 1234 | Tipo: PREVENTIVA                                    │
│  Equipamento: TAG-0045 Torno CNC                                            │
│  Serviço solicitado: ...                                                     │
│  Mecânico: ___________  Assinatura: ___________                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ PÁGINA 2: FICHA DE SERVIÇO PROGRAMADO (NOVA) ─────────────────────────────┐
│                                                                              │
│  FICHA DE MANUTENÇÃO PREVENTIVA — PRV-001                                   │
│  Plano: Preventiva Trimestral — Torno CNC #3                                │
│  O.S. Vinculada: nº 1234                                                     │
│                                                                              │
│  ┌────┬─────────────────────────────────┬────┬─────┬─────┬────────────────┐ │
│  │ #  │ Atividade / Serviço             │ OK │ NOK │ N/A │ Observação     │ │
│  ├────┼─────────────────────────────────┼────┼─────┼─────┼────────────────┤ │
│  │ 1  │ Verificar folgas eixos X/Y/Z   │ □  │ □   │ □   │ ______________ │ │
│  │ 2  │ Trocar óleo cabeçote SAE 68    │ □  │ □   │ □   │ ______________ │ │
│  │ 3  │ Limpar e inspecionar guias     │ □  │ □   │ □   │ ______________ │ │
│  │ 4  │ Teste precisão ± 0.01mm        │ □  │ □   │ □   │ ______________ │ │
│  ├────┼─────────────────────────────────┼────┼─────┼─────┼────────────────┤ │
│  │    │ (linhas em branco extras)       │ □  │ □   │ □   │ ______________ │ │
│  └────┴─────────────────────────────────┴────┴─────┴─────┴────────────────┘ │
│                                                                              │
│  Executor: _________________  Assinatura: _________________                  │
│  Responsável: ______________  Assinatura: _________________                  │
│  Data: ___/___/______                                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTE 5 — FLUXO COMPLETO PONTA-A-PONTA (EXEMPLO REAL)

### Cenário: Preventiva trimestral do Torno CNC vencendo

```
DIA 1 — Terça-feira, 08:00
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  João (Planejador PCM) faz login.

  → NotificationCenter exibe toast:
    "🔔 2 manutenções vencendo esta semana"

  → Sidebar mostra badge:
    📋 Programação  ⚠ 2

  João clica na sidebar "Programação".

  → Calendário abre no modo semana.
  → Evento "PRV-001 • Preventiva Torno CNC" aparece em 🟡 amarelo (vence amanhã).
  → Evento "LUB-007 • Lubrificação Compressor" aparece em 🟡 amarelo.

  João clica em "PRV-001".
  → Modal abre com dados do plano:
    - Equipamento: TAG-0045 Torno CNC Romi Galaxy 20
    - Última execução: 15/01/2026
    - Vencimento: 16/04/2026 (amanhã)
    - 4 atividades listadas

  João confere e clica "Emitir O.S."
  → Modal de confirmação aparece com pré-preenchimento
  → João ajusta prioridade para ALTA (máquina crítica)
  → Clica "Emitir + Print"

  → Sistema:
    1. Cria O.S. nº 1345 (tipo PREVENTIVA, status ABERTA)
    2. Cria execucao_preventiva (status PENDENTE, os_gerada_id = 1345)
    3. Marca schedule como 'emitido'
    4. Abre janela de impressão com 2 páginas:
       - Pág 1: O.S. nº 1345
       - Pág 2: Ficha PRV-001 com checklist

  João imprime e entrega ao Carlos (mecânico).


DIA 2 — Quarta-feira
━━━━━━━━━━━━━━━━━━━━
  Carlos executa a preventiva no Torno CNC.
  Preenche a ficha impressa à mão.
  Devolve a ficha ao João.


DIA 2 — Quarta-feira, 16:00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  João abre FecharOS.tsx, seleciona O.S. nº 1345.

  → Tab "Execução": preenche mecânico (Carlos), horários, serviço executado
  → Tab "Materiais": adiciona 2L de óleo SAE 68

  → NOVA SEÇÃO aparece automaticamente:
    "📋 Checklist Técnico — Preventiva PRV-001"
    ┌──────────────────────────────┬──────┬─────┬─────┐
    │ Verificar folgas eixos       │  ●   │  ○  │  ○  │
    │ Trocar óleo cabeçote SAE 68  │  ●   │  ○  │  ○  │
    │ Limpar e inspecionar guias   │  ●   │  ○  │  ○  │
    │ Teste precisão ± 0.01mm      │  ●   │  ○  │  ○  │
    └──────────────────────────────┴──────┴─────┴─────┘
    Progresso: ████████████████ 100%

  João confirma todos OK e clica "Fechar O.S."

  → RPC atômico executa em UMA ÚNICA transação:
    1. Fecha O.S. nº 1345 → status 'FECHADA'
    2. Registra execucao_os com tempos e custos
    3. Atualiza execucao_preventiva → status 'CONCLUIDO', checklist respondido
    4. Atualiza plano PRV-001:
       - ultima_execucao = 16/04/2026
       - proxima_execucao = 15/07/2026 (+90 dias)
    5. Atualiza maintenance_schedule:
       - status = 'executado' (para a ocorrência atual)
       - data_programada = 15/07/2026 (próxima)


RESULTADO
━━━━━━━━━
  → Calendário: PRV-001 em 16/04 aparece ✅ verde (executado)
  → Calendário: PRV-001 em 15/07 aparece 🔵 azul (futuro)
  → Histórico do plano: mostra execução completa com O.S. vinculada
  → Dashboard: aderência preventiva atualizada
  → Sidebar: badge diminuiu (-1)
```

---

## PARTE 6 — IMPLEMENTAÇÃO TÉCNICA DETALHADA

### 6.1 Alterações no Backend (SQL)

| Alteração | Arquivo | Complexidade |
|-----------|---------|-------------|
| Expandir RPC `close_os_with_execution_atomic` com `p_scheduled_context` | Nova migration | Média |
| Corrigir mapeamento tipo no frontend | Programacao.tsx L38 | Trivial |

### 6.2 Alterações na Lógica (Hooks)

| Hook | Alteração | Complexidade |
|------|-----------|-------------|
| `useScheduledMaintenanceContext` | **NOVO** — busca contexto programado dado um os_id | Baixa |
| `useMaintenanceAlertCounts` | **NOVO** — contagens de alertados/vencidos para sidebar/dashboard | Baixa |
| `handleEmitirOS` (Programacao.tsx) | Expandir para criar execução + vincular os_gerada_id | Média |

### 6.3 Alterações na UI

| Componente | Alteração | Complexidade |
|-----------|-----------|-------------|
| Programacao.tsx | Modal de emissão expandido com preview do plano | Média |
| Programacao.tsx L38 | Fix: `'lubrificacao'` → `'LUBRIFICACAO'` | Trivial |
| FecharOS.tsx | Seção de Checklist Técnico (condicional) | Média |
| FecharOS.tsx | Passar `p_scheduled_context` no RPC | Baixa |
| AppSidebar.tsx | Badge com contagem de manutenções alertadas/vencidas | Baixa |
| Dashboard.tsx | Ativar QuickActions e AlertsPanel (já preparados) | Baixa |
| handlePrintFicha | Página 2 com checklist do plano na impressão | Média |

### 6.4 Tabela de Dependências

```
Ordem de implementação (respeitando dependências):

1. FIX mapeamento tipo (Programacao.tsx)           ← zero dependência
2. HOOK useScheduledMaintenanceContext              ← zero dependência
3. HOOK useMaintenanceAlertCounts                   ← zero dependência
4. EXPAND handleEmitirOS (criar execução+vínculo)  ← depende do item 2
5. EXPAND RPC close_os_with_execution_atomic        ← depende do item 2
6. EXPAND FecharOS (checklist técnico + contexto)   ← depende dos itens 2 e 5
7. SIDEBAR badge                                    ← depende do item 3
8. DASHBOARD alertas                                ← depende do item 3
9. FICHA IMPRESSA página 2                          ← depende do item 4
```

---

## PARTE 7 — O QUE NÃO MUDAR

Para manter disciplina de engenharia:

| Componente | Status | Razão |
|-----------|--------|-------|
| Estrutura de tabelas | ✅ Manter | `os_gerada_id`, `checklist`, `proxima_execucao` já existem |
| RPC existente | ✅ Manter | Apenas adicionar parâmetro opcional |
| Ficha de impressão pág 1 | ✅ Manter | Já funciona bem |
| Lógica de recorrência | ✅ Manter | `useMaintenanceScheduleExpanded` está correto |
| Calendário visual | ✅ Manter | Cores e layout estão bons |
| Execução manual pelo painel | ✅ Manter | Continua como alternativa (sem O.S.) |

---

## CONCLUSÃO

Esta proposta transforma um sistema que tem **todas as peças mas não as conecta** em um **motor unificado de execução** com ciclo fechado. O esforço principal é criar 2 hooks novos, expandir o RPC com 1 parâmetro opcional, e adicionar 1 seção condicional no FecharOS. Não é uma reescrita — é uma **costura cirúrgica** das pontas que já existem.

A máquina de estados garante que qualquer tipo de manutenção programada (preventiva, lubrificação, inspeção, preditiva) siga o mesmo fluxo previsível e auditável: **AGENDADO → ALERTADO → EMITIDO → EM EXECUÇÃO → CONCLUÍDO → próximo ciclo.**