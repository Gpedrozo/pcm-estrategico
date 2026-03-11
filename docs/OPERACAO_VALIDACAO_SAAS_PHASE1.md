# Operacao de Validacao - SaaS Phase 1

Este guia valida o estado atual da fase 1 de integridade SaaS:

- isolamento multi-tenant (RLS)
- views criticas de SLA, custos e dashboard
- disponibilidade da RPC de fechamento atomico de O.S
- fila de notificacoes assicronas

## Pre-requisitos

Defina variaveis de ambiente no terminal:

- `SUPABASE_URL` (ex.: `https://dvwsferonoczgmvfubgu.supabase.co`)
- Chave de acesso:
- preferencial: `SUPABASE_SERVICE_ROLE_KEY`
- alternativa: `SUPABASE_PUBLISHABLE_KEY` ou `VITE_SUPABASE_PUBLISHABLE_KEY`

Exemplo PowerShell:

```powershell
$env:SUPABASE_URL="https://dvwsferonoczgmvfubgu.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<sua-chave-service-role>"
```

## Execucao padrao

```powershell
npm run verify:saas:phase1
```

## Execucao com processamento da fila

```powershell
npm run verify:saas:phase1:process
```

## Como interpretar o resultado

- `PASS | ...`: item validado.
- `FAIL | ...`: acao corretiva necessaria.
- `SKIP | process_pending_system_notifications ...`: esperado quando rodar sem `:process`.

Priorize correcoes nesta ordem:

1. Falhas em `run_multitenant_rls_suite`.
2. Falhas de leitura em `v_ordens_servico_sla`, `v_dashboard_kpis`, `v_custos_orcado_realizado`.
3. Falha na existencia da RPC `close_os_with_execution_atomic`.
4. Falha em tabela/RPC de `system_notifications`.

## Resultado esperado no estado atual

- RLS suite: sem falhas.
- Views criticas: legiveis.
- RPC fechamento atomico: existente e chamavel.
- Queue: tabela acessivel; processamento opcional disponivel.

## Se houver falha

1. Verifique se a migration `20260311113000_saas_integrity_phase1.sql` foi aplicada no ambiente alvo.
2. Reexecute a validacao.
3. Se persistir, documente as linhas `FAIL` e avance para fix pontual por item.
