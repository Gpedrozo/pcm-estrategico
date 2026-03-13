-- Inventario tecnico de multi-tenant (fase 1)
-- Data: 2026-03-12
-- Objetivo: classificar tabelas em data plane/control plane e identificar gaps de empresa_id e RLS.

-- 1) Todas as tabelas base do schema public
WITH tables AS (
  SELECT
    t.table_schema,
    t.table_name
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
),
columns_flags AS (
  SELECT
    c.table_schema,
    c.table_name,
    bool_or(c.column_name = 'empresa_id') AS has_empresa_id,
    bool_or(c.column_name = 'created_by') AS has_created_by,
    bool_or(c.column_name = 'updated_by') AS has_updated_by,
    bool_or(c.column_name = 'created_at') AS has_created_at,
    bool_or(c.column_name = 'updated_at') AS has_updated_at
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  GROUP BY c.table_schema, c.table_name
),
rls_flags AS (
  SELECT
    n.nspname AS table_schema,
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
),
policy_flags AS (
  SELECT
    p.schemaname AS table_schema,
    p.tablename AS table_name,
    count(*)::int AS policy_count,
    bool_or(lower(coalesce(p.qual, '')) = 'true') AS has_permissive_true_qual,
    bool_or(lower(coalesce(p.with_check, '')) = 'true') AS has_permissive_true_check
  FROM pg_policies p
  WHERE p.schemaname = 'public'
  GROUP BY p.schemaname, p.tablename
)
SELECT
  t.table_name,
  COALESCE(cf.has_empresa_id, false) AS has_empresa_id,
  COALESCE(rf.rls_enabled, false) AS rls_enabled,
  COALESCE(rf.rls_forced, false) AS rls_forced,
  COALESCE(pf.policy_count, 0) AS policy_count,
  COALESCE(pf.has_permissive_true_qual, false) AS has_permissive_true_qual,
  COALESCE(pf.has_permissive_true_check, false) AS has_permissive_true_check,
  COALESCE(cf.has_created_by, false) AS has_created_by,
  COALESCE(cf.has_updated_by, false) AS has_updated_by,
  COALESCE(cf.has_created_at, false) AS has_created_at,
  COALESCE(cf.has_updated_at, false) AS has_updated_at,
  CASE
    WHEN t.table_name IN ('empresas', 'subscription_plans', 'billing_catalog', 'feature_catalog') THEN 'control_plane_global'
    WHEN COALESCE(cf.has_empresa_id, false) THEN 'data_plane_tenant'
    ELSE 'needs_classification'
  END AS tenant_class,
  CASE
    WHEN COALESCE(cf.has_empresa_id, false) AND NOT COALESCE(rf.rls_enabled, false) THEN 'CRITICO: tenant sem RLS'
    WHEN COALESCE(pf.has_permissive_true_qual, false) OR COALESCE(pf.has_permissive_true_check, false) THEN 'CRITICO: policy permissiva true'
    WHEN COALESCE(cf.has_empresa_id, false) AND COALESCE(pf.policy_count, 0) = 0 THEN 'ALTO: tenant sem policies'
    WHEN NOT COALESCE(cf.has_empresa_id, false) THEN 'ANALISAR: sem empresa_id'
    ELSE 'OK_BASE'
  END AS status
FROM tables t
LEFT JOIN columns_flags cf
  ON cf.table_schema = t.table_schema
 AND cf.table_name = t.table_name
LEFT JOIN rls_flags rf
  ON rf.table_schema = t.table_schema
 AND rf.table_name = t.table_name
LEFT JOIN policy_flags pf
  ON pf.table_schema = t.table_schema
 AND pf.table_name = t.table_name
ORDER BY
  CASE
    WHEN COALESCE(cf.has_empresa_id, false) AND NOT COALESCE(rf.rls_enabled, false) THEN 1
    WHEN COALESCE(pf.has_permissive_true_qual, false) OR COALESCE(pf.has_permissive_true_check, false) THEN 2
    WHEN COALESCE(cf.has_empresa_id, false) AND COALESCE(pf.policy_count, 0) = 0 THEN 3
    WHEN NOT COALESCE(cf.has_empresa_id, false) THEN 4
    ELSE 5
  END,
  t.table_name;

-- 2) FKs potencialmente perigosas para isolamento (referencias sem empresa_id no par)
WITH fk_pairs AS (
  SELECT
    con.oid,
    con.conname,
    src_ns.nspname AS src_schema,
    src.relname AS src_table,
    tgt_ns.nspname AS tgt_schema,
    tgt.relname AS tgt_table,
    con.conkey,
    con.confkey
  FROM pg_constraint con
  JOIN pg_class src ON src.oid = con.conrelid
  JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
  JOIN pg_class tgt ON tgt.oid = con.confrelid
  JOIN pg_namespace tgt_ns ON tgt_ns.oid = tgt.relnamespace
  WHERE con.contype = 'f'
    AND src_ns.nspname = 'public'
    AND tgt_ns.nspname = 'public'
),
fk_cols AS (
  SELECT
    f.oid,
    f.conname,
    f.src_table,
    f.tgt_table,
    EXISTS (
      SELECT 1
      FROM unnest(f.conkey) AS a(attnum)
      JOIN pg_attribute pa ON pa.attrelid = (SELECT oid FROM pg_class WHERE relname = f.src_table AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
                         AND pa.attnum = a.attnum
      WHERE pa.attname = 'empresa_id'
    ) AS src_has_empresa_id_in_fk,
    EXISTS (
      SELECT 1
      FROM unnest(f.confkey) AS a(attnum)
      JOIN pg_attribute pa ON pa.attrelid = (SELECT oid FROM pg_class WHERE relname = f.tgt_table AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
                         AND pa.attnum = a.attnum
      WHERE pa.attname = 'empresa_id'
    ) AS tgt_has_empresa_id_in_fk
  FROM fk_pairs f
)
SELECT
  conname,
  src_table,
  tgt_table,
  src_has_empresa_id_in_fk,
  tgt_has_empresa_id_in_fk,
  CASE
    WHEN src_has_empresa_id_in_fk AND tgt_has_empresa_id_in_fk THEN 'OK_COMPOSTA_TENANT'
    ELSE 'REVISAR_FK_ISOLAMENTO'
  END AS status
FROM fk_cols
ORDER BY
  CASE WHEN src_has_empresa_id_in_fk AND tgt_has_empresa_id_in_fk THEN 2 ELSE 1 END,
  src_table,
  tgt_table,
  conname;

-- 3) Resumo executivo
WITH base AS (
  SELECT
    COALESCE(cf.has_empresa_id, false) AS has_empresa_id,
    COALESCE(rf.rls_enabled, false) AS rls_enabled
  FROM information_schema.tables t
  LEFT JOIN (
    SELECT
      c.table_schema,
      c.table_name,
      bool_or(c.column_name = 'empresa_id') AS has_empresa_id
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    GROUP BY c.table_schema, c.table_name
  ) cf
    ON cf.table_schema = t.table_schema
   AND cf.table_name = t.table_name
  LEFT JOIN (
    SELECT
      n.nspname AS table_schema,
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  ) rf
    ON rf.table_schema = t.table_schema
   AND rf.table_name = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
)
SELECT
  count(*)::int AS total_tabelas,
  count(*) FILTER (WHERE has_empresa_id)::int AS tabelas_com_empresa_id,
  count(*) FILTER (WHERE has_empresa_id AND rls_enabled)::int AS tabelas_tenant_com_rls,
  count(*) FILTER (WHERE has_empresa_id AND NOT rls_enabled)::int AS tabelas_tenant_sem_rls,
  count(*) FILTER (WHERE NOT has_empresa_id)::int AS tabelas_sem_empresa_id
FROM base;
