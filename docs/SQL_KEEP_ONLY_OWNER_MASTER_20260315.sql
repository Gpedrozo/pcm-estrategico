-- ATENCAO: SCRIPT DESTRUTIVO
-- Objetivo: remover todos os usuarios e dados do schema public, mantendo apenas o OWNER MASTER.
-- Execute no Supabase SQL Editor com permissao administrativa.
-- Recomendado: fazer backup antes.

begin;

do $$
declare
  v_owner_email text := 'pedrozo@gppis.com.br'; -- AJUSTE AQUI
  v_owner_id uuid;
  v_owner_empresa_id uuid;
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

  -- Resolve empresa_id valido para manter role do owner (trigger exige empresa_id em user_roles)
  select p.empresa_id
    into v_owner_empresa_id
  from public.profiles p
  where p.id = v_owner_id
  limit 1;

  if v_owner_empresa_id is null then
    select ur.empresa_id
      into v_owner_empresa_id
    from public.user_roles ur
    where ur.user_id = v_owner_id
      and ur.empresa_id is not null
    order by ur.created_at desc nulls last
    limit 1;
  end if;

  if v_owner_empresa_id is null then
    select e.id
      into v_owner_empresa_id
    from public.empresas e
    order by e.created_at desc nulls last
    limit 1;
  end if;

  if v_owner_empresa_id is null then
    raise exception 'Nao foi possivel resolver empresa_id para o owner. Abortando para evitar violacao de trigger em user_roles.';
  end if;

  -- 2) Apaga todos os usuarios de negocio, mantendo owner master
  delete from public.user_roles where user_id <> v_owner_id;
  delete from public.profiles where id <> v_owner_id;

  -- Nao atualiza empresa_id do owner: existe trigger de seguranca bloqueando essa alteracao.

  -- 3) Limpa todas as tabelas do schema public, exceto as tabelas-base do owner
  --    (profiles/user_roles/empresas sao preservadas para manter integridade do owner)
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not in ('profiles', 'user_roles', 'empresas')
  loop
    execute format('truncate table public.%I restart identity cascade', r.tablename);
  end loop;

  -- 3.1) Mantem somente a empresa vinculada ao owner
  delete from public.empresas where id <> v_owner_empresa_id;

  -- 4) Remove todos os usuarios de autenticacao, mantendo owner master
  --    Isso evita erro 409 de email ja cadastrado ao recriar usuarios.
  delete from auth.users where id <> v_owner_id;

  -- 5) Garante role SYSTEM_OWNER para owner com empresa_id valido
  delete from public.user_roles
   where user_id = v_owner_id
     and role::text not in ('SYSTEM_OWNER', 'MASTER_TI');

  insert into public.user_roles (user_id, role, empresa_id)
  values (v_owner_id, 'SYSTEM_OWNER', v_owner_empresa_id)
  on conflict do nothing;

  raise notice 'Limpeza concluida. Owner preservado: % (%), empresa preservada: %', v_owner_email, v_owner_id, v_owner_empresa_id;
end $$;

commit;

-- Validacoes pos-execucao
select count(*) as auth_users_total from auth.users;
select id, email from auth.users;

select count(*) as profiles_total from public.profiles;
select id, email, empresa_id from public.profiles;

select count(*) as user_roles_total from public.user_roles;
select user_id, role, empresa_id from public.user_roles;
