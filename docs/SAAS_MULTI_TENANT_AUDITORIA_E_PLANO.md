# Auditoria Inicial e Plano de MigraÃ§Ã£o SaaS Multi-tenant

## Escopo da auditoria

Fonte: anÃ¡lise estÃ¡tica dos arquivos em `supabase/migrations/*.sql` e referÃªncias em `src/**`.

## Resumo executivo

- **Total de tabelas operacionais auditadas:** 42

- **Tabelas sem `empresa_id`:** 42/42 (situaÃ§Ã£o anterior Ã  nova migration)

- **RLS:** habilitado na maior parte das tabelas

- **Policies:** predominantemente permissivas (`USING (true)`), sem isolamento por tenant

- **Risco crÃ­tico identificado:** potencial de acesso cruzado entre empresas

## Tabelas auditadas (status anterior)

### NÃºcleo operacional (uso no cÃ³digo: alto)

`areas`, `auditoria`, `equipamentos`, `execucoes_os`, `materiais`, `materiais_os`, `mecanicos`, `movimentacoes_materiais`, `ordens_servico`, `plantas`, `sistemas`.

### MÃ³dulos operacionais (uso no cÃ³digo: alto/mÃ©dio)

`solicitacoes_manutencao`, `planos_preventivos`, `atividades_preventivas`, `servicos_preventivos`, `templates_preventivos`, `execucoes_preventivas`, `planos_lubrificacao`, `atividades_lubrificacao`, `execucoes_lubrificacao`, `medicoes_preditivas`, `inspecoes`, `anomalias_inspecao`, `fmea`, `analise_causa_raiz`, `acoes_corretivas`, `melhorias`, `fornecedores`, `contratos`, `avaliacoes_fornecedores`, `permissoes_trabalho`, `incidentes_ssma`, `documentos_tecnicos`, `componentes_equipamento`.

### ConfiguraÃ§Ã£o/seguranÃ§a/documentos (uso no cÃ³digo: mÃ©dio/baixo)

`configuracoes_sistema`, `dados_empresa`, `document_sequences`, `document_layouts`, `permissoes_granulares`, `security_logs`, `rate_limits`, `ai_root_cause_analysis`, `profiles`, `user_roles`.

## Principais achados

1. AusÃªncia de coluna de tenant (`empresa_id`) em tabelas operacionais.

1. Policies permissivas sem filtro por tenant.

1. Falta de trilha de auditoria enterprise dedicada para aÃ§Ãµes crÃ­ticas multi-tenant.

1. Falta de trava explÃ­cita para promoÃ§Ã£o indevida ao papel `MASTER_TI`.

---

## Plano de migraÃ§Ã£o aplicado

Migration: `supabase/migrations/20260301032000_enterprise_multitenant_foundation.sql`

### ETAPA 1 â€” Auditoria

- Mapeamento de tabelas, RLS, policies e uso em cÃ³digo concluÃ­do (este documento).

### ETAPA 2 â€” PadronizaÃ§Ã£o multi-tenant

- CriaÃ§Ã£o da tabela `public.empresas`.

- InclusÃ£o de `empresa_id` em tabelas operacionais.

- Backfill por vÃ­nculo de usuÃ¡rio criador e relacionamento entre tabelas.

- ValidaÃ§Ã£o de inconsistÃªncias antes de `NOT NULL` (migration falha com mensagem explÃ­cita se detectar linhas Ã³rfÃ£s).

- Ãndices e FKs para `empresa_id`.

### ETAPA 3 â€” Isolamento RLS

- RemoÃ§Ã£o de policies anteriores nas tabelas-alvo.

- CriaÃ§Ã£o de policies padrÃ£o por tabela:

  - `tenant_select`

  - `tenant_insert`

  - `tenant_update`

  - `tenant_delete`

- Regra de acesso: `empresa_id = get_current_empresa_id()` com override para `MASTER_TI`.

### ETAPA 4 â€” Triggers de proteÃ§Ã£o

- Trigger para bloquear `INSERT/UPDATE` sem `empresa_id`.

- Trigger para impedir alteraÃ§Ã£o manual de `empresa_id`.

- Trigger para log automÃ¡tico em `enterprise_audit_logs`.

- FunÃ§Ã£o `detect_cross_tenant_access` para detecÃ§Ã£o de acesso cruzado.

### ETAPA 5/6 â€” RevisÃµes e hardening

- InclusÃ£o de `must_change_password` em `profiles`.

- Trigger `prevent_master_ti_promotion` para bloquear promoÃ§Ã£o indevida.

- FunÃ§Ã£o `weekly_tenant_integrity_check` para checagem semanal de integridade.

### ETAPA 7 â€” Limpeza e otimizaÃ§Ã£o

- Nesta entrega, **sem remoÃ§Ã£o destrutiva** de tabelas/colunas.

- Limpeza fÃ­sica fica condicionada ao resultado da auditoria em produÃ§Ã£o.

### ETAPA 8 â€” Testes obrigatÃ³rios

- Adicionado teste automatizado de presenÃ§a dos artefatos crÃ­ticos da migration (arquivo de teste no Vitest).

---

## Lista de tabelas alteradas

- `profiles`, `user_roles`

- `areas`, `auditoria`, `equipamentos`, `execucoes_os`, `materiais`, `materiais_os`, `mecanicos`, `movimentacoes_materiais`, `ordens_servico`, `plantas`, `sistemas`

- `solicitacoes_manutencao`, `planos_preventivos`, `medicoes_preditivas`, `inspecoes`, `anomalias_inspecao`, `fmea`, `analise_causa_raiz`, `acoes_corretivas`, `melhorias`

- `fornecedores`, `contratos`, `avaliacoes_fornecedores`, `permissoes_trabalho`, `incidentes_ssma`, `documentos_tecnicos`, `configuracoes_sistema`, `componentes_equipamento`

- `atividades_preventivas`, `servicos_preventivos`, `templates_preventivos`, `execucoes_preventivas`

- `planos_lubrificacao`, `atividades_lubrificacao`, `execucoes_lubrificacao`

- `document_sequences`, `document_layouts`, `ai_root_cause_analysis`, `permissoes_granulares`, `security_logs`, `rate_limits`, `dados_empresa`

## Lista de tabelas criadas

- `empresas`

- `enterprise_audit_logs`

## Lista de policies criadas (padrÃ£o)

- `tenant_select`

- `tenant_insert`

- `tenant_update`

- `tenant_delete`

- `enterprise_audit_logs_select`

- `enterprise_audit_logs_insert`

## Lista de funÃ§Ãµes/triggers criadas

- FunÃ§Ãµes:

  - `get_current_empresa_id`

  - `is_master_ti`

  - `enforce_empresa_id_protection`

  - `log_enterprise_audit`

  - `detect_cross_tenant_access`

  - `prevent_master_ti_promotion`

  - `weekly_tenant_integrity_check`

- Triggers:

  - `trg_enforce_empresa_id` (em tabelas operacionais)

  - `trg_enterprise_audit` (em tabelas operacionais)

  - `trg_prevent_master_ti_promotion` (em `user_roles`)

## Tabelas Ã³rfÃ£s/mock/redundantes (candidatas para etapa posterior)

- Candidatas com baixo uso no cÃ³digo: `rate_limits`, `security_logs`, `ai_root_cause_analysis`.

- A remoÃ§Ã£o **nÃ£o foi executada** nesta entrega por seguranÃ§a/integridade.
