do $$
declare
  v_zero uuid := '00000000-0000-0000-0000-000000000000';
begin
  insert into auth.instances (id, uuid, raw_base_config, created_at, updated_at)
  select v_zero, v_zero, '{"site_url":"https://owner.gppis.com.br"}', now(), now()
  where not exists (select 1 from auth.instances where id = v_zero);

  update auth.users
     set instance_id = v_zero,
         updated_at = now()
   where instance_id is distinct from v_zero;

  update auth.instances
     set uuid = v_zero,
         raw_base_config = '{"site_url":"https://owner.gppis.com.br"}',
         updated_at = now()
   where id = v_zero;

  delete from auth.instances
   where id <> v_zero;

  raise notice 'AUTH_INSTANCES_NORMALIZED';
end
$$;
