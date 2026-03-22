create or replace function public.auth_instances_snapshot()
returns table (
  instance_id uuid,
  instance_raw jsonb,
  read_error text
)
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_id uuid;
  v_raw jsonb;
  v_err text := null;
begin
  begin
    execute 'select id, to_jsonb(i) from auth.instances i order by id limit 1' into v_id, v_raw;
  exception when others then
    v_id := null;
    v_raw := null;
    v_err := SQLERRM;
  end;

  instance_id := v_id;
  instance_raw := v_raw;
  read_error := v_err;
  return next;
end;
$$;

create or replace view public.auth_instances_snapshot_v as
select * from public.auth_instances_snapshot();

grant execute on function public.auth_instances_snapshot() to anon, authenticated, service_role;
grant select on public.auth_instances_snapshot_v to anon, authenticated, service_role;
