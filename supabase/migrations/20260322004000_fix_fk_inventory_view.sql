create or replace view public.schema_inventory_fks as
select
  con.conname::information_schema.sql_identifier as constraint_name,
  nsp_src.nspname::information_schema.sql_identifier as table_schema,
  src.relname::information_schema.sql_identifier as table_name,
  att_src.attname::information_schema.sql_identifier as column_name,
  nsp_tgt.nspname::information_schema.sql_identifier as foreign_table_schema,
  tgt.relname::information_schema.sql_identifier as foreign_table_name,
  att_tgt.attname::information_schema.sql_identifier as foreign_column_name
from pg_constraint con
join pg_class src on src.oid = con.conrelid
join pg_namespace nsp_src on nsp_src.oid = src.relnamespace
join pg_class tgt on tgt.oid = con.confrelid
join pg_namespace nsp_tgt on nsp_tgt.oid = tgt.relnamespace
join unnest(con.conkey) with ordinality as src_cols(attnum, ord) on true
join unnest(con.confkey) with ordinality as tgt_cols(attnum, ord) on tgt_cols.ord = src_cols.ord
join pg_attribute att_src on att_src.attrelid = src.oid and att_src.attnum = src_cols.attnum
join pg_attribute att_tgt on att_tgt.attrelid = tgt.oid and att_tgt.attnum = tgt_cols.attnum
where con.contype = 'f'
  and nsp_src.nspname in ('public','auth')
order by nsp_src.nspname, src.relname, con.conname;

grant select on public.schema_inventory_fks to anon, authenticated, service_role;
