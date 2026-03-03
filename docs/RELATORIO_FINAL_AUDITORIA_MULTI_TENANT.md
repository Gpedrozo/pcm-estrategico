# RELATÃ“RIO FINAL DE AUDITORIA MULTI-TENANT

## Escopo

Auditoria das tabelas pÃºblicas com foco em isolamento por `empresa_id`, RLS e eliminaÃ§Ã£o de polÃ­ticas permissivas.

## Migration de referÃªncia

- `supabase/migrations/20260301034000_enterprise_saas_hardening.sql`

## CritÃ©rios aplicados

- Coluna `empresa_id UUID NOT NULL` com FK para `public.empresas(id)` nas tabelas operacionais pÃºblicas (via loop dinÃ¢mico e backfill seguro).

- Ãndice `idx_<tabela>_empresa_id` criado para tabelas com `empresa_id`.

- RLS habilitado e polÃ­ticas permissivas `USING (true)`/`WITH CHECK (true)` removidas nas tabelas com `empresa_id`.

- Policies padrÃ£o aplicadas:

  - `tenant_isolation`: `empresa_id = get_current_empresa_id()` e `empresa_is_active(empresa_id)`

  - `master_ti_global_access`: acesso global para `MASTER_TI`

- Triggers obrigatÃ³rios aplicados por tabela com `empresa_id`:

  - `enforce_empresa_id_insert`

  - `block_empresa_id_update`

## Resultado por grupo de tabelas

### Operacionais (tenantizadas pela migration)

- `areas`

- `auditoria`

- `equipamentos`

- `execucoes_os`

- `materiais`

- `materiais_os`

- `mecanicos`

- `movimentacoes_materiais`

- `ordens_servico`

- `plantas`

- `profiles`

- `sistemas`

- `user_roles`

- `solicitacoes_manutencao`

- `planos_preventivos`

- `medicoes_preditivas`

- `inspecoes`

- `anomalias_inspecao`

- `fmea`

- `analise_causa_raiz`

- `acoes_corretivas`

- `melhorias`

- `fornecedores`

- `contratos`

- `avaliacoes_fornecedores`

- `permissoes_trabalho`

- `incidentes_ssma`

- `documentos_tecnicos`

- `configuracoes_sistema`

- `dados_empresa`

- `permissoes_granulares`

- `componentes_equipamento`

- `atividades_preventivas`

- `servicos_preventivos`

- `templates_preventivos`

- `execucoes_preventivas`

- `planos_lubrificacao`

- `atividades_lubrificacao`

- `execucoes_lubrificacao`

- `document_sequences`

- `document_layouts`

- `ai_root_cause_analysis`

- `security_logs`

- `rate_limits`

- `assinaturas`

**Status esperado pÃ³s-migration:** `empresa_id` NOT NULL + FK vÃ¡lida + Ã­ndice + RLS ativo + policy tenant/master.

### Estruturas globais/control-plane

- `empresas`

- `planos`

- `empresa_config`

- `enterprise_audit_logs`

- `rate_limits_por_empresa`

**Status:** mantidas como tabelas de controle SaaS com RLS dedicado.

## Tabelas Ã³rfÃ£s

- NÃ£o identificadas no escopo pÃºblico apÃ³s a padronizaÃ§Ã£o dinÃ¢mica.

## Uso em cÃ³digo

- Tabelas operacionais listadas acima jÃ¡ possuem consumo no frontend/edge functions existente.

- Novas estruturas SaaS adicionadas para evoluÃ§Ã£o comercial/white-label/seguranÃ§a:

  - `empresas`, `planos`, `assinaturas`, `empresa_config`, `enterprise_audit_logs`, `rate_limits_por_empresa`

## FunÃ§Ãµes e monitoramento

- `get_current_empresa_id()`

- `empresa_is_active(uuid)`

- `detect_cross_tenant_access(uuid, text)`

- `check_rate_limit_por_empresa(text, integer, integer)`

- `weekly_tenant_integrity_check()`

## Triggers obrigatÃ³rios

- `enforce_empresa_id_insert` (por tabela com `empresa_id`)

- `block_empresa_id_update` (por tabela com `empresa_id`)

- `log_role_change` (`user_roles`)

- `log_plan_change` (`assinaturas`)

## Consulta recomendada de verificaÃ§Ã£o contÃ­nua

```sql
select * from public.weekly_tenant_integrity_check();
```

## ObservaÃ§Ã£o de integridade

A migration aborta em inconsistÃªncia de backfill (`empresa_id` nulo apÃ³s preenchimento), preservando seguranÃ§a e integridade.
