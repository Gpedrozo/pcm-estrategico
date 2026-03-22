-- ============================================================================
-- ENGENHARIA REVERSA COMPLETA: RECRIACAO TABELA A TABELA + DIAGNOSTICO OWNER
-- Projeto: PCM Estrategico (Supabase)
-- Objetivo:
-- 1) Gerar SQL de recriacao individual para cada tabela
-- 2) Mapear finalidade/modulo de cada tabela
-- 3) Apoiar investigacao da falha de acesso Owner
-- ============================================================================

begin;

create schema if not exists diagnostics;

-- --------------------------------------------------------------------------
-- 1) CATALOGO BASE
-- --------------------------------------------------------------------------

drop table if exists diagnostics.table_catalog cascade;
create table diagnostics.table_catalog as
select
  n.nspname as table_schema,
  c.relname as table_name,
  c.oid as table_oid
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
  and n.nspname not like 'pg_temp_%'
  and n.nspname not like 'pg_toast_temp_%';

create unique index if not exists uq_diagnostics_table_catalog
  on diagnostics.table_catalog (table_schema, table_name);

drop table if exists diagnostics.column_catalog cascade;
create table diagnostics.column_catalog as
select
  n.nspname as table_schema,
  c.relname as table_name,
  a.attnum as ordinal_position,
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
  (not a.attnotnull) as is_nullable,
  pg_get_expr(ad.adbin, ad.adrelid) as column_default
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
where a.attnum > 0
  and not a.attisdropped
  and c.relkind = 'r'
  and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
  and n.nspname not like 'pg_temp_%'
  and n.nspname not like 'pg_toast_temp_%';

create index if not exists idx_diagnostics_column_catalog_table
  on diagnostics.column_catalog (table_schema, table_name, ordinal_position);

drop table if exists diagnostics.constraint_catalog cascade;
create table diagnostics.constraint_catalog as
select
  n.nspname as table_schema,
  c.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid, true) as constraint_def
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
  and n.nspname not like 'pg_temp_%'
  and n.nspname not like 'pg_toast_temp_%';

create index if not exists idx_diagnostics_constraint_catalog_table
  on diagnostics.constraint_catalog (table_schema, table_name, constraint_type);

drop table if exists diagnostics.index_catalog cascade;
create table diagnostics.index_catalog as
select
  schemaname as table_schema,
  tablename as table_name,
  indexname,
  indexdef
from pg_indexes
where schemaname not in ('pg_catalog', 'information_schema', 'pg_toast')
  and schemaname not like 'pg_temp_%'
  and schemaname not like 'pg_toast_temp_%';

create index if not exists idx_diagnostics_index_catalog_table
  on diagnostics.index_catalog (table_schema, table_name);

-- --------------------------------------------------------------------------
-- 2) SQL DE RECRIACAO INDIVIDUAL POR TABELA
-- --------------------------------------------------------------------------

create or replace view diagnostics.v_recreate_table_columns_sql as
select
  t.table_schema,
  t.table_name,
  'create table if not exists '
    || quote_ident(t.table_schema) || '.' || quote_ident(t.table_name) || E' (\n'
    || string_agg(
      '  ' || quote_ident(c.column_name)
      || ' ' || c.data_type
      || case when c.column_default is not null then ' default ' || c.column_default else '' end
      || case when c.is_nullable then '' else ' not null' end,
      E',\n'
      order by c.ordinal_position
    )
    || E'\n);' as create_columns_sql
from diagnostics.table_catalog t
join diagnostics.column_catalog c
  on c.table_schema = t.table_schema
 and c.table_name = t.table_name
group by t.table_schema, t.table_name;

create or replace view diagnostics.v_recreate_table_constraints_sql as
select
  table_schema,
  table_name,
  string_agg(
    'alter table ' || quote_ident(table_schema) || '.' || quote_ident(table_name)
    || ' add constraint ' || quote_ident(constraint_name)
    || ' ' || constraint_def || ';',
    E'\n'
    order by
      case constraint_type
        when 'p' then 1  -- PK primeiro
        when 'u' then 2  -- unique
        when 'c' then 3  -- check
        when 'f' then 4  -- FK por ultimo
        else 5
      end,
      constraint_name
  ) as create_constraints_sql
from diagnostics.constraint_catalog
group by table_schema, table_name;

create or replace view diagnostics.v_recreate_table_indexes_sql as
select
  table_schema,
  table_name,
  string_agg(
    indexdef || ';',
    E'\n'
    order by indexname
  ) as create_indexes_sql
from diagnostics.index_catalog
where indexdef not ilike '% primary key %'
group by table_schema, table_name;

create or replace view diagnostics.v_recreate_table_full_sql as
select
  t.table_schema,
  t.table_name,
  coalesce(c.create_columns_sql, '-- sem colunas detectadas') as create_columns_sql,
  coalesce(k.create_constraints_sql, '-- sem constraints detectadas') as create_constraints_sql,
  coalesce(i.create_indexes_sql, '-- sem indices detectados') as create_indexes_sql,
  (
    '-- ===================================================================\n'
    || '-- TABLE: ' || t.table_schema || '.' || t.table_name || E'\n'
    || '-- ===================================================================\n'
    || coalesce(c.create_columns_sql, '-- sem colunas detectadas') || E'\n\n'
    || coalesce(k.create_constraints_sql, '-- sem constraints detectadas') || E'\n\n'
    || coalesce(i.create_indexes_sql, '-- sem indices detectados') || E'\n'
  ) as recreate_sql
from diagnostics.table_catalog t
left join diagnostics.v_recreate_table_columns_sql c
  on c.table_schema = t.table_schema and c.table_name = t.table_name
left join diagnostics.v_recreate_table_constraints_sql k
  on k.table_schema = t.table_schema and k.table_name = t.table_name
left join diagnostics.v_recreate_table_indexes_sql i
  on i.table_schema = t.table_schema and i.table_name = t.table_name;

-- --------------------------------------------------------------------------
-- 3) ANALISE FUNCIONAL (HEURISTICA) TABELA A TABELA
-- --------------------------------------------------------------------------

drop table if exists diagnostics.table_analysis cascade;
create table diagnostics.table_analysis as
select
  t.table_schema,
  t.table_name,
  case
    when t.table_name in ('usuarios','user_roles','profiles','tenant_users','rbac_user_roles','login_attempts') then 'usuarios_permissoes'
    when t.table_name in ('empresas','empresa_config','dados_empresa','plans','subscriptions','contracts','contract_versions') then 'empresas_comercial'
    when t.table_name like 'support_%' or t.table_name = 'support_tickets' then 'suporte'
    when t.table_name in ('solicitacoes','ordens_servico','execucoes_os','execucoes_os_pausas') then 'manutencao_core'
    when t.table_name in ('equipamentos','componentes_equipamento','inspecoes','medicoes_preditivas','planos_preventivos','planos_lubrificacao') then 'ativos_engenharia'
    when t.table_name like '%audit%' or t.table_name like '%log%' then 'auditoria_observabilidade'
    else 'outros'
  end as modulo_estimado,
  case
    when t.table_name in ('usuarios','profiles','user_roles','tenant_users') then 'Nucleo de identidade e autorizacao'
    when t.table_name in ('empresas','empresa_config') then 'Contexto multi-tenant e resolucao de dominio'
    when t.table_name in ('login_attempts') then 'Rate-limit e seguranca de login'
    when t.table_name like '%audit%' then 'Rastreabilidade de eventos criticos'
    when t.table_name like '%log%' then 'Observabilidade operacional'
    when t.table_name in ('support_tickets','support_ticket_threads','support_ticket_attachments') then 'Atendimento e suporte'
    else 'Finalidade a validar manualmente'
  end as finalidade_estimada,
  case
    when t.table_name in ('usuarios','profiles','user_roles','tenant_users','empresas','empresa_config','login_attempts') then true
    else false
  end as impacta_acesso_owner,
  now() as generated_at
from diagnostics.table_catalog t;

create index if not exists idx_diagnostics_table_analysis_modulo
  on diagnostics.table_analysis (modulo_estimado, impacta_acesso_owner);

-- --------------------------------------------------------------------------
-- 4) DIAGNOSTICO DIRETO DO PROBLEMA DE ACESSO OWNER
-- --------------------------------------------------------------------------

create or replace function diagnostics.table_exists(p_schema text, p_table text)
returns boolean
language sql
stable
as $$
  select to_regclass(quote_ident(p_schema) || '.' || quote_ident(p_table)) is not null;
$$;

create or replace function diagnostics.safe_table_count(
  p_schema text,
  p_table text,
  p_where_sql text default null
)
returns bigint
language plpgsql
stable
as $$
declare
  v_sql text;
  v_count bigint;
begin
  if not diagnostics.table_exists(p_schema, p_table) then
    return 0;
  end if;

  v_sql := 'select count(*)::bigint from '
    || quote_ident(p_schema) || '.' || quote_ident(p_table)
    || case when p_where_sql is not null and btrim(p_where_sql) <> '' then ' where ' || p_where_sql else '' end;

  execute v_sql into v_count;
  return coalesce(v_count, 0);
end;
$$;

create or replace function diagnostics.safe_owner_access_candidates()
returns table (
  auth_user_id uuid,
  email text,
  nome text,
  profile_empresa_id uuid,
  role_legado text,
  tipo_usuario_v2 text,
  usuarios_v2_empresa_id uuid,
  usuarios_v2_ativo boolean
)
language plpgsql
stable
as $$
declare
  v_sql text;
begin
  v_sql :=
    'select '
    || 'u.id as auth_user_id, '
    || 'u.email, '
    || (case
      when diagnostics.table_exists('public','profiles')
        then 'p.nome'
      else 'null::text'
    end) || ' as nome, '
    || (case
      when diagnostics.table_exists('public','profiles')
        then 'p.empresa_id'
      else 'null::uuid'
    end) || ' as profile_empresa_id, '
    || (case
      when diagnostics.table_exists('public','user_roles')
        then 'ur.role'
      else 'null::text'
    end) || ' as role_legado, '
    || (case
      when diagnostics.table_exists('public','usuarios')
        then 'uv2.tipo_usuario::text'
      else 'null::text'
    end) || ' as tipo_usuario_v2, '
    || (case
      when diagnostics.table_exists('public','usuarios')
        then 'uv2.empresa_id'
      else 'null::uuid'
    end) || ' as usuarios_v2_empresa_id, '
    || (case
      when diagnostics.table_exists('public','usuarios')
        then 'uv2.ativo'
      else 'null::boolean'
    end) || ' as usuarios_v2_ativo '
    || 'from auth.users u '
    || (case
      when diagnostics.table_exists('public','profiles')
        then 'left join public.profiles p on p.id = u.id '
      else ''
    end)
    || (case
      when diagnostics.table_exists('public','user_roles')
        then 'left join lateral ( '
           || 'select role '
           || 'from public.user_roles x '
           || 'where x.user_id = u.id '
           || 'order by x.created_at desc nulls last '
           || 'limit 1 '
           || ') ur on true '
      else ''
    end)
    || (case
      when diagnostics.table_exists('public','usuarios')
        then 'left join public.usuarios uv2 on uv2.id = u.id '
      else ''
    end)
    || 'order by u.email';

  return query execute v_sql;
end;
$$;

create or replace view diagnostics.v_owner_access_health as
select
  now() as checked_at,
  diagnostics.safe_table_count('auth', 'users') as auth_users,
  diagnostics.safe_table_count('auth', 'identities') as auth_identities,
  diagnostics.safe_table_count('auth', 'instances') as auth_instances,
  diagnostics.safe_table_count('public', 'usuarios', 'ativo = true') as usuarios_v2_ativos,
  diagnostics.safe_table_count('public', 'user_roles', 'role in (''SYSTEM_OWNER'',''SYSTEM_ADMIN'')') as roles_owner_legado,
  diagnostics.safe_table_count('public', 'login_attempts', 'blocked_until is not null and blocked_until > now()') as login_blocks_ativos;

create or replace view diagnostics.v_owner_access_candidates as
select *
from diagnostics.safe_owner_access_candidates();

-- --------------------------------------------------------------------------
-- 5) FORENSE AUTH: CAUSA RAIZ DE "DATABASE ERROR QUERYING SCHEMA"
-- --------------------------------------------------------------------------

create or replace function diagnostics.column_exists(
  p_schema text,
  p_table text,
  p_column text
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = p_schema
      and table_name = p_table
      and column_name = p_column
  );
$$;

create or replace view diagnostics.v_auth_missing_critical_tables as
with required_auth_tables(table_name) as (
  values
    ('users'),
    ('identities'),
    ('sessions'),
    ('refresh_tokens'),
    ('instances'),
    ('schema_migrations')
)
select
  'auth'::text as table_schema,
  r.table_name,
  diagnostics.table_exists('auth', r.table_name) as exists_in_db
from required_auth_tables r
order by r.table_name;

create or replace function diagnostics.auth_hook_runtime_diag()
returns table (
  has_auth_custom_hook boolean,
  has_public_custom_hook boolean,
  auth_custom_hook_owner text,
  public_custom_hook_owner text,
  auth_config_exists boolean,
  auth_config_hook_enabled text,
  auth_config_hook_uri text,
  auth_instances_exists boolean,
  auth_instances_rows bigint,
  auth_instances_hook_enabled text,
  auth_instances_hook_uri text,
  auth_hooks_exists boolean,
  auth_hooks_enabled_count bigint,
  read_error text
)
language plpgsql
stable
as $$
declare
  v_err text := null;
  v_cfg_enabled text := null;
  v_cfg_uri text := null;
  v_cfg_sql text;
  v_inst_count bigint := null;
  v_inst_enabled text := null;
  v_inst_uri text := null;
  v_hooks_count bigint := null;
begin
  has_auth_custom_hook := to_regprocedure('auth.custom_access_token_hook(jsonb)') is not null;
  has_public_custom_hook := to_regprocedure('public.custom_access_token_hook(jsonb)') is not null;
  auth_config_exists := diagnostics.table_exists('auth', 'config');
  auth_instances_exists := diagnostics.table_exists('auth', 'instances');
  auth_hooks_exists := diagnostics.table_exists('auth', 'hooks');

  begin
    select pg_get_userbyid(p.proowner)
      into auth_custom_hook_owner
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth'
      and p.proname = 'custom_access_token_hook'
    limit 1;
  exception when others then
    v_err := coalesce(v_err, '') || 'auth_hook_owner:' || SQLERRM || '; ';
  end;

  begin
    select pg_get_userbyid(p.proowner)
      into public_custom_hook_owner
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'custom_access_token_hook'
    limit 1;
  exception when others then
    v_err := coalesce(v_err, '') || 'public_hook_owner:' || SQLERRM || '; ';
  end;

  if auth_config_exists then
    begin
      v_cfg_sql :=
        'select '
        || case
          when diagnostics.column_exists('auth','config','hook_custom_access_token_enabled')
            then 'hook_custom_access_token_enabled::text'
          else 'null::text'
        end
        || ', '
        || case
          when diagnostics.column_exists('auth','config','hook_custom_access_token_uri')
            then 'hook_custom_access_token_uri::text'
          else 'null::text'
        end
        || ' from auth.config limit 1';

      execute v_cfg_sql into v_cfg_enabled, v_cfg_uri;
    exception when others then
      v_err := coalesce(v_err, '') || 'auth_config:' || SQLERRM || '; ';
    end;
  end if;

  if auth_instances_exists then
    begin
      execute 'select count(*)::bigint from auth.instances' into v_inst_count;
      execute $q$
        select
          coalesce(
            nullif((nullif(raw_base_config, '')::jsonb ->> 'HOOK_CUSTOM_ACCESS_TOKEN_ENABLED'), ''),
            nullif((nullif(raw_base_config, '')::jsonb ->> 'hook_custom_access_token_enabled'), '')
          ) as enabled,
          coalesce(
            nullif((nullif(raw_base_config, '')::jsonb ->> 'HOOK_CUSTOM_ACCESS_TOKEN_URI'), ''),
            nullif((nullif(raw_base_config, '')::jsonb ->> 'hook_custom_access_token_uri'), '')
          ) as uri
        from auth.instances
        order by updated_at desc nulls last
        limit 1
      $q$ into v_inst_enabled, v_inst_uri;
    exception when others then
      v_err := coalesce(v_err, '') || 'auth_instances:' || SQLERRM || '; ';
    end;
  end if;

  if auth_hooks_exists and diagnostics.column_exists('auth', 'hooks', 'enabled') then
    begin
      execute 'select count(*)::bigint from auth.hooks where enabled = true' into v_hooks_count;
    exception when others then
      v_err := coalesce(v_err, '') || 'auth_hooks:' || SQLERRM || '; ';
    end;
  end if;

  has_auth_custom_hook := coalesce(has_auth_custom_hook, false);
  has_public_custom_hook := coalesce(has_public_custom_hook, false);
  auth_config_hook_enabled := v_cfg_enabled;
  auth_config_hook_uri := v_cfg_uri;
  auth_instances_rows := v_inst_count;
  auth_instances_hook_enabled := v_inst_enabled;
  auth_instances_hook_uri := v_inst_uri;
  auth_hooks_enabled_count := v_hooks_count;
  read_error := nullif(v_err, '');

  return next;
end;
$$;

create or replace view diagnostics.v_auth_hook_runtime_diag as
select *
from diagnostics.auth_hook_runtime_diag();

create or replace view diagnostics.v_suspect_auth_functions as
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as function_args,
  case
    when pg_get_functiondef(p.oid) ilike '%custom_access_token%' then 'mentions_custom_access_token'
    when pg_get_functiondef(p.oid) ilike '%auth.users%' then 'mentions_auth_users'
    when pg_get_functiondef(p.oid) ilike '%public.usuarios%' then 'mentions_public_usuarios'
    when pg_get_functiondef(p.oid) ilike '%public.user_roles%' then 'mentions_public_user_roles'
    when pg_get_functiondef(p.oid) ilike '%public.profiles%' then 'mentions_public_profiles'
    else 'other'
  end as signal,
  left(pg_get_functiondef(p.oid), 800) as function_def_prefix
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('auth', 'public')
  and (
    p.proname ilike '%hook%'
    or p.proname ilike '%auth%'
    or pg_get_functiondef(p.oid) ilike '%custom_access_token%'
    or pg_get_functiondef(p.oid) ilike '%public.usuarios%'
    or pg_get_functiondef(p.oid) ilike '%public.user_roles%'
    or pg_get_functiondef(p.oid) ilike '%public.profiles%'
  )
order by function_schema, function_name;

create or replace view diagnostics.v_auth_users_triggers as
select
  n.nspname as trigger_schema,
  c.relname as table_name,
  t.tgname as trigger_name,
  p.proname as function_name,
  pg_get_triggerdef(t.oid, true) as trigger_def,
  left(pg_get_functiondef(p.oid), 800) as function_def_prefix
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and n.nspname = 'auth'
  and c.relname = 'users'
order by t.tgname;

commit;

-- ============================================================================
-- COMO USAR
-- ============================================================================
-- 1) SQL completo de recriacao tabela por tabela:
--    select table_schema, table_name, recreate_sql
--    from diagnostics.v_recreate_table_full_sql
--    order by table_schema, table_name;
--
-- 2) Focar apenas tabelas que impactam acesso owner:
--    select *
--    from diagnostics.table_analysis
--    where impacta_acesso_owner = true
--    order by modulo_estimado, table_schema, table_name;
--
-- 3) Estado atual de saude do acesso owner:
--    select * from diagnostics.v_owner_access_health;
--
-- 4) Candidatos e inconsistencias de usuario owner:
--    select * from diagnostics.v_owner_access_candidates;
--
-- 5) Exportar SQL de recriacao para arquivo (SQL Editor ou cliente psql):
--    copy (
--      select recreate_sql
--      from diagnostics.v_recreate_table_full_sql
--      order by table_schema, table_name
--    ) to 'recreate_all_tables.sql';
--
-- 6) Auth forense - tabelas criticas ausentes:
--    select *
--    from diagnostics.v_auth_missing_critical_tables
--    where exists_in_db = false;
--
-- 7) Auth forense - estado de hooks/config/instances:
--    select * from diagnostics.v_auth_hook_runtime_diag;
--
-- 8) Funcoes suspeitas que podem afetar login:
--    select function_schema, function_name, function_args, signal
--    from diagnostics.v_suspect_auth_functions
--    order by function_schema, function_name;
--
-- 9) Triggers em auth.users:
--    select * from diagnostics.v_auth_users_triggers;
-- ============================================================================
