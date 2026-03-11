-- OS Governance and Breaks Phase 2
-- 1) Backend hardening for OS emission (role-based)
-- 2) Structured breaks persistence
-- 3) Atomic close function with breaks
-- 4) Dashboard KPI based on net execution time

set check_function_bodies = off;

-- -----------------------------------------------------------------------------
-- Role extension for request-only users
-- -----------------------------------------------------------------------------
do $$
begin
  begin
    alter type public.app_role add value if not exists 'SOLICITANTE';
  exception when duplicate_object then
    null;
  end;
end
$$;

-- -----------------------------------------------------------------------------
-- Restrictive policies to block request-only users from creating/updating O.S
-- -----------------------------------------------------------------------------
drop policy if exists ordens_servico_non_solicitante_insert on public.ordens_servico;
create policy ordens_servico_non_solicitante_insert
as restrictive
on public.ordens_servico
for insert
to authenticated
with check (not public.has_role(auth.uid(), 'SOLICITANTE'::public.app_role));

drop policy if exists ordens_servico_non_solicitante_update on public.ordens_servico;
create policy ordens_servico_non_solicitante_update
as restrictive
on public.ordens_servico
for update
to authenticated
using (not public.has_role(auth.uid(), 'SOLICITANTE'::public.app_role))
with check (not public.has_role(auth.uid(), 'SOLICITANTE'::public.app_role));

drop policy if exists execucoes_os_non_solicitante_insert on public.execucoes_os;
create policy execucoes_os_non_solicitante_insert
as restrictive
on public.execucoes_os
for insert
to authenticated
with check (not public.has_role(auth.uid(), 'SOLICITANTE'::public.app_role));

drop policy if exists execucoes_os_non_solicitante_update on public.execucoes_os;
create policy execucoes_os_non_solicitante_update
as restrictive
on public.execucoes_os
for update
to authenticated
using (not public.has_role(auth.uid(), 'SOLICITANTE'::public.app_role))
with check (not public.has_role(auth.uid(), 'SOLICITANTE'::public.app_role));

drop policy if exists materiais_os_non_solicitante_insert on public.materiais_os;
create policy materiais_os_non_solicitante_insert
as restrictive
on public.materiais_os
for insert
to authenticated
with check (not public.has_role(auth.uid(), 'SOLICITANTE'::public.app_role));

-- -----------------------------------------------------------------------------
-- Structured breaks model
-- -----------------------------------------------------------------------------
alter table public.execucoes_os add column if not exists tempo_execucao_bruto integer;
alter table public.execucoes_os add column if not exists tempo_pausas integer not null default 0;
alter table public.execucoes_os add column if not exists tempo_execucao_liquido integer;

update public.execucoes_os
set
  tempo_execucao_bruto = coalesce(tempo_execucao_bruto, tempo_execucao),
  tempo_execucao_liquido = coalesce(tempo_execucao_liquido, tempo_execucao),
  tempo_pausas = coalesce(tempo_pausas, 0)
where tempo_execucao_bruto is null
   or tempo_execucao_liquido is null
   or tempo_pausas is null;

create table if not exists public.execucoes_os_pausas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid,
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  execucao_id uuid not null references public.execucoes_os(id) on delete cascade,
  inicio time not null,
  fim time not null,
  duracao_min integer not null check (duracao_min > 0),
  motivo text,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (fim > inicio)
);

create index if not exists idx_execucoes_os_pausas_execucao on public.execucoes_os_pausas (execucao_id);
create index if not exists idx_execucoes_os_pausas_empresa on public.execucoes_os_pausas (empresa_id, created_at desc);

alter table public.execucoes_os_pausas enable row level security;

drop policy if exists execucoes_os_pausas_read on public.execucoes_os_pausas;
create policy execucoes_os_pausas_read
on public.execucoes_os_pausas
for select
to authenticated
using (public.is_system_master() or empresa_id = public.current_empresa_id());

drop policy if exists execucoes_os_pausas_write on public.execucoes_os_pausas;
create policy execucoes_os_pausas_write
as restrictive
on public.execucoes_os_pausas
for all
to authenticated
using (
  (public.is_system_master() or empresa_id = public.current_empresa_id())
  and not public.has_role(auth.uid(), 'SOLICITANTE'::public.app_role)
)
with check (
  (public.is_system_master() or empresa_id = public.current_empresa_id())
  and not public.has_role(auth.uid(), 'SOLICITANTE'::public.app_role)
);

-- -----------------------------------------------------------------------------
-- Atomic close function with break registration
-- -----------------------------------------------------------------------------
drop function if exists public.close_os_with_execution_atomic(
  uuid, uuid, text, text, text, integer, text, numeric, numeric, numeric, numeric, jsonb, uuid, text, text, text, text
);

create or replace function public.close_os_with_execution_atomic(
  p_os_id uuid,
  p_mecanico_id uuid,
  p_mecanico_nome text,
  p_hora_inicio text,
  p_hora_fim text,
  p_tempo_execucao integer,
  p_servico_executado text,
  p_custo_mao_obra numeric,
  p_custo_materiais numeric,
  p_custo_terceiros numeric,
  p_custo_total numeric,
  p_materiais jsonb default '[]'::jsonb,
  p_usuario_fechamento uuid default null,
  p_modo_falha text default null,
  p_causa_raiz text default null,
  p_acao_corretiva text default null,
  p_licoes_aprendidas text default null,
  p_pausas jsonb default '[]'::jsonb
)
returns table (
  os_id uuid,
  execucao_id uuid,
  os_status text,
  total_materiais numeric,
  total_custo numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_execucao_id uuid;
  v_os_exists boolean;
  v_empresa_id uuid;
  v_total_materiais numeric := 0;
  v_item jsonb;
  v_material_id uuid;
  v_qtd numeric;
  v_unit numeric;
  v_item_total numeric;
  v_pausa jsonb;
  v_pausa_inicio time;
  v_pausa_fim time;
  v_pausa_duracao integer;
  v_tempo_pausas integer := 0;
  v_tempo_liquido integer;
begin
  select exists(select 1 from public.ordens_servico where id = p_os_id) into v_os_exists;
  if not v_os_exists then
    raise exception 'os_not_found';
  end if;

  select empresa_id into v_empresa_id from public.ordens_servico where id = p_os_id;

  if p_pausas is not null and jsonb_typeof(p_pausas) = 'array' then
    for v_pausa in select value from jsonb_array_elements(p_pausas)
    loop
      begin
        v_pausa_inicio := nullif(v_pausa->>'inicio', '')::time;
        v_pausa_fim := nullif(v_pausa->>'fim', '')::time;

        if v_pausa_inicio is null or v_pausa_fim is null or v_pausa_fim <= v_pausa_inicio then
          continue;
        end if;

        v_pausa_duracao := greatest(1, floor(extract(epoch from (v_pausa_fim - v_pausa_inicio)) / 60)::int);
        v_tempo_pausas := v_tempo_pausas + v_pausa_duracao;
      exception when others then
        continue;
      end;
    end loop;
  end if;

  v_tempo_liquido := greatest(coalesce(p_tempo_execucao, 0) - coalesce(v_tempo_pausas, 0), 0);

  insert into public.execucoes_os (
    os_id,
    mecanico_id,
    mecanico_nome,
    hora_inicio,
    hora_fim,
    tempo_execucao,
    tempo_execucao_bruto,
    tempo_pausas,
    tempo_execucao_liquido,
    servico_executado,
    custo_mao_obra,
    custo_materiais,
    custo_terceiros,
    custo_total
  )
  values (
    p_os_id,
    p_mecanico_id,
    p_mecanico_nome,
    p_hora_inicio,
    p_hora_fim,
    v_tempo_liquido,
    p_tempo_execucao,
    v_tempo_pausas,
    v_tempo_liquido,
    p_servico_executado,
    p_custo_mao_obra,
    p_custo_materiais,
    p_custo_terceiros,
    p_custo_total
  )
  returning id into v_execucao_id;

  if p_pausas is not null and jsonb_typeof(p_pausas) = 'array' then
    for v_pausa in select value from jsonb_array_elements(p_pausas)
    loop
      begin
        v_pausa_inicio := nullif(v_pausa->>'inicio', '')::time;
        v_pausa_fim := nullif(v_pausa->>'fim', '')::time;

        if v_pausa_inicio is null or v_pausa_fim is null or v_pausa_fim <= v_pausa_inicio then
          continue;
        end if;

        v_pausa_duracao := greatest(1, floor(extract(epoch from (v_pausa_fim - v_pausa_inicio)) / 60)::int);

        insert into public.execucoes_os_pausas (
          empresa_id,
          os_id,
          execucao_id,
          inicio,
          fim,
          duracao_min,
          motivo,
          created_by
        )
        values (
          v_empresa_id,
          p_os_id,
          v_execucao_id,
          v_pausa_inicio,
          v_pausa_fim,
          v_pausa_duracao,
          nullif(v_pausa->>'motivo', ''),
          p_usuario_fechamento
        );
      exception when others then
        continue;
      end;
    end loop;
  end if;

  if p_materiais is not null and jsonb_typeof(p_materiais) = 'array' then
    for v_item in select value from jsonb_array_elements(p_materiais)
    loop
      v_material_id := nullif(v_item->>'material_id', '')::uuid;
      v_qtd := coalesce((v_item->>'quantidade')::numeric, 0);
      v_unit := coalesce((v_item->>'custo_unitario')::numeric, 0);
      v_item_total := coalesce((v_item->>'custo_total')::numeric, v_qtd * v_unit);

      if v_material_id is null or v_qtd <= 0 then
        continue;
      end if;

      insert into public.materiais_os (
        os_id,
        material_id,
        quantidade,
        custo_unitario,
        custo_total
      )
      values (
        p_os_id,
        v_material_id,
        v_qtd,
        v_unit,
        v_item_total
      );

      v_total_materiais := v_total_materiais + v_item_total;
    end loop;
  end if;

  update public.ordens_servico
  set
    status = 'FECHADA',
    data_fechamento = now(),
    usuario_fechamento = p_usuario_fechamento,
    modo_falha = p_modo_falha,
    causa_raiz = p_causa_raiz,
    acao_corretiva = p_acao_corretiva,
    licoes_aprendidas = p_licoes_aprendidas,
    updated_at = now()
  where id = p_os_id;

  return query
  select
    p_os_id,
    v_execucao_id,
    'FECHADA'::text,
    v_total_materiais,
    coalesce(p_custo_total, 0);
end;
$$;

grant execute on function public.close_os_with_execution_atomic(
  uuid, uuid, text, text, text, integer, text, numeric, numeric, numeric, numeric, jsonb, uuid, text, text, text, text, jsonb
) to authenticated;

-- -----------------------------------------------------------------------------
-- Dashboard KPI with net execution time
-- -----------------------------------------------------------------------------
create or replace view public.v_dashboard_kpis as
with os_base as (
  select
    os.empresa_id,
    os.id,
    os.status,
    os.tipo,
    os.prioridade,
    os.data_solicitacao,
    os.data_fechamento,
    extract(epoch from (coalesce(os.data_fechamento, now()) - os.data_solicitacao)) / 3600.0 as horas_aberta
  from public.ordens_servico os
),
exec_base as (
  select
    os.empresa_id,
    e.id,
    e.created_at,
    coalesce(e.tempo_execucao_liquido, e.tempo_execucao, 0) / 60.0 as tempo_execucao_horas,
    coalesce(e.tempo_pausas, 0) / 60.0 as tempo_pausas_horas,
    coalesce(e.custo_total, 0) as custo_total
  from public.execucoes_os e
  join public.ordens_servico os on os.id = e.os_id
)
select
  b.empresa_id,
  now() as snapshot_at,
  count(*) filter (where b.status in ('ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_MATERIAL'))::int as os_abertas,
  count(*) filter (where b.status = 'FECHADA' and b.data_fechamento >= now() - interval '30 days')::int as os_fechadas_30d,
  count(*) filter (where b.prioridade = 'URGENTE' and b.status in ('ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_MATERIAL'))::int as urgentes_abertas,
  count(*) filter (
    where b.status in ('ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_MATERIAL')
      and b.horas_aberta > case
        when b.prioridade = 'URGENTE' then 24
        when b.prioridade = 'ALTA' then 72
        when b.prioridade = 'MEDIA' then 168
        else 336
      end
  )::int as backlog_atrasado,
  coalesce((
    select sum(e.custo_total)
    from exec_base e
    where e.empresa_id = b.empresa_id
      and e.created_at >= now() - interval '30 days'
  ), 0)::numeric(14,2) as custo_30d,
  coalesce((
    select avg(e.tempo_execucao_horas)
    from exec_base e
    where e.empresa_id = b.empresa_id
      and e.created_at >= now() - interval '30 days'
  ), 0)::numeric(14,2) as mttr_horas_30d,
  coalesce((
    select avg(gap_horas)
    from (
      select
        extract(epoch from (x.data_solicitacao - lag(x.data_solicitacao) over (partition by x.empresa_id order by x.data_solicitacao))) / 3600.0 as gap_horas
      from os_base x
      where x.empresa_id = b.empresa_id
        and x.tipo = 'CORRETIVA'
        and x.status = 'FECHADA'
        and x.data_solicitacao >= now() - interval '180 days'
    ) t
    where t.gap_horas is not null and t.gap_horas > 0
  ), 720)::numeric(14,2) as mtbf_horas_30d,
  coalesce((
    select
      case
        when avg(e.tempo_execucao_horas) is null or avg(e.tempo_execucao_horas) <= 0 then 100
        else least(100, greatest(0, (720 / (720 + avg(e.tempo_execucao_horas))) * 100))
      end
    from exec_base e
    where e.empresa_id = b.empresa_id
      and e.created_at >= now() - interval '30 days'
  ), 100)::numeric(7,2) as disponibilidade_estim,
  (
    case
      when count(*) filter (where b.tipo = 'PREVENTIVA' and b.data_solicitacao >= now() - interval '90 days') = 0 then 100
      else (
        count(*) filter (where b.tipo = 'PREVENTIVA' and b.status = 'FECHADA' and b.data_solicitacao >= now() - interval '90 days')::numeric /
        nullif(count(*) filter (where b.tipo = 'PREVENTIVA' and b.data_solicitacao >= now() - interval '90 days')::numeric, 0)
      ) * 100
    end
  )::numeric(7,2) as aderencia_preventiva_90d
from os_base b
group by b.empresa_id;

-- -----------------------------------------------------------------------------
-- RLS suite extension
-- -----------------------------------------------------------------------------
create or replace function public.run_multitenant_rls_suite()
returns table(test_name text, passed boolean, details text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy_count integer;
  v_tables text[] := array[
    'ordens_servico',
    'execucoes_os',
    'execucoes_os_pausas',
    'materiais_os',
    'audit_logs',
    'solicitacoes',
    'solicitacoes_manutencao',
    'equipamentos',
    'materiais'
  ];
  v_table text;
  v_exists boolean;
begin
  foreach v_table in array v_tables loop
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = v_table
    ) into v_exists;

    if not v_exists then
      test_name := format('table_exists.%s', v_table);
      passed := true;
      details := 'table_not_present_in_this_schema_variant';
      return next;
      continue;
    end if;

    test_name := format('rls_enabled.%s', v_table);
    passed := public.assert_table_rls_enabled('public', v_table);
    details := case when passed then 'ok' else 'rls_disabled' end;
    return next;

    select count(*)
      into v_policy_count
      from pg_policies
     where schemaname = 'public'
       and tablename = v_table;

    test_name := format('policies_present.%s', v_table);
    passed := v_policy_count > 0;
    details := format('policy_count=%s', v_policy_count);
    return next;
  end loop;

  test_name := 'current_empresa_id_resolves';
  begin
    perform public.current_empresa_id();
    passed := true;
    details := 'ok';
  exception when others then
    passed := false;
    details := sqlerrm;
  end;
  return next;

  test_name := 'is_system_master_resolves';
  begin
    perform public.is_system_master();
    passed := true;
    details := 'ok';
  exception when others then
    passed := false;
    details := sqlerrm;
  end;
  return next;
end;
$$;
