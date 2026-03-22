begin;

do $$
declare
  rec record;
  v_set_role_ok boolean := false;
begin
  begin
    execute 'set local role supabase_auth_admin';
    v_set_role_ok := true;
  exception when others then
    v_set_role_ok := false;
  end;

  if v_set_role_ok then
    for rec in
      select c.relname as table_name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'auth'
        and c.relkind = 'r'
        and c.relrowsecurity = true
      order by c.relname
    loop
      begin
        execute format('alter table auth.%I disable row level security', rec.table_name);
      exception when others then
        null;
      end;
    end loop;

    execute 'reset role';
  end if;
end $$;

commit;
