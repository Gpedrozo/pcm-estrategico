# Plano de Refatoracao de Banco por Modulo

## Objetivo

Reduzir o schema do Supabase para manter apenas tabelas com uso real no sistema, com rastreabilidade por modulo do frontend e por edge functions.

## Fonte de verdade usada nesta fase

- Auditoria por modulo: docs/MODULE_DB_USAGE_AUDIT_20260313.md
- Auditoria detalhada JSON: docs/MODULE_DB_USAGE_AUDIT_20260313.json
- Script de auditoria: scripts/audit-module-db-usage.cjs

## Resultado atual (snapshot)

- Modulos auditados: 39
- Tabelas criadas em migrations: 92
- Tabelas usadas no frontend (global): 49
- Tabelas usadas por edge functions: 24
- Tabelas usadas no total (frontend + edge): 58
- Candidatas sem uso: 35

## Como o mapeamento por modulo foi feito

1. Cada pagina em src/pages foi tratada como entrada de modulo.
2. O script segue imports locais recursivamente para descobrir dependencias do modulo.
3. Em cada arquivo do grafo do modulo, extrai chamadas Supabase:
   - .from('tabela').select/insert/update/upsert/delete
   - .rpc('funcao')
4. Em paralelo, o script audita o frontend inteiro e edge functions para calcular "sem uso" com menor falso positivo.

## Candidatas atuais sem uso (nao remover direto em producao)

- ativos
- auditoria
- avaliacoes_fornecedores
- causas
- checklists
- edge_refactor_contract
- enterprise_companies
- enterprise_impersonation_sessions
- enterprise_plans
- enterprise_subscriptions
- enterprise_system_integrity
- execucoes_os_pausas
- falhas
- indicadores_kpi
- legacy_tenant_rollback_snapshot
- localizacoes
- maintenance_action_suggestions
- membros_empresa
- migration_validation_windows
- orcamentos_manutencao
- permissoes
- planos_manutencao
- rate_limits
- rate_limits_por_empresa
- rbac_permissions
- rbac_role_permissions
- rbac_roles
- role_permissions
- subscription_payments
- system_notifications
- system_owner_allowlist
- tags_ativos
- tarefas_plano
- tenants
- unidades

## Plano de execucao seguro

### Fase 1 - Congelamento controlado (sem drop)

- Criar snapshot de contagem/bytes por tabela candidata.
- Revogar escrita para tabelas candidatas (apenas service_role em janela controlada).
- Monitorar 7 dias erros em app/edge function.

### Fase 2 - Quarentena

- Renomear candidatas para prefixo legacy_ (ou z_legacy_).
- Criar views de compatibilidade temporarias somente nas tabelas que acusarem uso residual.
- Monitorar mais 7 dias.

### Fase 3 - Remocao definitiva

- Backup por tabela candidata.
- Drop em lote pequeno (3-5 tabelas por deploy).
- Validacao de smoke por modulo apos cada lote.

## Critico para evitar regressao

- Nunca dropar em lote unico.
- Priorizar primeiro tabelas sem relacionamento e sem trigger.
- Antes de cada drop:
  - validar FKs
  - validar triggers
  - validar policies RLS
  - validar dependencia em SQL function/view

## Comando para reauditar antes de cada lote

node scripts/audit-module-db-usage.cjs

## Entrega desta fase

- Auditoria por modulo implementada e reproduzivel.
- Lista de candidatas consolidada.
- Caminho seguro para limpeza definitiva sem interromper login owner/tenant.
