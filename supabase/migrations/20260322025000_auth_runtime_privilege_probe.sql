begin;

create or replace function public.auth_runtime_privilege_probe()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  rec record;
  v_results jsonb := '[]'::jsonb;
  v_schema_usage boolean := false;
begin
  begin
    v_schema_usage := has_schema_privilege('supabase_auth_admin', 'auth', 'USAGE');
  exception when others then
    v_schema_usage := false;
  end;

  v_results := v_results || jsonb_build_array(
    jsonb_build_object('stage', 'schema_usage', 'role', 'supabase_auth_admin', 'schema', 'auth', 'ok', v_schema_usage)
  );

  for rec in
    select tablename
    from pg_tables
    where schemaname = 'auth'
    order by tablename
  loop
    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'stage', 'table_privileges',
        'table', rec.tablename,
        'select', has_table_privilege('supabase_auth_admin', format('auth.%I', rec.tablename), 'SELECT'),
        'insert', has_table_privilege('supabase_auth_admin', format('auth.%I', rec.tablename), 'INSERT'),
        'update', has_table_privilege('supabase_auth_admin', format('auth.%I', rec.tablename), 'UPDATE'),
        'delete', has_table_privilege('supabase_auth_admin', format('auth.%I', rec.tablename), 'DELETE')
      )
    );
  end loop;

  return jsonb_build_object('ok', true, 'results', v_results);
end;
$$;

grant execute on function public.auth_runtime_privilege_probe() to anon, authenticated, service_role;

commit;
