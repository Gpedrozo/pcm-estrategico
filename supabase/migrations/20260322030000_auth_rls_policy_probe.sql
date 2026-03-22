begin;

create or replace function public.auth_rls_policy_probe()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_tables jsonb := '[]'::jsonb;
  v_policies jsonb := '[]'::jsonb;
  rec record;
begin
  for rec in
    select
      n.nspname as schema_name,
      c.relname as table_name,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as rls_forced,
      (select count(*) from pg_policy p where p.polrelid = c.oid) as policy_count
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and c.relkind = 'r'
    order by c.relname
  loop
    v_tables := v_tables || jsonb_build_array(jsonb_build_object(
      'schema', rec.schema_name,
      'table', rec.table_name,
      'rls_enabled', rec.rls_enabled,
      'rls_forced', rec.rls_forced,
      'policy_count', rec.policy_count
    ));
  end loop;

  for rec in
    select
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    from pg_policies
    where schemaname = 'auth'
    order by tablename, policyname
  loop
    v_policies := v_policies || jsonb_build_array(jsonb_build_object(
      'schema', rec.schemaname,
      'table', rec.tablename,
      'policy', rec.policyname,
      'permissive', rec.permissive,
      'roles', rec.roles,
      'cmd', rec.cmd,
      'qual', rec.qual,
      'with_check', rec.with_check
    ));
  end loop;

  return jsonb_build_object('ok', true, 'tables', v_tables, 'policies', v_policies);
end;
$$;

grant execute on function public.auth_rls_policy_probe() to anon, authenticated, service_role;

commit;
