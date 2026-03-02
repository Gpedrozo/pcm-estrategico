# Ordem de Execução - Reconstrução 100%

Execute os arquivos nesta ordem no SQL Editor do Supabase:

1. `00_drop_all_project_objects.sql`
2. `01_create_backend_v2.sql`
3. `02_security_rbac_rls_v2.sql`
4. `03_front_compat_views.sql`
5. `04_edge_refactor_contract.sql`
6. `05_analytics_layer_v2.sql`
7. `06_cutover_finalize.sql` (apenas no fechamento definitivo)

## Observações

- O passo 7 (`06_cutover_finalize.sql`) deve ser executado somente após validar todos os módulos no v2.
- Enquanto houver frontend legado consumindo `auditoria`/`auditoria_logs`, mantenha a fase de compatibilidade ativa.

## Execução sem interação humana (PowerShell)

- Fases 0-5:
  - `./scripts/run-rebuild-phases.ps1 -ProjectRef <PROJECT_REF>`
- Fases 0-6 (inclui cutover final):
  - `./scripts/run-rebuild-phases.ps1 -ProjectRef <PROJECT_REF> -IncludeCutover`
