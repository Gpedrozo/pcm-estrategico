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
CICLO ATUAL DO SISTEMA

1. CRIAÇÃO DO PLANO
   └─ Preventiva.tsx / Lubrificacao.tsx
   └─ Cria registro em planos_preventivos / planos_lubrificacao
   └─ Cria entrada em maintenance_schedule
   └─ ✅ FUNCIONANDO

2. VISUALIZAÇÃO NO CALENDÁRIO
   └─ Programacao.tsx exibe eventos do mês
   └─ Calcula recorrências automáticas (client-side)
   └─ Aplica cores: vermelho vencido / amarelo próximo / azul futuro
   └─ ✅ FUNCIONANDO

3. EMISSÃO DE O.S. VIA CALENDÁRIO
   └─ Botão "Emitir O.S." no evento do calendário
   └─ Cria O.S. com tipo mapeado (PREVENTIVA/LUBRIFICACAO)
   └─ Marca schedule como status='emitido'
   └─ ⚠️ PARCIAL — não vincula O.S. à execução

4. EXECUÇÃO (registro manual)
   └─ Via painel de detalhe do plano (aba "Execução")
   └─ Cria registro em execucoes_preventivas/lubrificacao
   └─ ⚠️ DESCONECTADO — não sabe se tem O.S. associada

5. FECHAMENTO DA O.S.
   └─ FecharOS.tsx → RPC close_os_with_execution_atomic
   └─ Fecha O.S. + registra execucao_os + materiais
   └─ ❌ NÃO ATUALIZA preventiva/lubrificação
   └─ ❌ NÃO MARCA schedule como 'executado'
   └─ ❌ NÃO ATUALIZA proxima_execucao dos planos
```

---

## 2. PROBLEMAS IDENTIFICADOS (GAPS)

### GAP 1 (Crítico): Fechamento da O.S. não "fecha o ciclo"

O sistema fecha a O.S. e registra execucao_os, mas NÃO marca a execução preventiva/lubrificação como CONCLUIDO, NÃO atualiza ultima_execucao/proxima_execucao dos planos, e NÃO atualiza maintenance_schedule.status para 'executado'.

### GAP 2 (Crítico): Emissão de O.S. não cria vínculo rastreável

handleEmitirOS cria O.S. e marca schedule como 'emitido', mas NÃO preenche os_gerada_id e NÃO cria registro em execucoes_preventivas/lubrificacao.

### GAP 3 (Médio): Lubrificação mapeada como tipo PREVENTIVA na O.S.

mapMaintenanceTipoToOsTipo('lubrificacao') retorna 'PREVENTIVA' em vez de 'LUBRIFICACAO'.

### GAP 4 (Médio): Alertas passivos

NotificationCenter, QuickActions e AlertsPanel existem mas não estão integrados.

### GAP 5 (Médio): Dois caminhos paralelos desconectados

Execução via painel do plano e execução via O.S. não se cruzam.

### GAP 6 (Médio): Checklist técnico ignorado no fechamento

Plano tem checklist JSONB, mas FecharOS usa checklist genérico.

---

Documento completo com detalhes: ver PROPOSTA_MOTOR_EXECUCAO_UNIFICADO_20260415.md
