create or replace view public.auth_catalog_tables as
select
  n.nspname::text as schema_name,
  c.relname::text as table_name,
  c.relkind::text as relkind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'auth'
  and c.relkind in ('r','p','v','m')
order by c.relname;

grant select on public.auth_catalog_tables to anon, authenticated, service_role;
