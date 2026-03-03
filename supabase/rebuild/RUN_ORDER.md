# Ordem de ExecuÃ§Ã£o - ReconstruÃ§Ã£o 100%

Execute os arquivos nesta ordem no SQL Editor do Supabase:

1. `00_drop_all_project_objects.sql`

1. `01_create_backend_v2.sql`

1. `02_security_rbac_rls_v2.sql`

1. `03_front_compat_views.sql`

1. `04_edge_refactor_contract.sql`

1. `05_analytics_layer_v2.sql`

1. `06_cutover_finalize.sql` (apenas no fechamento definitivo)

1. `08_cleanup_legacy_objects.sql`

1. `09_seed_owner_master_users.sql`

## ObservaÃ§Ãµes

- O passo `06_cutover_finalize.sql` deve ser executado somente apÃ³s validar todos os mÃ³dulos no v2.

- O passo `09_seed_owner_master_users.sql` prepara os usuários críticos (`SYSTEM_OWNER` e `MASTER_TI`) após o reset.

- Enquanto houver frontend legado consumindo `auditoria`/`auditoria_logs`, mantenha a fase de compatibilidade ativa.

## ExecuÃ§Ã£o sem interaÃ§Ã£o humana (PowerShell)

- Fases 0-5:

  - `./scripts/run-rebuild-phases.ps1 -ProjectRef <PROJECT_REF>`

- Fases 0-6 (inclui cutover final):

  - `./scripts/run-rebuild-phases.ps1 -ProjectRef <PROJECT_REF> -IncludeCutover`
