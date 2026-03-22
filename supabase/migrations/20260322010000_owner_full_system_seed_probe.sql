begin;

create table if not exists public.owner_full_seed_log (
  id bigserial primary key,
  run_id uuid not null,
  table_name text not null,
  status text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_owner_full_seed_log_run_id
  on public.owner_full_seed_log (run_id);

create index if not exists idx_owner_full_seed_log_table_name
  on public.owner_full_seed_log (table_name);

do $$
declare
  v_run_id uuid := gen_random_uuid();
  v_email text := 'owner.full.seed@gppis.com.br';
  v_password text := 'OwnerFullSeed!2026';
  v_user_id uuid;
  v_identity_id uuid;
  v_empresa_id uuid;

  v_table record;
  v_col record;
  v_ref record;

  v_cols text[];
  v_vals text[];
  v_missing text[];
  v_expr text;
  v_sql text;
  v_err text;

  v_known_id uuid;
  v_inserted_id uuid;
  v_pass integer;

  v_has_profiles_empresa_id boolean := false;
  v_has_profiles_email boolean := false;
  v_has_profiles_updated_at boolean := false;
  v_has_user_roles_empresa_id boolean := false;
begin
  insert into auth.instances (id, uuid, raw_base_config, created_at, updated_at)
  select
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    jsonb_build_object('site_url', 'https://owner.gppis.com.br'),
    now(),
    now()
  where not exists (
    select 1
    from auth.instances
    where id = '00000000-0000-0000-0000-000000000000'
  );

  select id into v_empresa_id
  from public.empresas
  where slug = 'gppis'
  limit 1;

  if v_empresa_id is null then
    select id into v_empresa_id
    from public.empresas
    order by created_at nulls last, id
    limit 1;
  end if;

  if v_empresa_id is null then
    raise exception 'Nenhuma empresa encontrada em public.empresas para vinculo de seed owner.';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(v_email)
  order by created_at desc nulls last
  limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();
    v_identity_id := gen_random_uuid();

    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      lower(v_email),
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('nome', 'Owner Full Seed'),
      now(),
      now()
    );

    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      created_at,
      updated_at,
      last_sign_in_at
    )
    values (
      v_identity_id,
      v_user_id,
      lower(v_email),
      jsonb_build_object('sub', v_user_id::text, 'email', lower(v_email)),
      'email',
      now(),
      now(),
      now()
    );
  else
    update auth.users
    set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        confirmation_sent_at = coalesce(confirmation_sent_at, now()),
        updated_at = now()
    where id = v_user_id;

    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      created_at,
      updated_at,
      last_sign_in_at
    )
    select
      gen_random_uuid(),
      v_user_id,
      lower(v_email),
      jsonb_build_object('sub', v_user_id::text, 'email', lower(v_email)),
      'email',
      now(),
      now(),
      now()
    where not exists (
      select 1
      from auth.identities
      where user_id = v_user_id
        and provider = 'email'
    );
  end if;

  if to_regclass('public.profiles') is not null then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'empresa_id'
    ) into v_has_profiles_empresa_id;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'email'
    ) into v_has_profiles_email;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'updated_at'
    ) into v_has_profiles_updated_at;

    if v_has_profiles_empresa_id and v_has_profiles_email then
      v_sql :=
        'insert into public.profiles (id, empresa_id, nome, email) ' ||
        'values ($1, $2, $3, $4) ' ||
        'on conflict (id) do update set empresa_id = excluded.empresa_id, nome = excluded.nome, email = excluded.email';
      if v_has_profiles_updated_at then
        v_sql := v_sql || ', updated_at = now()';
      end if;
      execute v_sql using v_user_id, v_empresa_id, 'Owner Full Seed', lower(v_email);
    elsif v_has_profiles_empresa_id then
      v_sql :=
        'insert into public.profiles (id, empresa_id, nome) ' ||
        'values ($1, $2, $3) ' ||
        'on conflict (id) do update set empresa_id = excluded.empresa_id, nome = excluded.nome';
      if v_has_profiles_updated_at then
        v_sql := v_sql || ', updated_at = now()';
      end if;
      execute v_sql using v_user_id, v_empresa_id, 'Owner Full Seed';
    elsif v_has_profiles_email then
      v_sql :=
        'insert into public.profiles (id, nome, email) ' ||
        'values ($1, $2, $3) ' ||
        'on conflict (id) do update set nome = excluded.nome, email = excluded.email';
      if v_has_profiles_updated_at then
        v_sql := v_sql || ', updated_at = now()';
      end if;
      execute v_sql using v_user_id, 'Owner Full Seed', lower(v_email);
    else
      v_sql :=
        'insert into public.profiles (id, nome) ' ||
        'values ($1, $2) ' ||
        'on conflict (id) do update set nome = excluded.nome';
      if v_has_profiles_updated_at then
        v_sql := v_sql || ', updated_at = now()';
      end if;
      execute v_sql using v_user_id, 'Owner Full Seed';
    end if;
  end if;

  if to_regclass('public.user_roles') is not null then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'user_roles'
        and column_name = 'empresa_id'
    ) into v_has_user_roles_empresa_id;

    if v_has_user_roles_empresa_id then
      insert into public.user_roles (user_id, empresa_id, role)
      values (v_user_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role)
      on conflict do nothing;
    else
      insert into public.user_roles (user_id, role)
      values (v_user_id, 'SYSTEM_OWNER'::public.app_role)
      on conflict do nothing;
    end if;
  end if;

  create temporary table tmp_seed_known_ids (
    table_name text primary key,
    id uuid not null
  ) on commit drop;

  create temporary table tmp_seed_table_done (
    table_name text primary key
  ) on commit drop;

  create temporary table tmp_seed_logs (
    table_name text not null,
    status text not null,
    detail text
  ) on commit drop;

  insert into tmp_seed_known_ids (table_name, id)
  values
    ('public.empresas', v_empresa_id),
    ('auth.users', v_user_id),
    ('public.profiles', v_user_id)
  on conflict (table_name) do update set id = excluded.id;

  for v_pass in 1..5 loop
    for v_table in
      select t.table_name
      from information_schema.tables t
      where t.table_schema = 'public'
        and t.table_type = 'BASE TABLE'
        and t.table_name not in ('schema_migrations', 'owner_full_seed_log')
      order by t.table_name
    loop
      if exists (select 1 from tmp_seed_table_done where table_name = v_table.table_name) then
        continue;
      end if;

      v_cols := array[]::text[];
      v_vals := array[]::text[];
      v_missing := array[]::text[];

      for v_col in
        select
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.udt_schema,
          c.udt_name,
          c.is_identity,
          c.is_generated
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = v_table.table_name
        order by c.ordinal_position
      loop
        v_expr := null;

        select
          ccu.table_schema as ref_schema,
          ccu.table_name as ref_table,
          ccu.column_name as ref_column
        into v_ref
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on kcu.constraint_name = tc.constraint_name
         and kcu.constraint_schema = tc.constraint_schema
        join information_schema.constraint_column_usage ccu
          on ccu.constraint_name = tc.constraint_name
         and ccu.constraint_schema = tc.constraint_schema
        where tc.table_schema = 'public'
          and tc.table_name = v_table.table_name
          and tc.constraint_type = 'FOREIGN KEY'
          and kcu.column_name = v_col.column_name
        limit 1;

        if v_ref.ref_table is not null then
          if v_ref.ref_schema = 'public' and v_ref.ref_table = 'empresas' then
            v_expr := quote_literal(v_empresa_id::text) || '::uuid';
          elsif (v_ref.ref_schema = 'auth' and v_ref.ref_table = 'users')
             or (v_ref.ref_schema = 'public' and v_ref.ref_table = 'profiles') then
            v_expr := quote_literal(v_user_id::text) || '::uuid';
          else
            select id
              into v_known_id
            from tmp_seed_known_ids
            where table_name = v_ref.ref_schema || '.' || v_ref.ref_table;

            if v_known_id is not null then
              v_expr := quote_literal(v_known_id::text) || '::uuid';
            end if;
          end if;
        end if;

        if v_expr is null then
          if v_col.column_name = 'id' and v_col.udt_name = 'uuid' then
            v_expr := 'gen_random_uuid()';
          elsif v_col.column_name in ('empresa_id') and v_col.udt_name = 'uuid' then
            v_expr := quote_literal(v_empresa_id::text) || '::uuid';
          elsif v_col.column_name in ('user_id', 'owner_id', 'profile_id', 'created_by', 'updated_by', 'responsavel_id', 'mecanico_id', 'tecnico_id') and v_col.udt_name = 'uuid' then
            v_expr := quote_literal(v_user_id::text) || '::uuid';
          elsif v_col.column_name in ('email') then
            v_expr := quote_literal(lower(v_email));
          elsif v_col.column_name in ('nome', 'name') then
            v_expr := quote_literal('Owner Full Seed');
          elsif v_col.column_name in ('titulo', 'title') then
            v_expr := quote_literal('Registro seed owner');
          elsif v_col.column_name in ('descricao', 'description') then
            v_expr := quote_literal('Preenchimento automatico para teste de cobertura de tabelas.');
          elsif v_col.column_name in ('status') then
            v_expr := quote_literal('ativo');
          elsif v_col.column_name in ('codigo', 'code') then
            v_expr := quote_literal('SEED-' || upper(substr(md5(v_table.table_name), 1, 8)));
          elsif v_col.column_name = 'slug' then
            v_expr := quote_literal('seed-' || replace(v_table.table_name, '_', '-') || '-' || substr(v_user_id::text, 1, 8));
          elsif v_col.column_name in ('created_at', 'updated_at', 'last_sign_in_at') then
            v_expr := 'now()';
          elsif v_col.data_type = 'boolean' then
            v_expr := 'true';
          elsif v_col.data_type in ('smallint', 'integer', 'bigint') then
            v_expr := '1';
          elsif v_col.data_type in ('numeric', 'real', 'double precision') then
            v_expr := '1';
          elsif v_col.data_type = 'date' then
            v_expr := 'current_date';
          elsif v_col.data_type like 'timestamp%' then
            v_expr := 'now()';
          elsif v_col.data_type = 'jsonb' then
            v_expr := '''{}''::jsonb';
          elsif v_col.data_type = 'json' then
            v_expr := '''{}''::json';
          elsif v_col.data_type in ('text', 'character varying', 'character') then
            v_expr := quote_literal('seed_' || v_table.table_name || '_' || v_col.column_name);
          elsif v_col.udt_name = 'uuid' then
            v_expr := 'gen_random_uuid()';
          end if;
        end if;

        if v_expr is not null then
          v_cols := array_append(v_cols, format('%I', v_col.column_name));
          v_vals := array_append(v_vals, v_expr);
        elsif v_col.is_nullable = 'NO'
           and coalesce(v_col.column_default, '') = ''
           and coalesce(v_col.is_identity, 'NO') <> 'YES'
           and coalesce(v_col.is_generated, 'NEVER') = 'NEVER' then
          v_missing := array_append(v_missing, v_col.column_name);
        end if;
      end loop;

      if array_length(v_missing, 1) is not null then
        insert into tmp_seed_logs (table_name, status, detail)
        values (
          v_table.table_name,
          'SKIPPED',
          'Campos obrigatorios sem valor automatico: ' || array_to_string(v_missing, ', ')
        );
        continue;
      end if;

      if array_length(v_cols, 1) is null then
        insert into tmp_seed_logs (table_name, status, detail)
        values (v_table.table_name, 'SKIPPED', 'Tabela sem colunas elegiveis para insercao automatica.');
        continue;
      end if;

      begin
        v_sql := format(
          'insert into public.%I (%s) values (%s) on conflict do nothing returning id',
          v_table.table_name,
          array_to_string(v_cols, ', '),
          array_to_string(v_vals, ', ')
        );

        v_inserted_id := null;
        execute v_sql into v_inserted_id;

        insert into tmp_seed_table_done (table_name)
        values (v_table.table_name)
        on conflict (table_name) do nothing;

        if v_inserted_id is not null then
          insert into tmp_seed_known_ids (table_name, id)
          values ('public.' || v_table.table_name, v_inserted_id)
          on conflict (table_name) do update set id = excluded.id;

          insert into tmp_seed_logs (table_name, status, detail)
          values (v_table.table_name, 'OK', 'Inserido com id=' || v_inserted_id::text);
        else
          insert into tmp_seed_logs (table_name, status, detail)
          values (v_table.table_name, 'OK', 'Sem retorno de id (insert sem coluna id ou conflito).');
        end if;
      exception when others then
        get stacked diagnostics v_err = message_text;

        if position('violates foreign key constraint' in lower(v_err)) > 0 then
          insert into tmp_seed_logs (table_name, status, detail)
          values (v_table.table_name, 'RETRY', v_err);
        else
          insert into tmp_seed_logs (table_name, status, detail)
          values (v_table.table_name, 'ERROR', v_err);
          insert into tmp_seed_table_done (table_name)
          values (v_table.table_name)
          on conflict (table_name) do nothing;
        end if;
      end;
    end loop;
  end loop;

  insert into public.owner_full_seed_log (run_id, table_name, status, detail)
  select v_run_id, table_name, status, detail
  from tmp_seed_logs;

  raise notice 'OWNER_FULL_SEED_RUN_ID=%', v_run_id;
  raise notice 'OWNER_FULL_SEED_USER_EMAIL=%', v_email;
  raise notice 'OWNER_FULL_SEED_USER_ID=%', v_user_id;
  raise notice 'OWNER_FULL_SEED_EMPRESA_ID=%', v_empresa_id;
end
$$;

commit;
