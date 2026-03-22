create or replace function public.auth_schema_migrations_diag()
returns table (
  migrations_count bigint,
  max_version text,
  sample_versions text,
  read_error text
)
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_count bigint := null;
  v_max text := null;
  v_sample text := null;
  v_err text := null;
begin
  begin
    execute 'select count(*), max(version) from auth.schema_migrations' into v_count, v_max;
    execute 'select string_agg(version::text, '','' order by version desc) from (select version from auth.schema_migrations order by version desc limit 12) t' into v_sample;
  exception when others then
    v_err := SQLERRM;
  end;

  migrations_count := v_count;
  max_version := v_max;
  sample_versions := v_sample;
  read_error := v_err;
  return next;
end;
$$;

create or replace view public.auth_schema_migrations_diag_v as
select * from public.auth_schema_migrations_diag();

grant execute on function public.auth_schema_migrations_diag() to anon, authenticated, service_role;
grant select on public.auth_schema_migrations_diag_v to anon, authenticated, service_role;