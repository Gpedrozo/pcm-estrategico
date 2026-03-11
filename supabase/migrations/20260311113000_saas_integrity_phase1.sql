-- SaaS Integrity Phase 1
-- 1) Atomic OS closing transaction
-- 2) Async notifications queue + SLA triggers
-- 3) Soft delete governance + restore helper
-- 4) Budget/forecast base
-- 5) RLS automated validation suite

set check_function_bodies = off;

-- -----------------------------------------------------------------------------
-- Async notifications queue (outside browser session)
-- -----------------------------------------------------------------------------
create table if not exists public.system_notifications (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid,
  channel text not null default 'IN_APP' check (channel in ('IN_APP', 'EMAIL', 'WEBHOOK')),
  event_type text not null,
  recipient text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED', 'CANCELED')),
  attempts integer not null default 0,
  scheduled_for timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_system_notifications_empresa_status
  on public.system_notifications (empresa_id, status, scheduled_for);

alter table public.system_notifications enable row level security;

drop policy if exists system_notifications_read on public.system_notifications;
create policy system_notifications_read
on public.system_notifications
for select
using (public.is_system_master() or empresa_id = public.current_empresa_id());

drop policy if exists system_notifications_insert on public.system_notifications;
create policy system_notifications_insert
on public.system_notifications
for insert
with check (public.is_system_master() or empresa_id = public.current_empresa_id());

drop policy if exists system_notifications_update on public.system_notifications;
create policy system_notifications_update
on public.system_notifications
for update
using (public.is_system_master() or empresa_id = public.current_empresa_id())
with check (public.is_system_master() or empresa_id = public.current_empresa_id());

create or replace function public.enqueue_system_notification(
  p_empresa_id uuid,
  p_channel text,
  p_event_type text,
  p_recipient text,
  p_payload jsonb,
  p_scheduled_for timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.system_notifications (
    empresa_id,
    channel,
    event_type,
    recipient,
    payload,
    scheduled_for
  )
  values (
    p_empresa_id,
    coalesce(p_channel, 'IN_APP'),
    p_event_type,
    p_recipient,
    coalesce(p_payload, '{}'::jsonb),
    coalesce(p_scheduled_for, now())
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.enqueue_system_notification(uuid, text, text, text, jsonb, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- Soft delete baseline and restore helper
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'equipamentos') then
    alter table public.equipamentos add column if not exists deleted_at timestamptz;
    alter table public.equipamentos add column if not exists deleted_by uuid;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'materiais') then
    alter table public.materiais add column if not exists deleted_at timestamptz;
    alter table public.materiais add column if not exists deleted_by uuid;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'fornecedores') then
    alter table public.fornecedores add column if not exists deleted_at timestamptz;
    alter table public.fornecedores add column if not exists deleted_by uuid;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'contratos') then
    alter table public.contratos add column if not exists deleted_at timestamptz;
    alter table public.contratos add column if not exists deleted_by uuid;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'planos_preventivos') then
    alter table public.planos_preventivos add column if not exists deleted_at timestamptz;
    alter table public.planos_preventivos add column if not exists deleted_by uuid;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'mecanicos') then
    alter table public.mecanicos add column if not exists deleted_at timestamptz;
    alter table public.mecanicos add column if not exists deleted_by uuid;
  end if;
end
$$;

create or replace function public.restore_soft_deleted_record(
  p_table_name text,
  p_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
  v_sql text;
begin
  v_allowed := p_table_name in (
    'equipamentos',
    'materiais',
    'fornecedores',
    'contratos',
    'planos_preventivos',
    'mecanicos'
  );

  if not v_allowed then
    raise exception 'table_not_allowed_for_restore: %', p_table_name;
  end if;

  v_sql := format(
    'update public.%I set deleted_at = null, deleted_by = null where id = $1 and deleted_at is not null',
    p_table_name
  );

  execute v_sql using p_id;
  return found;
end;
$$;

grant execute on function public.restore_soft_deleted_record(text, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- SLA view for OS monitoring
-- -----------------------------------------------------------------------------
create or replace view public.v_ordens_servico_sla as
select
  os.id,
  os.empresa_id,
  os.numero_os,
  os.tag,
  os.tipo,
  os.prioridade,
  os.status,
  os.data_solicitacao,
  os.data_fechamento,
  greatest(0, floor(extract(epoch from (coalesce(os.data_fechamento, now()) - os.data_solicitacao)) / 86400))::int as dias_aberta,
  case
    when os.prioridade = 'URGENTE' then 1
    when os.prioridade = 'ALTA' then 3
    when os.prioridade = 'MEDIA' then 7
    else 14
  end as sla_dias,
  (
    greatest(0, floor(extract(epoch from (coalesce(os.data_fechamento, now()) - os.data_solicitacao)) / 86400))::int >
    case
      when os.prioridade = 'URGENTE' then 1
      when os.prioridade = 'ALTA' then 3
      when os.prioridade = 'MEDIA' then 7
      else 14
    end
  ) as is_breached
from public.ordens_servico os;

-- -----------------------------------------------------------------------------
-- Atomic closing flow for OS
-- -----------------------------------------------------------------------------
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
  p_licoes_aprendidas text default null
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
  v_total_materiais numeric := 0;
  v_item jsonb;
  v_material_id uuid;
  v_qtd numeric;
  v_unit numeric;
  v_item_total numeric;
begin
  select exists(select 1 from public.ordens_servico where id = p_os_id) into v_os_exists;
  if not v_os_exists then
    raise exception 'os_not_found';
  end if;

  insert into public.execucoes_os (
    os_id,
    mecanico_id,
    mecanico_nome,
    hora_inicio,
    hora_fim,
    tempo_execucao,
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
    p_tempo_execucao,
    p_servico_executado,
    p_custo_mao_obra,
    p_custo_materiais,
    p_custo_terceiros,
    p_custo_total
  )
  returning id into v_execucao_id;

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
  uuid, uuid, text, text, text, integer, text, numeric, numeric, numeric, numeric, jsonb, uuid, text, text, text, text
) to authenticated;

-- -----------------------------------------------------------------------------
-- SLA notifications triggers
-- -----------------------------------------------------------------------------
create or replace function public.trg_enqueue_solicitacao_sla_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_sla integer;
begin
  v_empresa_id := coalesce(new.empresa_id, public.current_empresa_id());
  v_sla := coalesce(new.sla_horas, case new.classificacao when 'EMERGENCIAL' then 2 when 'URGENTE' then 8 else 72 end);

  if new.classificacao in ('EMERGENCIAL', 'URGENTE') then
    perform public.enqueue_system_notification(
      v_empresa_id,
      'IN_APP',
      'SOLICITACAO_SLA_CRITICA',
      null,
      jsonb_build_object(
        'solicitacao_id', new.id,
        'classificacao', new.classificacao,
        'tag', new.tag,
        'sla_horas', v_sla,
        'mensagem', 'Solicitacao critica criada e aguardando atendimento.'
      ),
      now()
    );
  end if;

  return new;
end;
$$;

create or replace function public.trg_enqueue_os_closed_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
begin
  if new.status = 'FECHADA' and coalesce(old.status, '') <> 'FECHADA' then
    v_empresa_id := coalesce(new.empresa_id, public.current_empresa_id());

    perform public.enqueue_system_notification(
      v_empresa_id,
      'IN_APP',
      'OS_FECHADA',
      null,
      jsonb_build_object(
        'os_id', new.id,
        'numero_os', new.numero_os,
        'tag', new.tag,
        'mensagem', 'Ordem de servico fechada com sucesso.'
      ),
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_os_closed_notification on public.ordens_servico;
create trigger trg_os_closed_notification
after update on public.ordens_servico
for each row
execute function public.trg_enqueue_os_closed_notification();

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'solicitacoes') then
    execute 'drop trigger if exists trg_solicitacao_sla_notification on public.solicitacoes';
    execute 'create trigger trg_solicitacao_sla_notification after insert on public.solicitacoes for each row execute function public.trg_enqueue_solicitacao_sla_notification()';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'solicitacoes_manutencao') then
    execute 'drop trigger if exists trg_solicitacao_sla_notification on public.solicitacoes_manutencao';
    execute 'create trigger trg_solicitacao_sla_notification after insert on public.solicitacoes_manutencao for each row execute function public.trg_enqueue_solicitacao_sla_notification()';
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Budget and forecast base tables/views
-- -----------------------------------------------------------------------------
create table if not exists public.orcamentos_manutencao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  ano integer not null,
  mes integer not null check (mes between 1 and 12),
  categoria text not null check (categoria in ('MAO_OBRA', 'MATERIAIS', 'TERCEIROS', 'TOTAL')),
  valor_orcado numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, ano, mes, categoria)
);

alter table public.orcamentos_manutencao enable row level security;

drop policy if exists orcamentos_manutencao_read on public.orcamentos_manutencao;
create policy orcamentos_manutencao_read
on public.orcamentos_manutencao
for select
using (public.is_system_master() or empresa_id = public.current_empresa_id());

drop policy if exists orcamentos_manutencao_write on public.orcamentos_manutencao;
create policy orcamentos_manutencao_write
on public.orcamentos_manutencao
for all
using (public.is_system_master() or empresa_id = public.current_empresa_id())
with check (public.is_system_master() or empresa_id = public.current_empresa_id());

create or replace view public.v_custos_orcado_realizado as
with realizado as (
  select
    os.empresa_id,
    extract(year from e.created_at)::int as ano,
    extract(month from e.created_at)::int as mes,
    sum(coalesce(e.custo_mao_obra, 0)) as realizado_mao_obra,
    sum(coalesce(e.custo_materiais, 0)) as realizado_materiais,
    sum(coalesce(e.custo_terceiros, 0)) as realizado_terceiros,
    sum(coalesce(e.custo_total, 0)) as realizado_total
  from public.execucoes_os e
  join public.ordens_servico os on os.id = e.os_id
  group by os.empresa_id, extract(year from e.created_at), extract(month from e.created_at)
),
orcado as (
  select
    empresa_id,
    ano,
    mes,
    sum(case when categoria = 'MAO_OBRA' then valor_orcado else 0 end) as orcado_mao_obra,
    sum(case when categoria = 'MATERIAIS' then valor_orcado else 0 end) as orcado_materiais,
    sum(case when categoria = 'TERCEIROS' then valor_orcado else 0 end) as orcado_terceiros,
    sum(case when categoria = 'TOTAL' then valor_orcado else 0 end) as orcado_total
  from public.orcamentos_manutencao
  group by empresa_id, ano, mes
)
select
  coalesce(r.empresa_id, o.empresa_id) as empresa_id,
  coalesce(r.ano, o.ano) as ano,
  coalesce(r.mes, o.mes) as mes,
  coalesce(o.orcado_mao_obra, 0) as orcado_mao_obra,
  coalesce(o.orcado_materiais, 0) as orcado_materiais,
  coalesce(o.orcado_terceiros, 0) as orcado_terceiros,
  coalesce(o.orcado_total, 0) as orcado_total,
  coalesce(r.realizado_mao_obra, 0) as realizado_mao_obra,
  coalesce(r.realizado_materiais, 0) as realizado_materiais,
  coalesce(r.realizado_terceiros, 0) as realizado_terceiros,
  coalesce(r.realizado_total, 0) as realizado_total
from realizado r
full outer join orcado o
  on o.empresa_id = r.empresa_id
 and o.ano = r.ano
 and o.mes = r.mes;

-- -----------------------------------------------------------------------------
-- Automated RLS validation suite
-- -----------------------------------------------------------------------------
create or replace function public.assert_table_rls_enabled(p_schema text, p_table text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
begin
  select c.relrowsecurity
  into v_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = p_schema
    and c.relname = p_table;

  return coalesce(v_enabled, false);
end;
$$;

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

grant execute on function public.run_multitenant_rls_suite() to authenticated;

-- -----------------------------------------------------------------------------
-- Async notifications processor baseline
-- -----------------------------------------------------------------------------
create or replace function public.process_pending_system_notifications(p_limit integer default 100)
returns table(notification_id uuid, processed_status text, details text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  for v_item in
    select id, channel, event_type, payload, attempts
      from public.system_notifications
     where status = 'PENDING'
       and scheduled_for <= now()
     order by scheduled_for asc
     limit greatest(1, coalesce(p_limit, 100))
     for update skip locked
  loop
    if v_item.channel = 'IN_APP' then
      update public.system_notifications
         set status = 'SENT',
             processed_at = now(),
             attempts = attempts + 1,
             last_error = null
       where id = v_item.id;

      notification_id := v_item.id;
      processed_status := 'SENT';
      details := 'in_app_event_registered';
      return next;
    else
      update public.system_notifications
         set status = case when attempts + 1 >= 5 then 'FAILED' else 'PENDING' end,
             attempts = attempts + 1,
             last_error = case
               when attempts + 1 >= 5 then 'delivery_provider_not_configured_max_retries'
               else 'delivery_provider_not_configured_retry_pending'
             end
       where id = v_item.id;

      notification_id := v_item.id;
      processed_status := case when v_item.attempts + 1 >= 5 then 'FAILED' else 'PENDING' end;
      details := 'external_delivery_not_configured';
      return next;
    end if;
  end loop;
end;
$$;

grant execute on function public.process_pending_system_notifications(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- FMEA/RCA/Preventive/OS integration suggestions
-- -----------------------------------------------------------------------------
create table if not exists public.maintenance_action_suggestions (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  origin_type text not null check (origin_type in ('FMEA', 'RCA', 'PLANO_PREVENTIVO', 'OS')),
  origin_id uuid not null,
  recommendation_type text not null check (recommendation_type in ('CRIAR_OS', 'AJUSTAR_PLANO', 'REVISAR_FMEA', 'ABRIR_RCA')),
  prioridade text not null default 'MEDIA' check (prioridade in ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE')),
  titulo text not null,
  descricao text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'PENDENTE' check (status in ('PENDENTE', 'APROVADA', 'DESCARTADA', 'CONVERTIDA_OS')),
  os_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_maintenance_action_suggestions_empresa_status
  on public.maintenance_action_suggestions (empresa_id, status, prioridade);

alter table public.maintenance_action_suggestions enable row level security;

drop policy if exists maintenance_action_suggestions_read on public.maintenance_action_suggestions;
create policy maintenance_action_suggestions_read
on public.maintenance_action_suggestions
for select
using (public.is_system_master() or empresa_id = public.current_empresa_id());

drop policy if exists maintenance_action_suggestions_write on public.maintenance_action_suggestions;
create policy maintenance_action_suggestions_write
on public.maintenance_action_suggestions
for all
using (public.is_system_master() or empresa_id = public.current_empresa_id())
with check (public.is_system_master() or empresa_id = public.current_empresa_id());

create or replace function public.create_maintenance_action_suggestion(
  p_empresa_id uuid,
  p_origin_type text,
  p_origin_id uuid,
  p_recommendation_type text,
  p_prioridade text,
  p_titulo text,
  p_descricao text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.maintenance_action_suggestions (
    empresa_id,
    origin_type,
    origin_id,
    recommendation_type,
    prioridade,
    titulo,
    descricao,
    metadata
  )
  values (
    p_empresa_id,
    p_origin_type,
    p_origin_id,
    p_recommendation_type,
    coalesce(p_prioridade, 'MEDIA'),
    p_titulo,
    p_descricao,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  perform public.enqueue_system_notification(
    p_empresa_id,
    'IN_APP',
    'MAINTENANCE_ACTION_SUGGESTION_CREATED',
    null,
    jsonb_build_object(
      'suggestion_id', v_id,
      'origin_type', p_origin_type,
      'origin_id', p_origin_id,
      'recommendation_type', p_recommendation_type,
      'prioridade', coalesce(p_prioridade, 'MEDIA'),
      'titulo', p_titulo
    ),
    now()
  );

  return v_id;
end;
$$;

grant execute on function public.create_maintenance_action_suggestion(uuid, text, uuid, text, text, text, text, jsonb) to authenticated;

create or replace function public.trg_fmea_generate_suggestion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_rpn integer;
begin
  if coalesce(new.status, 'PENDENTE') = 'CONCLUIDO' then
    return new;
  end if;

  v_rpn := coalesce(new.rpn, 0);
  if v_rpn < 150 then
    return new;
  end if;

  v_empresa_id := coalesce(new.empresa_id, public.current_empresa_id());

  perform public.create_maintenance_action_suggestion(
    v_empresa_id,
    'FMEA',
    new.id,
    'CRIAR_OS',
    case when v_rpn >= 250 then 'URGENTE' when v_rpn >= 200 then 'ALTA' else 'MEDIA' end,
    format('FMEA alto risco (%s) - %s', v_rpn, coalesce(new.tag, 'SEM_TAG')),
    coalesce(new.acao_recomendada, 'Risco elevado identificado em FMEA. Avaliar abertura de O.S corretiva/preventiva.'),
    jsonb_build_object('tag', new.tag, 'rpn', v_rpn, 'modo_falha', new.modo_falha)
  );

  return new;
end;
$$;

create or replace function public.trg_rca_generate_suggestion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
begin
  if coalesce(new.status, 'EM_ANALISE') not in ('CONCLUIDA', 'ENCERRADA') then
    return new;
  end if;

  if coalesce(new.causa_raiz_identificada, '') = '' then
    return new;
  end if;

  v_empresa_id := coalesce(new.empresa_id, public.current_empresa_id());

  perform public.create_maintenance_action_suggestion(
    v_empresa_id,
    'RCA',
    new.id,
    'AJUSTAR_PLANO',
    'ALTA',
    format('RCA concluida - %s', coalesce(new.titulo, 'sem titulo')),
    format('Causa raiz identificada: %s', new.causa_raiz_identificada),
    jsonb_build_object('tag', new.tag, 'causa_raiz', new.causa_raiz_identificada, 'metodo', new.metodo_analise)
  );

  return new;
end;
$$;

create or replace function public.trg_preventiva_overdue_generate_suggestion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
begin
  if coalesce(new.ativo, true) = false then
    return new;
  end if;

  if new.proxima_execucao is null or new.proxima_execucao >= now()::date then
    return new;
  end if;

  v_empresa_id := coalesce(new.empresa_id, public.current_empresa_id());

  perform public.create_maintenance_action_suggestion(
    v_empresa_id,
    'PLANO_PREVENTIVO',
    new.id,
    'CRIAR_OS',
    'MEDIA',
    format('Preventiva em atraso - %s', coalesce(new.codigo, 'SEM_CODIGO')),
    format('Plano preventivo %s esta atrasado desde %s.', coalesce(new.nome, 'sem nome'), new.proxima_execucao::date),
    jsonb_build_object('tag', new.tag, 'codigo', new.codigo, 'proxima_execucao', new.proxima_execucao)
  );

  return new;
end;
$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'fmea') then
    execute 'drop trigger if exists trg_fmea_generate_suggestion on public.fmea';
    execute 'create trigger trg_fmea_generate_suggestion after insert or update on public.fmea for each row execute function public.trg_fmea_generate_suggestion()';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'analise_causa_raiz') then
    execute 'drop trigger if exists trg_rca_generate_suggestion on public.analise_causa_raiz';
    execute 'create trigger trg_rca_generate_suggestion after insert or update on public.analise_causa_raiz for each row execute function public.trg_rca_generate_suggestion()';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'planos_preventivos') then
    execute 'drop trigger if exists trg_preventiva_overdue_generate_suggestion on public.planos_preventivos';
    execute 'create trigger trg_preventiva_overdue_generate_suggestion after insert or update on public.planos_preventivos for each row execute function public.trg_preventiva_overdue_generate_suggestion()';
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Database-first KPI aggregation for dashboards
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
    coalesce(e.tempo_execucao, 0) / 60.0 as tempo_execucao_horas,
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
