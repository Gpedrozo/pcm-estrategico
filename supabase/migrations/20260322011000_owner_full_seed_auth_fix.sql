do $$
declare
  v_email text := 'owner.full.seed@gppis.com.br';
  v_password text := 'OwnerFullSeed!2026';
  v_user_id uuid;
  v_identity_id uuid := gen_random_uuid();
  v_empresa_id uuid;
begin
  insert into auth.instances (id, uuid, raw_base_config, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000',
         '00000000-0000-0000-0000-000000000000',
         jsonb_build_object('site_url', 'https://owner.gppis.com.br'),
         now(), now()
  where not exists (
    select 1 from auth.instances where id = '00000000-0000-0000-0000-000000000000'
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

  select id into v_user_id
  from auth.users
  where lower(email) = lower(v_email)
  order by created_at desc nulls last
  limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      lower(v_email),
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(), now(),
      jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
      jsonb_build_object('nome','Owner Full Seed'),
      now(), now()
    );
  else
    update auth.users
       set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           confirmation_sent_at = coalesce(confirmation_sent_at, now()),
           updated_at = now()
     where id = v_user_id;
  end if;

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    created_at, updated_at, last_sign_in_at
  )
  select v_identity_id,
         v_user_id,
         lower(v_email),
         jsonb_build_object('sub', v_user_id::text, 'email', lower(v_email)),
         'email', now(), now(), now()
  where not exists (
    select 1 from auth.identities where user_id = v_user_id and provider = 'email'
  );

  if to_regclass('public.profiles') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='empresa_id'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='email'
    ) then
      insert into public.profiles (id, empresa_id, nome, email)
      values (v_user_id, v_empresa_id, 'Owner Full Seed', lower(v_email))
      on conflict (id) do update
        set empresa_id = excluded.empresa_id,
            nome = excluded.nome,
            email = excluded.email;
    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='email'
    ) then
      insert into public.profiles (id, nome, email)
      values (v_user_id, 'Owner Full Seed', lower(v_email))
      on conflict (id) do update
        set nome = excluded.nome,
            email = excluded.email;
    else
      insert into public.profiles (id, nome)
      values (v_user_id, 'Owner Full Seed')
      on conflict (id) do update
        set nome = excluded.nome;
    end if;
  end if;

  if to_regclass('public.user_roles') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='user_roles' and column_name='empresa_id'
    ) then
      insert into public.user_roles (user_id, empresa_id, role)
      values (v_user_id, v_empresa_id, 'SYSTEM_OWNER'::public.app_role)
      on conflict do nothing;
    else
      insert into public.user_roles (user_id, role)
      values (v_user_id, 'SYSTEM_OWNER'::public.app_role)
      on conflict do nothing;
    end if;
  end if;

  raise notice 'OWNER_FULL_FIX_USER_ID=%', v_user_id;
end
$$;
