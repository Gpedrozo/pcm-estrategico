drop function if exists public.close_os_with_execution_atomic(
  uuid, uuid, text, text, text, integer, text, numeric, numeric, numeric, numeric, jsonb, uuid, text, text, text, text, jsonb
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
security invoker
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
        and ur.role in ('SOLICITANTE', 'VIEWER')
    ) into v_has_forbidden_role;

    if v_has_forbidden_role then
      raise exception 'forbidden_role';
    end if;
  end if;

  if p_usuario_fechamento is not null and p_usuario_fechamento <> v_actor_id then
    raise exception 'usuario_fechamento_mismatch';
  end if;

  v_effective_usuario_fechamento := v_actor_id;

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
          v_os_empresa_id,
          p_os_id,
          v_execucao_id,
          v_pausa_inicio,
          v_pausa_fim,
          v_pausa_duracao,
          nullif(v_pausa->>'motivo', ''),
          v_effective_usuario_fechamento
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

      select exists(
        select 1
        from public.materiais m
        where m.id = v_material_id
          and m.empresa_id = v_os_empresa_id
      ) into v_material_in_tenant;

      if not v_material_in_tenant then
        raise exception 'material_not_in_tenant';
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
    usuario_fechamento = v_effective_usuario_fechamento,
    modo_falha = p_modo_falha,
    causa_raiz = p_causa_raiz,
    acao_corretiva = p_acao_corretiva,
    licoes_aprendidas = p_licoes_aprendidas,
    updated_at = now()
  where id = p_os_id
    and empresa_id = v_os_empresa_id;

  if not found then
    raise exception 'os_update_conflict';
  end if;

  return query
  select
    p_os_id,
    v_execucao_id,
    'FECHADA'::text,
    v_total_materiais,
    coalesce(p_custo_total, 0);
end;
$$;

revoke execute on function public.close_os_with_execution_atomic(
  uuid, uuid, text, text, text, integer, text, numeric, numeric, numeric, numeric, jsonb, uuid, text, text, text, text, jsonb
) from anon;

grant execute on function public.close_os_with_execution_atomic(
  uuid, uuid, text, text, text, integer, text, numeric, numeric, numeric, numeric, jsonb, uuid, text, text, text, text, jsonb
) to authenticated;