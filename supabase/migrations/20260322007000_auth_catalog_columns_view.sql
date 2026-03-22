create or replace view public.auth_catalog_columns as
select
  n.nspname::text as schema_name,
  c.relname::text as table_name,
  a.attnum as ordinal_position,
  a.attname::text as column_name,
  format_type(a.atttypid, a.atttypmod)::text as data_type,
  a.attnotnull as not_null,
  pg_get_expr(ad.adbin, ad.adrelid)::text as column_default
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
where n.nspname = 'auth'
  and c.relkind in ('r','p')
  and a.attnum > 0
  and not a.attisdropped
order by c.relname, a.attnum;

grant select on public.auth_catalog_columns to anon, authenticated, service_role;
