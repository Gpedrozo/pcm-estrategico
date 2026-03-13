-- Recupera acesso ao Owner Portal para um usuario existente no auth.users.
-- Seguro para reexecucao (idempotente).
-- Ajuste apenas target_email e target_nome, se necessario.

begin;

do $$
declare
  target_email text := 'pedrozo@gppis.com.br';
  target_nome text := 'Pedrozo';
  v_user_id uuid;
  v_empresa_id uuid;
begin
  -- 1) Localiza usuario no Auth
  select id
    into v_user_id
    from auth.users
   where lower(email) = lower(target_email)
   limit 1;

  if v_user_id is null then
    raise exception 'Usuario % nao encontrado em auth.users', target_email;
  end if;

  -- 2) Resolve empresa vinculada
  select p.empresa_id
    into v_empresa_id
    from public.profiles p
   where p.id = v_user_id
   limit 1;

  if v_empresa_id is null then
    select e.id
      into v_empresa_id
      from public.empresas e
     order by e.created_at asc nulls last, e.id asc
     limit 1;
  end if;

  if v_empresa_id is null then
    raise exception 'Nenhuma empresa encontrada para vincular o usuario %', target_email;
  end if;

  -- 3) Garante profile
  insert into public.profiles (id, email, nome, empresa_id)
  values (v_user_id, target_email, target_nome, v_empresa_id)
  on conflict (id) do update
    set email = excluded.email,
        nome = coalesce(nullif(excluded.nome, ''), public.profiles.nome),
        empresa_id = excluded.empresa_id;

  -- 4) Garante papeis globais para acesso owner
  insert into public.user_roles (user_id, empresa_id, role)
  values (v_user_id, v_empresa_id, 'SYSTEM_OWNER')
  on conflict (user_id, empresa_id, role) do nothing;

  insert into public.user_roles (user_id, empresa_id, role)
  values (v_user_id, v_empresa_id, 'SYSTEM_ADMIN')
  on conflict (user_id, empresa_id, role) do nothing;

  raise notice 'Acesso recuperado para %, user_id=%, empresa_id=%', target_email, v_user_id, v_empresa_id;
end
$$;

-- 5) Validacao final
select u.id as user_id, u.email
  from auth.users u
 where lower(u.email) = lower('pedrozo@gppis.com.br');

select p.id, p.email, p.nome, p.empresa_id
  from public.profiles p
 where lower(p.email) = lower('pedrozo@gppis.com.br');

select ur.user_id, ur.empresa_id, ur.role
  from public.user_roles ur
 where ur.user_id = (
   select id from auth.users where lower(email) = lower('pedrozo@gppis.com.br') limit 1
 )
 order by ur.role;

commit;
