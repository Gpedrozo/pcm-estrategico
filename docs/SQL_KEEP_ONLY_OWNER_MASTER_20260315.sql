-- ATENCAO: SCRIPT DESTRUTIVO
-- Objetivo: remover todos os usuarios e dados do schema public, mantendo apenas o OWNER MASTER.
-- Execute no Supabase SQL Editor com permissao administrativa.
-- Recomendado: fazer backup antes.

begin;

do $$
declare
  v_owner_email text := 'pedrozo@gppis.com.br'; -- AJUSTE AQUI
  v_owner_id uuid;
  r record;
begin
  -- 1) Localiza owner master em auth.users
  select id
    into v_owner_id
  from auth.users
  where lower(email) = lower(v_owner_email)
  limit 1;

  if v_owner_id is null then
    raise exception 'Owner master nao encontrado em auth.users para email=%', v_owner_email;
  end if;

  -- 2) Apaga todos os usuarios de negocio, mantendo owner master
  delete from public.user_roles where user_id <> v_owner_id;
  delete from public.profiles where id <> v_owner_id;

  -- Mantem owner com contexto global limpo
  update public.profiles
     set empresa_id = null,
         updated_at = now()
   where id = v_owner_id;

  -- 3) Limpa todas as tabelas do schema public, exceto as de usuario base
  --    (profiles/user_roles ja foram tratadas acima)
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not in ('profiles', 'user_roles')
  loop
    execute format('truncate table public.%I restart identity cascade', r.tablename);
  end loop;

  -- 4) Remove todos os usuarios de autenticacao, mantendo owner master
  --    Isso evita erro 409 de email ja cadastrado ao recriar usuarios.
  delete from auth.users where id <> v_owner_id;

  -- 5) Garante role SYSTEM_OWNER para owner
  delete from public.user_roles where user_id = v_owner_id;
  insert into public.user_roles (user_id, role, empresa_id)
  values (v_owner_id, 'SYSTEM_OWNER', null)
  on conflict do nothing;

  raise notice 'Limpeza concluida. Owner preservado: % (%)', v_owner_email, v_owner_id;
end $$;

commit;

-- Validacoes pos-execucao
select count(*) as auth_users_total from auth.users;
select id, email from auth.users;

select count(*) as profiles_total from public.profiles;
select id, email, empresa_id from public.profiles;

select count(*) as user_roles_total from public.user_roles;
select user_id, role, empresa_id from public.user_roles;
