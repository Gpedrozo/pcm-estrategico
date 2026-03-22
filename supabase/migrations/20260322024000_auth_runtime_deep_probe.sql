begin;

create or replace function public.auth_runtime_deep_probe(p_email text default 'owner@gppis.com.br')
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  rec record;
  v_uid uuid;
  v_results jsonb := '[]'::jsonb;
begin
  begin
    execute 'set local role supabase_auth_admin';
    v_results := v_results || jsonb_build_array(jsonb_build_object('stage', 'set_role', 'ok', true));
  exception when others then
    return jsonb_build_object(
      'ok', false,
      'stage', 'set_role',
      'sqlstate', SQLSTATE,
      'error', SQLERRM
    );
  end;

  for rec in
    select tablename
    from pg_tables
    where schemaname = 'auth'
    order by tablename
  loop
    begin
      execute format('select 1 from auth.%I limit 1', rec.tablename);
      v_results := v_results || jsonb_build_array(jsonb_build_object('stage', 'table_probe', 'table', rec.tablename, 'ok', true));
    exception when others then
      v_results := v_results || jsonb_build_array(jsonb_build_object('stage', 'table_probe', 'table', rec.tablename, 'ok', false, 'sqlstate', SQLSTATE, 'error', SQLERRM));
    end;
  end loop;

  begin
    execute format('select id from auth.users where email = %L limit 1', p_email) into v_uid;
    v_results := v_results || jsonb_build_array(jsonb_build_object('stage', 'user_lookup', 'ok', true, 'email', p_email, 'user_id', v_uid));
  exception when others then
    v_results := v_results || jsonb_build_array(jsonb_build_object('stage', 'user_lookup', 'ok', false, 'email', p_email, 'sqlstate', SQLSTATE, 'error', SQLERRM));
  end;

  if v_uid is not null then
    begin
      execute format('select 1 from auth.identities where user_id = %L::uuid limit 1', v_uid::text);
      v_results := v_results || jsonb_build_array(jsonb_build_object('stage', 'identity_lookup', 'ok', true, 'user_id', v_uid));
    exception when others then
      v_results := v_results || jsonb_build_array(jsonb_build_object('stage', 'identity_lookup', 'ok', false, 'user_id', v_uid, 'sqlstate', SQLSTATE, 'error', SQLERRM));
    end;
  end if;

  return jsonb_build_object('ok', true, 'results', v_results);
end;
$$;

grant execute on function public.auth_runtime_deep_probe(text) to anon, authenticated, service_role;

commit;
