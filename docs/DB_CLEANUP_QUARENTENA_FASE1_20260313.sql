-- FASE 1 - Diagnostico e quarentena segura de tabelas candidatas
-- Nao executa DROP.
-- Objetivo: medir impacto e preparar limpeza com risco baixo.

begin;

create table if not exists public.db_cleanup_audit_snapshot (
  id bigserial primary key,
  captured_at timestamptz not null default now(),
  table_name text not null,
  estimated_rows bigint,
  total_bytes bigint,
  has_pk boolean,
  has_fk boolean,
  has_trigger boolean
);

with candidates(table_name) as (
  values
    ('ativos'),
    ('auditoria'),
    ('avaliacoes_fornecedores'),
    ('causas'),
    ('checklists'),
    ('edge_refactor_contract'),
    ('enterprise_companies'),
    ('enterprise_impersonation_sessions'),
    ('enterprise_plans'),
    ('enterprise_subscriptions'),
    ('enterprise_system_integrity'),
    ('execucoes_os_pausas'),
    ('falhas'),
    ('indicadores_kpi'),
    ('legacy_tenant_rollback_snapshot'),
    ('localizacoes'),
    ('maintenance_action_suggestions'),
    ('membros_empresa'),
    ('migration_validation_windows'),
    ('orcamentos_manutencao'),
    ('permissoes'),
    ('planos_manutencao'),
    ('rate_limits'),
    ('rate_limits_por_empresa'),
    ('rbac_permissions'),
    ('rbac_role_permissions'),
    ('rbac_roles'),
    ('role_permissions'),
    ('subscription_payments'),
    ('system_notifications'),
    ('system_owner_allowlist'),
    ('tags_ativos'),
    ('tarefas_plano'),
    ('tenants'),
    ('unidades')
), rel as (
  select
    c.table_name,
    cls.oid,
    cls.reltuples::bigint as estimated_rows,
    pg_total_relation_size(cls.oid) as total_bytes
  from candidates c
  left join pg_class cls on cls.relname = c.table_name
  left join pg_namespace nsp on nsp.oid = cls.relnamespace
  where cls.oid is not null
    and nsp.nspname = 'public'
)
insert into public.db_cleanup_audit_snapshot (
  table_name,
  estimated_rows,
  total_bytes,
  has_pk,
  has_fk,
  has_trigger
)
select
  rel.table_name,
  rel.estimated_rows,
  rel.total_bytes,
  exists (
    select 1
    from pg_constraint con
    where con.conrelid = rel.oid
      and con.contype = 'p'
  ) as has_pk,
  exists (
    select 1
    from pg_constraint con
    where con.conrelid = rel.oid
      and con.contype = 'f'
  ) as has_fk,
  exists (
    select 1
    from pg_trigger trg
    where trg.tgrelid = rel.oid
      and not trg.tgisinternal
  ) as has_trigger
from rel;

-- Resultado da captura atual
select
  table_name,
  estimated_rows,
  pg_size_pretty(total_bytes) as total_size,
  has_pk,
  has_fk,
  has_trigger,
  captured_at
from public.db_cleanup_audit_snapshot
where captured_at >= now() - interval '5 minutes'
order by total_bytes desc nulls last, table_name;

-- Proxima etapa (manual, nao executada automaticamente):
-- 1) Revogar escrita em tabelas candidatas por 7 dias.
-- 2) Monitorar erros em app/edge functions.
-- 3) Renomear para legacy_<tabela> em lotes de 3 a 5.
-- 4) Somente depois executar DROP em janela controlada.

commit;
