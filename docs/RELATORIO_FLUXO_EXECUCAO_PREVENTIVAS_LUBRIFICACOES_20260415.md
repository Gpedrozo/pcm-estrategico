# RELATÓRIO: Análise do Fluxo de Execução — Preventivas & Lubrificações
**Data:** 15/04/2026  
**Escopo:** Análise completa do ciclo de vida de atividades programadas (Preventivas, Lubrificações) desde o alerta até o fechamento da O.S.

---

## 1. ESTADO ATUAL DO SISTEMA

### 1.1 Tabelas Envolvidas

| Tabela | Papel |
|--------|-------|
| `planos_preventivos` | Planos-mestre com frequência, checklist, tolerâncias |
| `planos_lubrificacao` | Planos-mestre com periodicidade, pontos, lubrificantes |
| `maintenance_schedule` | Agenda unificada de todas as manutenções programadas |
| `execucoes_preventivas` | Registros de cada execução de preventiva |
| `execucoes_lubrificacao` | Registros de cada execução de lubrificação |
| `ordens_servico` | Ordens de serviço (todos os tipos) |
| `execucoes_os` | Registro atômico de execução ao fechar O.S. |

### 1.2 Fluxo Atual — Passo a Passo

```
┌──────────────────────────────────────────────────────────────────┐
│                    CICLO ATUAL DO SISTEMA                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CRIAÇÃO DO PLANO                                             │
│     └─ Preventiva.tsx / Lubrificacao.tsx                         │
│     └─ Cria registro em planos_preventivos / planos_lubrificacao │
│     └─ Cria entrada em maintenance_schedule                      │
│     └─ ✅ FUNCIONANDO                                            │
│                                                                  │
│  2. VISUALIZAÇÃO NO CALENDÁRIO                                   │
│     └─ Programacao.tsx exibe eventos do mês                      │
│     └─ Calcula recorrências automáticas (client-side)            │
│     └─ Aplica cores: 🔴 vencido / 🟡 próximo / 🔵 futuro       │
│     └─ ✅ FUNCIONANDO                                            │
│                                                                  │
│  3. EMISSÃO DE O.S. VIA CALENDÁRIO                               │
│     └─ Botão "Emitir O.S." no evento do calendário               │
│     └─ Cria O.S. com tipo mapeado (PREVENTIVA/LUBRIFICACAO)      │
│     └─ Marca schedule como status='emitido'                      │
│     └─ ⚠️ PARCIAL — não vincula O.S. à execução                 │
│                                                                  │
│  4. EXECUÇÃO (registro manual)                                   │
│     └─ Via painel de detalhe do plano (aba "Execução")           │
│     └─ Cria registro em execucoes_preventivas/lubrificacao       │
│     └─ ⚠️ DESCONECTADO — não sabe se tem O.S. associada         │
│                                                                  │
│  5. FECHAMENTO DA O.S.                                           │
│     └─ FecharOS.tsx → RPC close_os_with_execution_atomic         │
│     └─ Fecha O.S. + registra execucao_os + materiais             │
│     └─ ❌ NÃO ATUALIZA preventiva/lubrificação                  │
│     └─ ❌ NÃO MARCA schedule como 'executado'                   │
│     └─ ❌ NÃO ATUALIZA proxima_execucao dos planos              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. PROBLEMAS IDENTIFICADOS (GAPS)

### 🔴 GAP 1: Fechamento da O.S. não "fecha o ciclo" da preventiva/lubrificação

**Situação:** Quando o usuário fecha uma O.S. do tipo PREVENTIVA ou LUBRIFICACAO, o sistema:
- ✅ Fecha a O.S.
- ✅ Registra o `execucoes_os` (tempos, custos, materiais)
- ❌ **NÃO** marca a execução preventiva/lubrificação como `CONCLUIDO`
- ❌ **NÃO** atualiza `planos_preventivos.ultima_execucao`
- ❌ **NÃO** recalcula `planos_preventivos.proxima_execucao`
- ❌ **NÃO** atualiza `maintenance_schedule.status` para `'executado'`

**Impacto:** O plano preventivo/lubrificação continua aparecendo como "vencido" ou "pendente" no calendário mesmo após a O.S. ter sido fechada. O histórico de execuções fica incompleto.

---

### 🔴 GAP 2: Emissão de O.S. não cria vínculo rastreável

**Situação:** Quando o usuário emite uma O.S. a partir do calendário (`handleEmitirOS`):
- ✅ Cria a O.S. com tipo correto
- ✅ Marca `maintenance_schedule.status = 'emitido'`
- ❌ **NÃO** preenche `execucoes_preventivas.os_gerada_id`
- ❌ **NÃO** cria um registro em `execucoes_preventivas` ou `execucoes_lubrificacao`

**Impacto:** Não existe rastreabilidade bidirecional. Se olharmos o plano preventivo, não sabemos qual O.S. foi gerada. Se olharmos a O.S., não sabemos de qual plano veio.

---

### 🟡 GAP 3: Lubrificação é mapeada como tipo 'PREVENTIVA' na O.S.

**Situação:** A função `mapMaintenanceTipoToOsTipo()` converte:
- `'preventiva'` → `'PREVENTIVA'` ✅
- `'lubrificacao'` → `'PREVENTIVA'` ⚠️ (deveria ser `'LUBRIFICACAO'`?)

**Impacto:** Perde-se a diferenciação entre O.S. originada de preventiva vs. lubrificação nos relatórios e filtros.

---

### 🟡 GAP 4: Alertas de vencimento existem mas são passivos

**Situação:**
- O calendário mostra cores (vermelho = vencido, amarelo = próximo)
- Existe trigger `trg_preventiva_overdue_generate_suggestion()` que cria sugestões em `maintenance_action_suggestions`
- Dashboard tem badge `planosVencidos` mas está sempre zerado (não alimentado)

**Impacto:** Não existe alerta proativo (push notification, toast, badge na sidebar) que force o responsável a agir. A informação existe mas é "escondida" dentro do calendário.

---

### 🟡 GAP 5: Execução manual e via O.S. são dois caminhos paralelos desconectados

**Situação:** Existem dois caminhos para registrar uma execução:
1. **Via painel do plano** (aba "Execução"): cria `execucoes_preventivas` diretamente
2. **Via O.S.**: emite O.S. → executa → fecha → cria `execucoes_os`

**Impacto:** Os dois caminhos não se cruzam. Uma execução registrada por O.S. não aparece no histórico do plano, e vice-versa.

---

### 🟡 GAP 6: Checklist não é obrigatório ao fechar execução programada

**Situação:**
- `planos_preventivos.checklist` (JSONB) pode conter itens de verificação
- `execucoes_preventivas.checklist` (JSONB) permite checklist customizado por execução
- Mas ao **fechar a O.S.**, o checklist validado é genérico (campo preenchido? tempo registrado?) — não usa o checklist do plano preventivo

**Impacto:** O checklist técnico do plano preventivo não é validado no fechamento da O.S.

---

## 3. SUA IDEIA — AVALIAÇÃO TÉCNICA

### A Ideia Proposta:

```
ALERTA VENCE → Responsável vê → Clica no alerta → Vai ao calendário/plano →
→ "Deseja emitir O.S.?" → SIM → Gera O.S. PRÉ-PREENCHIDA + Ficha PRV →
→ Mecânico executa → Fecha O.S. → Preventiva marcada como EXECUTADA →
→ Sistema pede OK no CHECKLIST
```

### Veredicto: ✅ FAZ TOTAL SENTIDO — É o ciclo correto!

**Por que faz sentido:**

1. **Padrão de mercado:** Software de PCM como SAP PM, Engeman, Fracttal, Manusis4 e todos os sistemas sérios seguem exatamente esse ciclo. A O.S. é o documento que "oficializa" a atividade programada.

2. **Rastreabilidade completa:** Cria o vínculo bidirecional que está faltando hoje:
   - Plano → Execução → O.S. → Fechamento → Plano atualizado
   
3. **Auditabilidade:** Cada execução de preventiva/lubrificação tem uma O.S. com número, responsável, tempos, custos. Essencial para ISO 55000, certificações e auditorias.

4. **Conceito unificado:** Funciona para TODOS os tipos programados:
   - Preventivas
   - Lubrificações
   - Preditivas
   - Inspeções

5. **O sistema JÁ TEM 80% da infraestrutura:**
   - ✅ `maintenance_schedule` com status e recorrência
   - ✅ `handleEmitirOS()` funcional
   - ✅ `os_gerada_id` como FK nas tabelas de execução
   - ✅ RPC de fechamento atômico
   - ✅ Checklist JSONB nos planos
   - ❌ Falta apenas "fechar o ciclo" (conectar os pontas)

---

## 4. FLUXO IDEAL PROPOSTO

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     FLUXO IDEAL (PROPOSTA)                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ① ALERTA PROATIVO                                                       │
│     └─ Badge/Toast na sidebar: "3 preventivas vencendo esta semana"      │
│     └─ Click leva ao calendário filtrado OU direto ao plano vencido       │
│     └─ Alimentado por: maintenance_schedule WHERE                        │
│        proxima_execucao BETWEEN NOW() AND NOW() + tolerancia_dias        │
│                                                                          │
│  ② DECISÃO DE EMISSÃO                                                    │
│     └─ No calendário ou no detalhe do plano, botão: "Emitir O.S."       │
│     └─ Modal de confirmação: "Deseja emitir O.S. para PRV-001?"         │
│     └─ Opção: "Emitir e Imprimir" / "Emitir" / "Cancelar"              │
│                                                                          │
│  ③ GERAÇÃO AUTOMÁTICA DA O.S. PRÉ-PREENCHIDA                            │
│     └─ Tipo: PREVENTIVA / LUBRIFICACAO / INSPECAO / PREDITIVA           │
│     └─ Pré-preenche:                                                     │
│        ├─ Equipamento (tag + nome do plano)                              │
│        ├─ Problema: "Manutenção preventiva conforme plano PRV-001"       │
│        ├─ Serviços/atividades do plano como lista na descrição           │
│        ├─ Materiais previstos (se houver)                                │
│        ├─ Tempo estimado do plano                                        │
│        ├─ Mecânico sugerido (do plano, se definido)                      │
│        └─ Prioridade baseada em criticidade do plano                     │
│                                                                          │
│  ④ CRIA EXECUÇÃO + VINCULA                                               │
│     └─ INSERT execucoes_preventivas/lubrificacao                         │
│        ├─ status = 'PENDENTE'                                            │
│        ├─ os_gerada_id = ID da O.S. criada                              │
│        └─ checklist = cópia do checklist do plano                        │
│     └─ UPDATE maintenance_schedule SET status = 'emitido'                │
│                                                                          │
│  ⑤ FICHA DE PREVENTIVA (impressa junto da O.S.)                         │
│     └─ Header: Plano + Código + Equipamento                             │
│     └─ Body: Atividades do plano com checkbox                           │
│     └─ Footer: Campo de assinatura, data, observações                   │
│     └─ Gerada como PDF junto ao PDF da O.S.                             │
│                                                                          │
│  ⑥ EXECUÇÃO NO CAMPO                                                     │
│     └─ Mecânico executa conforme O.S.                                    │
│     └─ UPDATE execucoes_preventivas SET status = 'EM_EXECUCAO'           │
│     └─ (opcional: app mecânico atualiza em tempo real)                   │
│                                                                          │
│  ⑦ FECHAMENTO DA O.S. (enhanced)                                         │
│     └─ FecharOS.tsx detecta que O.S. veio de plano programado            │
│     └─ Adiciona step: "Confirmar Checklist da Preventiva"               │
│        ├─ Carrega execucoes_preventivas.checklist (cópia do plano)       │
│        ├─ Cada item: ☑ OK / ☐ NOK + campo observação                    │
│        ├─ Itens obrigatórios devem estar ☑ para fechar                   │
│        └─ Assinatura digital do executor                                 │
│     └─ Ao confirmar:                                                     │
│        ├─ UPDATE execucoes_preventivas SET                               │
│        │   status = 'CONCLUIDO',                                         │
│        │   tempo_real_min = <tempo da O.S.>,                             │
│        │   data_execucao = NOW()                                         │
│        ├─ UPDATE planos_preventivos SET                                  │
│        │   ultima_execucao = NOW(),                                      │
│        │   proxima_execucao = NOW() + frequencia_dias                    │
│        ├─ UPDATE maintenance_schedule SET                                │
│        │   status = 'executado',                                         │
│        │   data_programada = nova proxima_execucao                       │
│        └─ Fecha O.S. normalmente (RPC existente)                         │
│                                                                          │
│  ⑧ PÓS-EXECUÇÃO                                                         │
│     └─ Calendário mostra evento como ✅ executado (verde)                │
│     └─ Próxima ocorrência recalculada automaticamente                    │
│     └─ Histórico do plano mostra a execução completa                     │
│     └─ KPIs atualizados (aderência %, backlog, MTBF)                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. MATRIZ DE IMPLEMENTAÇÃO

### O que já existe vs. O que precisa ser feito:

| Componente | Estado Atual | Esforço |
|-----------|-------------|---------|
| Calendário com eventos coloridos | ✅ Pronto | — |
| Emissão de O.S. via calendário | ✅ Pronto (parcial) | 🟡 Médio |
| Tabela `maintenance_schedule` | ✅ Pronto | — |
| FK `os_gerada_id` nas execuções | ✅ Pronto (coluna existe) | 🟢 Baixo |
| Checklist JSONB nos planos | ✅ Pronto | — |
| RPC de fechamento atômico | ✅ Pronto | 🟡 Médio (expandir) |
| **Alerta proativo (badge/toast)** | ❌ Não existe | 🟡 Médio |
| **Vinculação O.S. ↔ Execução** | ❌ Não existe | 🟡 Médio |
| **Fechamento fecha ciclo PRV** | ❌ Não existe | 🟡 Médio |
| **Recalcular próxima_execução** | ❌ Não existe | 🟢 Baixo |
| **Checklist no fechamento O.S.** | ❌ Não existe | 🟡 Médio |
| **Ficha PRV impressa com O.S.** | ❌ Não existe | 🟡 Médio |
| **Tipo LUBRIFICACAO na O.S.** | ⚠️ Mapeado como PREVENTIVA | 🟢 Baixo |

---

## 6. PRIORIDADE SUGERIDA DE IMPLEMENTAÇÃO

### Fase 1 — Fechar o Ciclo (Crítico)
1. **Vincular O.S. ↔ Execução:** Ao emitir O.S. via calendário, criar `execucoes_preventivas/lubrificacao` com `os_gerada_id`
2. **Fechamento propagar:** Ao fechar O.S., atualizar `execucoes_preventivas.status`, `planos.ultima_execucao`, `planos.proxima_execucao`, `schedule.status`
3. **Corrigir mapeamento de tipo:** Lubrificação deve gerar O.S. tipo `LUBRIFICACAO`, não `PREVENTIVA`

### Fase 2 — Alertas e UX (Importante)
4. **Alerta proativo:** Badge na sidebar + toast ao login mostrando preventivas vencendo
5. **Checklist no fechamento:** Carregar checklist do plano ao fechar O.S. de preventiva
6. **Ficha impressa:** PDF de ficha preventiva emitido junto da O.S.

### Fase 3 — Escalar para Todos os Tipos (Evolução)
7. **Replicar para Preditivas e Inspeções:** Mesmo fluxo unificado
8. **Dashboard de Aderência:** % de preventivas executadas no prazo vs. em atraso
9. **Geração automática por agendador:** Cron/Edge Function que emite O.S. automaticamente X dias antes do vencimento

---

## 7. CONCLUSÃO

### O sistema tem uma base sólida mas o ciclo de execução está "aberto":

```
HOJE:    Plano → Calendário → O.S. → Fecha O.S. ──→ FIM (sem retroalimentação)
                                                         ❌ Plano não sabe
                                                         ❌ Schedule não atualiza
                                                         ❌ Sem rastreabilidade

IDEAL:   Plano → Calendário → O.S. → Fecha O.S. ──→ Marca execução ✅
                                                  ──→ Atualiza plano ✅
                                                  ──→ Recalcula próxima ✅
                                                  ──→ Histórico completo ✅
```

**Sua ideia está 100% correta e alinhada com boas práticas de PCM.** A infraestrutura já existe (tabelas, colunas FK, RPC). O trabalho principal é **conectar as pontas** — fazer o fechamento da O.S. retroalimentar o plano e criar o fluxo de alerta → decisão → emissão → execução → checklist → próxima ocorrência.

Estimativa: o esforço total é **médio**, pois 80% da infraestrutura já está pronta. As mudanças maiores são no `handleEmitirOS` (criar vinculação), no `close_os_with_execution_atomic` (propagar para planos), e criar o componente de alerta.