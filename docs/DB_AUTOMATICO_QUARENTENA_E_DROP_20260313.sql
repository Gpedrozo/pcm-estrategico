-- AUTOMACAO COMPLETA: QUARENTENA + (OPCIONAL) DROP DEFINITIVO
-- Execucao: cole este script inteiro no Supabase SQL Editor e rode.
-- Seguranca:
-- 1) Quarentena e automatica.
-- 2) Drop definitivo so roda se voce mudar perform_drop para true.

begin;

create table if not exists public.db_cleanup_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  mode text not null,
  perform_drop boolean not null default false,
  total_candidates integer not null default 0,
  quarantined_count integer not null default 0,
  dropped_count integer not null default 0,
  blocked_count integer not null default 0,
  skipped_count integer not null default 0,
  notes text
);

create table if not exists public.db_cleanup_run_items (
  id bigserial primary key,
  run_id bigint not null references public.db_cleanup_runs(id) on delete cascade,
  table_name text not null,
  target_name text,
  table_exists boolean not null default false,
  estimated_rows bigint,
  total_bytes bigint,
  has_pk boolean,
  has_fk_out boolean,
  has_fk_in boolean,
  has_trigger boolean,
  has_policy boolean,
  dependent_views integer,
  dependent_functions integer,
  status text not null,
  reason text,
  processed_at timestamptz not null default now()
);

-- ============================================================
-- BLOCO 1: QUARENTENA AUTOMATICA (RENOMEAR para legacy_...)
-- ============================================================

do $$
declare
  candidates text[] := array[
    'ativos',
    'auditoria',
    'avaliacoes_fornecedores',
    'causas',
    'checklists',
    'edge_refactor_contract',
    'enterprise_companies',
    'enterprise_impersonation_sessions',
    'enterprise_plans',
    'enterprise_subscriptions',
    'enterprise_system_integrity',
    'execucoes_os_pausas',
    'falhas',
    'indicadores_kpi',
    'legacy_tenant_rollback_snapshot',
    'localizacoes',
    'maintenance_action_suggestions',
    'membros_empresa',
    'migration_validation_windows',
    'orcamentos_manutencao',
    'permissoes',
    'planos_manutencao',
    'rate_limits',
    'rate_limits_por_empresa',
    'rbac_permissions',
    'rbac_role_permissions',
    'rbac_roles',
    'role_permissions',
    'subscription_payments',
    'system_notifications',
    'system_owner_allowlist',
    'tags_ativos',
    'tarefas_plano',
    'tenants',
    'unidades'
  ];

  t text;
  rel_oid oid;
  target_name text;
  v_estimated_rows bigint;
  v_total_bytes bigint;
  v_has_pk boolean;
  v_has_fk_out boolean;
  v_has_fk_in boolean;
  v_has_trigger boolean;
  v_has_policy boolean;
  v_dependent_views integer;
  v_dependent_functions integer;
  v_blocked boolean;
  v_reason text;
  run_id bigint;
begin
  insert into public.db_cleanup_runs (mode, perform_drop, total_candidates, notes)
  values ('quarantine', false, coalesce(array_length(candidates, 1), 0), 'Quarentena automatica de tabelas candidatas')
  returning id into run_id;

  foreach t in array candidates loop
    target_name := format('legacy_%s_20260313', t);
    rel_oid := to_regclass(format('public.%I', t));

    if rel_oid is null then
      -- Pode ja ter sido renomeada em execucao anterior.
      if to_regclass(format('public.%I', target_name)) is not null then
        insert into public.db_cleanup_run_items (
          run_id, table_name, target_name, table_exists, status, reason
        ) values (
          run_id, t, target_name, false, 'already_quarantined', 'Tabela original nao existe; alvo legacy ja existe.'
        );
      else
        insert into public.db_cleanup_run_items (
          run_id, table_name, target_name, table_exists, status, reason
        ) values (
          run_id, t, target_name, false, 'missing', 'Tabela nao encontrada no schema public.'
        );
      end if;
      continue;
    end if;

    select
      c.reltuples::bigint,
      pg_total_relation_size(c.oid)
    into
      v_estimated_rows,
      v_total_bytes
    from pg_class c
    where c.oid = rel_oid;

    select exists (
      select 1 from pg_constraint con where con.conrelid = rel_oid and con.contype = 'p'
    ) into v_has_pk;

    select exists (
      select 1 from pg_constraint con where con.conrelid = rel_oid and con.contype = 'f'
    ) into v_has_fk_out;

    select exists (
      select 1 from pg_constraint con where con.confrelid = rel_oid and con.contype = 'f'
    ) into v_has_fk_in;

    select exists (
      select 1 from pg_trigger trg where trg.tgrelid = rel_oid and not trg.tgisinternal
    ) into v_has_trigger;

    select exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = t
    ) into v_has_policy;

    -- Dependencias de views/matviews
    select count(distinct c2.oid)::int
    into v_dependent_views
    from pg_depend d
    join pg_rewrite r on r.oid = d.objid
    join pg_class c2 on c2.oid = r.ev_class
    join pg_namespace n2 on n2.oid = c2.relnamespace
    where d.refobjid = rel_oid
      and n2.nspname = 'public'
      and c2.relkind in ('v', 'm');

    -- Dependencias de funcoes
    select count(distinct p.oid)::int
    into v_dependent_functions
    from pg_depend d
    join pg_proc p on p.oid = d.objid
    join pg_namespace n on n.oid = p.pronamespace
    where d.refobjid = rel_oid
      and n.nspname = 'public';

    v_blocked := coalesce(v_has_fk_in, false)
      or coalesce(v_has_trigger, false)
      or coalesce(v_has_policy, false)
      or coalesce(v_dependent_views, 0) > 0
      or coalesce(v_dependent_functions, 0) > 0;

    if v_blocked then
      v_reason := format(
        'Bloqueada por dependencias (fk_in=%s, trigger=%s, policy=%s, views=%s, functions=%s)',
        coalesce(v_has_fk_in, false),
        coalesce(v_has_trigger, false),
        coalesce(v_has_policy, false),
        coalesce(v_dependent_views, 0),
        coalesce(v_dependent_functions, 0)
      );

      insert into public.db_cleanup_run_items (
        run_id, table_name, target_name, table_exists, estimated_rows, total_bytes,
        has_pk, has_fk_out, has_fk_in, has_trigger, has_policy,
        dependent_views, dependent_functions, status, reason
      ) values (
        run_id, t, target_name, true, v_estimated_rows, v_total_bytes,
        v_has_pk, v_has_fk_out, v_has_fk_in, v_has_trigger, v_has_policy,
        v_dependent_views, v_dependent_functions, 'blocked', v_reason
      );

      continue;
    end if;

    -- Quarentena: renomeia tabela.
    execute format('alter table public.%I rename to %I', t, target_name);

    -- Endurece acesso para evitar uso acidental apos quarentena.
    execute format('revoke all on table public.%I from anon, authenticated', target_name);

    insert into public.db_cleanup_run_items (
      run_id, table_name, target_name, table_exists, estimated_rows, total_bytes,
      has_pk, has_fk_out, has_fk_in, has_trigger, has_policy,
      dependent_views, dependent_functions, status, reason
    ) values (
      run_id, t, target_name, true, v_estimated_rows, v_total_bytes,
      v_has_pk, v_has_fk_out, v_has_fk_in, v_has_trigger, v_has_policy,
      v_dependent_views, v_dependent_functions, 'quarantined', 'Tabela renomeada e acesso anon/authenticated revogado.'
    );
  end loop;

  update public.db_cleanup_runs r
  set
    quarantined_count = (
      select count(*) from public.db_cleanup_run_items i where i.run_id = r.id and i.status = 'quarantined'
    ),
    blocked_count = (
      select count(*) from public.db_cleanup_run_items i where i.run_id = r.id and i.status = 'blocked'
    ),
    skipped_count = (
      select count(*) from public.db_cleanup_run_items i where i.run_id = r.id and i.status in ('missing', 'already_quarantined')
    ),
    finished_at = now()
  where r.id = run_id;

  raise notice 'QUARENTENA FINALIZADA. run_id=%', run_id;
end
$$;

-- ============================================================
-- BLOCO 2: DROP DEFINITIVO AUTOMATICO (OPCIONAL)
-- ============================================================
-- Para habilitar drop automatico, troque perform_drop para true.

do $$
declare
  perform_drop boolean := false; -- <<<<<<<<<< MUDAR PARA true SOMENTE QUANDO QUISER DROPAR
  t record;
  run_id bigint;
begin
  if not perform_drop then
    raise notice 'DROP DEFINITIVO DESABILITADO (perform_drop=false).';
    return;
  end if;

  insert into public.db_cleanup_runs (mode, perform_drop, total_candidates, notes)
  values ('drop', true, 0, 'Drop definitivo de tabelas legacy_..._20260313 sem dependencias bloqueantes')
  returning id into run_id;

  for t in
    select
      c.relname as table_name,
      c.oid as rel_oid
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname like 'legacy\_%\_20260313' escape '\\'
    order by c.relname
  loop
    -- Protecao: so dropa sem dependencias conhecidas de risco.
    if exists (
      select 1 from pg_constraint con where con.confrelid = t.rel_oid and con.contype = 'f'
    ) or exists (
      select 1 from pg_trigger trg where trg.tgrelid = t.rel_oid and not trg.tgisinternal
    ) then
      insert into public.db_cleanup_run_items (
        run_id, table_name, target_name, table_exists, status, reason
      ) values (
        run_id, t.table_name, t.table_name, true, 'blocked', 'Dependencias impedem drop automatico.'
      );
      continue;
    end if;

    execute format('drop table if exists public.%I', t.table_name);

    insert into public.db_cleanup_run_items (
      run_id, table_name, target_name, table_exists, status, reason
    ) values (
      run_id, t.table_name, t.table_name, true, 'dropped', 'Tabela legacy removida com sucesso.'
    );
  end loop;

  update public.db_cleanup_runs r
  set
    dropped_count = (
      select count(*) from public.db_cleanup_run_items i where i.run_id = r.id and i.status = 'dropped'
    ),
    blocked_count = (
      select count(*) from public.db_cleanup_run_items i where i.run_id = r.id and i.status = 'blocked'
    ),
    skipped_count = (
      select count(*) from public.db_cleanup_run_items i where i.run_id = r.id and i.status = 'missing'
    ),
    finished_at = now()
  where r.id = run_id;

  raise notice 'DROP FINALIZADO. run_id=%', run_id;
end
$$;

-- ============================================================
-- RELATORIO FINAL
-- ============================================================

select *
from public.db_cleanup_runs
order by id desc
limit 10;

select
  i.run_id,
  i.table_name,
  i.target_name,
  i.status,
  i.reason,
  i.estimated_rows,
  pg_size_pretty(i.total_bytes) as total_size,
  i.has_fk_in,
  i.has_trigger,
  i.has_policy,
  i.dependent_views,
  i.dependent_functions,
  i.processed_at
from public.db_cleanup_run_items i
where i.run_id = (
  select id from public.db_cleanup_runs order by id desc limit 1
)
order by
  case i.status
    when 'blocked' then 0
    when 'quarantined' then 1
    when 'dropped' then 2
    else 3
  end,
  i.table_name;

commit;
