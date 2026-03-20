# Release Tecnico - Migrations (2026-03-20)

## Objetivo
Estabilizar a esteira de migrations em ambientes com historico heterogeneo e garantir aplicacao completa ate a integracao de billing Asaas.

## Escopo Aplicado
- 20260311113000_saas_integrity_phase1.sql
- 20260311202000_os_governance_and_breaks_phase2.sql
- 20260312193000_enforce_strict_rls_all_empresa_tables.sql
- 20260314121000_p0_harden_close_os_atomic.sql

## Ajustes Tecnicos

### 1) Bootstrap de funcao ausente para compatibilidade retroativa
Arquivo: supabase/migrations/20260311113000_saas_integrity_phase1.sql
- Adicionado bootstrap condicional de public.is_system_master() quando inexistente.
- Objetivo: evitar quebra de policies/rotinas que dependem da funcao em ambientes legados.

### 2) Robustez de policy + compatibilidade com enum recem-adicionado
Arquivo: supabase/migrations/20260311202000_os_governance_and_breaks_phase2.sql
- Corrigida ordem sintatica de CREATE POLICY ... ON ... AS RESTRICTIVE.
- Substituida validacao imediata baseada no enum SOLICITANTE por checagem textual em user_roles.
- Objetivo: evitar erro de transacao no PostgreSQL ao usar valor de enum recem-criado na mesma migration.

### 3) Hardening de aplicacao de RLS apenas em tabelas base
Arquivo: supabase/migrations/20260312193000_enforce_strict_rls_all_empresa_tables.sql
- Incluido filtro por information_schema.tables.table_type = BASE TABLE no loop de aplicacao de RLS.
- Objetivo: impedir tentativa de ALTER TABLE em views com empresa_id.

### 4) Compatibilidade do parser do Supabase CLI em funcao longa
Arquivo: supabase/migrations/20260314121000_p0_harden_close_os_atomic.sql
- Reestruturado bloco da funcao close_os_with_execution_atomic com DO/EXECUTE e delimitador dedicado.
- Objetivo: evitar erro "cannot insert multiple commands into a prepared statement" no db push.

## Resultado Operacional
- supabase db push concluido com sucesso ate a migration final 20260319120000_asaas_billing_integration.sql.
- supabase migration list confirmado com local e remoto alinhados.

## Observacao de Operacao
- As correcoes focam compatibilidade entre ambientes com variacoes de schema historico, sem alterar regras de negocio alvo do release.
