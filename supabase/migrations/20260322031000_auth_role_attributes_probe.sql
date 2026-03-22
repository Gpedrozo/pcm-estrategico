begin;

create or replace function public.auth_role_attributes_probe()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  rec record;
  v_out jsonb := '[]'::jsonb;
begin
  for rec in
    select rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication, rolbypassrls
    from pg_roles
    where rolname in ('supabase_auth_admin', 'service_role', 'postgres', 'authenticator', 'anon', 'authenticated')
    order by rolname
  loop
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'role', rec.rolname,
      'super', rec.rolsuper,
      'create_role', rec.rolcreaterole,
      'create_db', rec.rolcreatedb,
      'can_login', rec.rolcanlogin,
      'replication', rec.rolreplication,
      'bypass_rls', rec.rolbypassrls
    ));
  end loop;

  return jsonb_build_object('ok', true, 'roles', v_out);
end;
$$;

grant execute on function public.auth_role_attributes_probe() to anon, authenticated, service_role;

commit;
