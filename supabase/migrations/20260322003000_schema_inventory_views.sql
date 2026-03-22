create or replace view public.schema_inventory_tables as
select table_schema, table_name, table_type
from information_schema.tables
where table_schema in ('public','auth')
order by table_schema, table_name;

create or replace view public.schema_inventory_columns as
select table_schema, table_name, ordinal_position, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema in ('public','auth')
order by table_schema, table_name, ordinal_position;

create or replace view public.schema_inventory_fks as
select
  tc.constraint_name,
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema in ('public','auth')
order by tc.table_schema, tc.table_name, tc.constraint_name;

create or replace view public.schema_inventory_functions as
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
  pg_catalog.pg_get_function_result(p.oid) as returns,
  l.lanname as language
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname in ('public','auth')
order by n.nspname, p.proname;

grant select on public.schema_inventory_tables to anon, authenticated, service_role;
grant select on public.schema_inventory_columns to anon, authenticated, service_role;
grant select on public.schema_inventory_fks to anon, authenticated, service_role;
grant select on public.schema_inventory_functions to anon, authenticated, service_role;