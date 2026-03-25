-- Fix: close_os_with_execution_atomic was inserting into execucoes_os WITHOUT empresa_id,
-- violating RLS policy that requires empresa_id = current_empresa_id().
-- This migration recreates the function adding empresa_id to the INSERT.

-- Add motivo_cancelamento column for OS cancel reason tracking
alter table public.ordens_servico
  add column if not exists motivo_cancelamento text;

create or replace function public.close_os_with_execution_atomic(
  p_os_id uuid,
  p_mecanico_id uuid,
  p_mecanico_nome text,
  p_data_inicio date,
  p_hora_inicio text,
  p_data_fim date,
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
  v_actor_id uuid := auth.uid();
  v_execucao_id uuid;
  v_os_empresa_id uuid;
  v_os_status text;
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
  v_is_system_role boolean := false;
  v_has_tenant_access boolean := false;
  v_has_forbidden_role boolean := false;
  v_material_in_tenant boolean := false;
  v_effective_usuario_fechamento uuid;
  v_data_inicio date;
  v_data_fim date;
  v_inicio_ts timestamp;
  v_fim_ts timestamp;
  v_tempo_execucao_bruto integer;
  v_pausa_data_inicio date;
  v_pausa_data_fim date;
  v_pausa_inicio_ts timestamp;
  v_pausa_fim_ts timestamp;
begin
  if v_actor_id is null then
    raise exception 'unauthenticated_user';
  end if;

  select
    os.empresa_id,
    os.status
  into
    v_os_empresa_id,
    v_os_status
  from public.ordens_servico os
  where os.id = p_os_id
  for update;

  if v_os_empresa_id is null then
    raise exception 'os_not_found';
  end if;

  if v_os_status = 'FECHADA' then
    raise exception 'os_already_closed';
  end if;

  select exists(
    select 1
    from public.user_roles ur
    where ur.user_id = v_actor_id
      and ur.role in ('SYSTEM_OWNER', 'SYSTEM_ADMIN', 'MASTER_TI')
  ) into v_is_system_role;

  select exists(
    select 1
    from public.user_roles ur
    where ur.user_id = v_actor_id
      and ur.empresa_id = v_os_empresa_id
      and ur.role in ('ADMIN', 'MANAGER', 'PLANNER', 'TECHNICIAN', 'MASTER_TI', 'SYSTEM_ADMIN', 'SYSTEM_OWNER')
  ) into v_has_tenant_access;

  if not (v_is_system_role or v_has_tenant_access) then
    raise exception 'forbidden_tenant_scope';
  end if;

  if not v_is_system_role then
    select exists(
      select 1
      from public.user_roles ur
      where ur.user_id = v_actor_id
        and ur.empresa_id = v_os_empresa_id
        and ur.role in ('SOLICITANTE', 'USUARIO', 'VIEWER')
    ) into v_has_forbidden_role;

    if v_has_forbidden_role then
      raise exception 'forbidden_role_for_close';
    end if;
  end if;

  v_effective_usuario_fechamento := coalesce(p_usuario_fechamento, v_actor_id);

  v_data_inicio := coalesce(p_data_inicio, current_date);
  v_data_fim := coalesce(p_data_fim, current_date);

  v_inicio_ts := (v_data_inicio || ' ' || coalesce(nullif(p_hora_inicio, ''), '08:00'))::timestamp;
  v_fim_ts := (v_data_fim || ' ' || coalesce(nullif(p_hora_fim, ''), '17:00'))::timestamp;

  if v_fim_ts <= v_inicio_ts then
    v_fim_ts := v_inicio_ts + interval '1 minute';
  end if;

  v_tempo_execucao_bruto := greatest(1, floor(extract(epoch from (v_fim_ts - v_inicio_ts)) / 60)::int);

  if p_pausas is not null and jsonb_typeof(p_pausas) = 'array' then
    for v_pausa in select value from jsonb_array_elements(p_pausas)
    loop
      begin
        v_pausa_inicio := nullif(v_pausa.value->>'inicio', '')::time;
        v_pausa_fim := nullif(v_pausa.value->>'fim', '')::time;

        if v_pausa_inicio is null or v_pausa_fim is null then
          continue;
        end if;

        v_pausa_data_inicio := coalesce((nullif(v_pausa.value->>'data_inicio', ''))::date, v_data_inicio);
        v_pausa_data_fim := coalesce((nullif(v_pausa.value->>'data_fim', ''))::date, v_pausa_data_inicio);

        v_pausa_inicio_ts := (v_pausa_data_inicio || ' ' || v_pausa_inicio::text)::timestamp;
        v_pausa_fim_ts := (v_pausa_data_fim || ' ' || v_pausa_fim::text)::timestamp;

        if v_pausa_fim_ts <= v_pausa_inicio_ts then
          continue;
        end if;

        if v_pausa_inicio_ts < v_inicio_ts or v_pausa_fim_ts > v_fim_ts then
          continue;
        end if;

        v_pausa_duracao := greatest(1, floor(extract(epoch from (v_pausa_fim_ts - v_pausa_inicio_ts)) / 60)::int);
        v_tempo_pausas := v_tempo_pausas + v_pausa_duracao;
      exception when others then
        continue;
      end;
    end loop;
  end if;

  v_tempo_liquido := greatest(coalesce(v_tempo_execucao_bruto, 0) - coalesce(v_tempo_pausas, 0), 0);

  -- FIX: include empresa_id to satisfy RLS policy tenant_insert on execucoes_os
  insert into public.execucoes_os (
    os_id,
    empresa_id,
    mecanico_id,
    mecanico_nome,
    data_inicio,
    hora_inicio,
    data_fim,
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
    v_os_empresa_id,
    p_mecanico_id,
    p_mecanico_nome,
    v_data_inicio,
    p_hora_inicio,
    v_data_fim,
    p_hora_fim,
    v_tempo_liquido,
    v_tempo_execucao_bruto,
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
        v_pausa_inicio := nullif(v_pausa.value->>'inicio', '')::time;
        v_pausa_fim := nullif(v_pausa.value->>'fim', '')::time;

        if v_pausa_inicio is null or v_pausa_fim is null then
          continue;
        end if;

        v_pausa_data_inicio := coalesce((nullif(v_pausa.value->>'data_inicio', ''))::date, v_data_inicio);
        v_pausa_data_fim := coalesce((nullif(v_pausa.value->>'data_fim', ''))::date, v_pausa_data_inicio);

        insert into public.execucoes_os_pausas (
          execucao_id,
          empresa_id,
          data_inicio,
          hora_inicio,
          data_fim,
          hora_fim,
          motivo,
          duracao_minutos
        ) values (
          v_execucao_id,
          v_os_empresa_id,
          v_pausa_data_inicio,
          v_pausa_inicio::text,
          v_pausa_data_fim,
          v_pausa_fim::text,
          coalesce(nullif(v_pausa.value->>'motivo', ''), 'Pausa'),
          greatest(1, floor(extract(epoch from (
            (v_pausa_data_fim || ' ' || v_pausa_fim::text)::timestamp -
            (v_pausa_data_inicio || ' ' || v_pausa_inicio::text)::timestamp
          )) / 60)::int)
        );
      exception when others then
        continue;
      end;
    end loop;
  end if;

  if p_materiais is not null and jsonb_typeof(p_materiais) = 'array' then
    for v_item in select value from jsonb_array_elements(p_materiais)
    loop
      begin
        v_material_id := (v_item.value->>'material_id')::uuid;
        v_qtd := coalesce((v_item.value->>'quantidade')::numeric, 0);
        v_unit := coalesce((v_item.value->>'custo_unitario')::numeric, 0);
        v_item_total := v_qtd * v_unit;
        v_total_materiais := v_total_materiais + v_item_total;

        if not v_is_system_role then
          select exists(
            select 1 from public.materiais m
            where m.id = v_material_id
              and m.empresa_id = v_os_empresa_id
          ) into v_material_in_tenant;

          if not v_material_in_tenant then
            continue;
          end if;
        end if;

        insert into public.materiais_os (
          empresa_id,
          os_id,
          material_id,
          quantidade,
          custo_unitario
        ) values (
          v_os_empresa_id,
          p_os_id,
          v_material_id,
          v_qtd,
          v_unit
        );

        update public.materiais
        set quantidade_estoque = greatest(0, coalesce(quantidade_estoque, 0) - v_qtd)
        where id = v_material_id
          and empresa_id = v_os_empresa_id;
      exception when others then
        continue;
      end;
    end loop;
  end if;

  update public.ordens_servico
  set
    status = 'FECHADA',
    data_fechamento = now(),
    usuario_fechamento = v_effective_usuario_fechamento
  where id = p_os_id;

  return query select
    p_os_id as os_id,
    v_execucao_id as execucao_id,
    'FECHADA'::text as os_status,
    v_total_materiais as total_materiais,
    p_custo_total as total_custo;
end;
$$;
