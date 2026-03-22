do $$
declare
  v_count bigint := 0;
  v_id uuid;
begin
  begin
    execute 'select count(*) from auth.instances' into v_count;
  exception when others then
    raise notice 'auth.instances not accessible: %', SQLERRM;
    return;
  end;

  if v_count > 0 then
    raise notice 'auth.instances already has % row(s)', v_count;
    return;
  end if;

  begin
    v_id := gen_random_uuid();
  exception when undefined_function then
    begin
      execute 'create extension if not exists pgcrypto';
      v_id := gen_random_uuid();
    exception when others then
      raise notice 'pgcrypto unavailable: %', SQLERRM;
      return;
    end;
  end;

  begin
    execute $ins$
      insert into auth.instances (id, uuid, raw_base_config, created_at, updated_at)
      values ($1, $1, '{}'::text, now(), now())
    $ins$ using v_id;

    raise notice 'seeded auth.instances with id=%', v_id;
  exception when others then
    raise notice 'failed to seed auth.instances: %', SQLERRM;
  end;
end $$;