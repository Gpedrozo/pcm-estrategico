-- Garantia de empresa MASTER (GPPIS) e owner_master unico.
-- SQL idempotente para executar no Supabase SQL Editor.
--
-- Resultado esperado:
-- 1) Empresa com slug "gppis" existe.
-- 2) Usuario pedrozo@gppis.com.br existe no auth.users com senha definida.
-- 3) Profile e vinculo com empresa GPPIS garantidos.
-- 4) Papéis SYSTEM_OWNER e SYSTEM_ADMIN garantidos para este usuario.
-- 5) SYSTEM_OWNER e SYSTEM_ADMIN removidos dos demais usuarios.

begin;

do $$
declare
	target_email text := 'pedrozo@gppis.com.br';
	target_nome text := 'Pedrozo';
	target_password text := '@Gpp280693';
	target_slug text := 'gppis';
	target_empresa_nome text := 'GPPIS';

	v_user_id uuid;
	v_empresa_id uuid;

	v_has_profiles_email boolean;
	v_has_profiles_empresa_id boolean;
	v_has_profiles_nome boolean;

	v_has_user_roles_empresa_id boolean;
	v_has_user_roles_role boolean;

	v_has_rbac_user_roles_role_id boolean;
	v_has_rbac_user_roles_role boolean;
	v_has_rbac_roles_table boolean;
	v_rbac_system_owner_role_id uuid;
	v_rbac_system_admin_role_id uuid;

	v_has_allowlist boolean;
begin
	-- 1) Garante empresa MASTER
	select e.id
		into v_empresa_id
		from public.empresas e
	 where lower(e.slug) = lower(target_slug)
	 limit 1;

	if v_empresa_id is null then
		insert into public.empresas (nome, slug)
		values (target_empresa_nome, lower(target_slug))
		returning id into v_empresa_id;
	end if;

	-- 2) Garante usuario no Auth
	select u.id
		into v_user_id
		from auth.users u
	 where lower(u.email) = lower(target_email)
	 order by u.created_at desc
	 limit 1;

	-- Evita usuario de auth corrompido: sempre recria o owner_master de forma limpa.
	if v_user_id is not null then
		delete from public.user_roles where user_id = v_user_id;
		delete from public.profiles where id = v_user_id;
		if to_regclass('public.rbac_user_roles') is not null then
			delete from public.rbac_user_roles where user_id = v_user_id;
		end if;

		delete from auth.identities where user_id = v_user_id or lower(provider_id) = lower(target_email);
		delete from auth.sessions where user_id = v_user_id;
		delete from auth.refresh_tokens where user_id = v_user_id::text;
		delete from auth.users where id = v_user_id;
	end if;

	v_user_id := gen_random_uuid();

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
		lower(target_email),
		extensions.crypt(target_password, extensions.gen_salt('bf')),
		now(),
		now(),
		jsonb_build_object(
			'provider','email',
			'providers', jsonb_build_array('email'),
			'role', 'SYSTEM_OWNER',
			'roles', jsonb_build_array('SYSTEM_OWNER', 'SYSTEM_ADMIN')
		),
		jsonb_build_object('nome', target_nome),
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
		gen_random_uuid(),
		v_user_id,
		lower(target_email),
		jsonb_build_object('sub', v_user_id::text, 'email', lower(target_email)),
		'email',
		now(),
		now(),
		now()
	);

	-- 3) Garante profile com empresa GPPIS
	select exists (
					 select 1 from information_schema.columns
						where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
				 ) into v_has_profiles_email;

	select exists (
					 select 1 from information_schema.columns
						where table_schema = 'public' and table_name = 'profiles' and column_name = 'empresa_id'
				 ) into v_has_profiles_empresa_id;

	select exists (
					 select 1 from information_schema.columns
						where table_schema = 'public' and table_name = 'profiles' and column_name = 'nome'
				 ) into v_has_profiles_nome;

	if v_has_profiles_empresa_id and v_has_profiles_email and v_has_profiles_nome then
		insert into public.profiles (id, email, nome, empresa_id)
		values (v_user_id, lower(target_email), target_nome, v_empresa_id)
		on conflict (id) do update
			set email = excluded.email,
					nome = excluded.nome,
					empresa_id = excluded.empresa_id;
	elsif v_has_profiles_empresa_id and v_has_profiles_nome then
		insert into public.profiles (id, nome, empresa_id)
		values (v_user_id, target_nome, v_empresa_id)
		on conflict (id) do update
			set nome = excluded.nome,
					empresa_id = excluded.empresa_id;
	elsif v_has_profiles_email and v_has_profiles_nome then
		insert into public.profiles (id, email, nome)
		values (v_user_id, lower(target_email), target_nome)
		on conflict (id) do update
			set email = excluded.email,
					nome = excluded.nome;
	else
		insert into public.profiles (id)
		values (v_user_id)
		on conflict (id) do nothing;
	end if;

	-- 4) Remove privilégio supremo de todos os outros usuarios
	select exists (
					 select 1 from information_schema.columns
						where table_schema = 'public' and table_name = 'user_roles' and column_name = 'empresa_id'
				 ) into v_has_user_roles_empresa_id;

	select exists (
					 select 1 from information_schema.columns
						where table_schema = 'public' and table_name = 'user_roles' and column_name = 'role'
				 ) into v_has_user_roles_role;

	if v_has_user_roles_role then
		delete from public.user_roles ur
		 where ur.user_id <> v_user_id
			 and upper(ur.role::text) in ('SYSTEM_OWNER', 'SYSTEM_ADMIN');
	end if;

	if to_regclass('public.rbac_user_roles') is not null then
		v_has_rbac_roles_table := to_regclass('public.rbac_roles') is not null;

		select exists (
					 select 1 from information_schema.columns
						where table_schema = 'public' and table_name = 'rbac_user_roles' and column_name = 'role_id'
				 ) into v_has_rbac_user_roles_role_id;

		select exists (
					 select 1 from information_schema.columns
						where table_schema = 'public' and table_name = 'rbac_user_roles' and column_name = 'role'
				 ) into v_has_rbac_user_roles_role;

		if v_has_rbac_user_roles_role_id and v_has_rbac_roles_table then
			select id into v_rbac_system_owner_role_id
				from public.rbac_roles
			 where upper(code) = 'SYSTEM_OWNER'
			 limit 1;

			select id into v_rbac_system_admin_role_id
				from public.rbac_roles
			 where upper(code) = 'SYSTEM_ADMIN'
			 limit 1;

			delete from public.rbac_user_roles rur
			 where rur.user_id <> v_user_id
				 and rur.role_id in (
				 	coalesce(v_rbac_system_owner_role_id, '00000000-0000-0000-0000-000000000000'::uuid),
				 	coalesce(v_rbac_system_admin_role_id, '00000000-0000-0000-0000-000000000000'::uuid)
				 );
		elsif v_has_rbac_user_roles_role then
			execute $sql$
				delete from public.rbac_user_roles rur
				 where rur.user_id <> $1
					 and upper(rur.role::text) in ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
			$sql$ using v_user_id;
		elsif v_has_rbac_user_roles_role_id and not v_has_rbac_roles_table then
			raise notice 'rbac_user_roles usa role_id, mas public.rbac_roles nao existe. Bloco RBAC sera ignorado.';
		end if;
	end if;

	-- 5) Garante os papeis no owner_master
	if v_has_user_roles_role then
		if v_has_user_roles_empresa_id then
			insert into public.user_roles (user_id, empresa_id, role)
			values (v_user_id, v_empresa_id, 'SYSTEM_OWNER')
			on conflict do nothing;

			insert into public.user_roles (user_id, empresa_id, role)
			values (v_user_id, v_empresa_id, 'SYSTEM_ADMIN')
			on conflict do nothing;
		else
			insert into public.user_roles (user_id, role)
			values (v_user_id, 'SYSTEM_OWNER')
			on conflict do nothing;

			insert into public.user_roles (user_id, role)
			values (v_user_id, 'SYSTEM_ADMIN')
			on conflict do nothing;
		end if;
	end if;

	if to_regclass('public.rbac_user_roles') is not null then
		if v_has_rbac_user_roles_role_id and v_has_rbac_roles_table then
			if v_rbac_system_owner_role_id is not null then
				insert into public.rbac_user_roles (user_id, empresa_id, role_id)
				values (v_user_id, v_empresa_id, v_rbac_system_owner_role_id)
				on conflict do nothing;
			end if;

			if v_rbac_system_admin_role_id is not null then
				insert into public.rbac_user_roles (user_id, empresa_id, role_id)
				values (v_user_id, v_empresa_id, v_rbac_system_admin_role_id)
				on conflict do nothing;
			end if;
		elsif v_has_rbac_user_roles_role then
			execute $sql$
				insert into public.rbac_user_roles (user_id, role)
				values ($1, 'SYSTEM_OWNER')
				on conflict do nothing
			$sql$ using v_user_id;

			execute $sql$
				insert into public.rbac_user_roles (user_id, role)
				values ($1, 'SYSTEM_ADMIN')
				on conflict do nothing
			$sql$ using v_user_id;
		elsif v_has_rbac_user_roles_role_id and not v_has_rbac_roles_table then
			raise notice 'Nao foi possivel inserir RBAC por role_id sem tabela public.rbac_roles.';
		end if;
	end if;

	-- 6) Allowlist opcional do owner
	v_has_allowlist := to_regclass('public.system_owner_allowlist') is not null;
	if v_has_allowlist then
		insert into public.system_owner_allowlist (email)
		values (lower(target_email))
		on conflict (email) do nothing;
	end if;

	raise notice 'OWNER_MASTER garantido: email=%, user_id=%, empresa_id=%', lower(target_email), v_user_id, v_empresa_id;
end
$$;

-- 7) Validacoes finais
select e.id as empresa_id, e.nome, e.slug
	from public.empresas e
 where lower(e.slug) = 'gppis';

select u.id as user_id, u.email, u.email_confirmed_at, u.raw_app_meta_data
	from auth.users u
 where lower(u.email) = 'pedrozo@gppis.com.br';

select p.id, p.email, p.nome, p.empresa_id
	from public.profiles p
 where p.id = (
	 select id from auth.users where lower(email) = 'pedrozo@gppis.com.br' limit 1
 );

select ur.user_id, ur.empresa_id, ur.role
	from public.user_roles ur
 where ur.user_id = (
	 select id from auth.users where lower(email) = 'pedrozo@gppis.com.br' limit 1
 )
 order by ur.role;

select ur.user_id, ur.role
	from public.user_roles ur
 where upper(ur.role::text) in ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
	 and ur.user_id <> (
		 select id from auth.users where lower(email) = 'pedrozo@gppis.com.br' limit 1
	 );

commit;

