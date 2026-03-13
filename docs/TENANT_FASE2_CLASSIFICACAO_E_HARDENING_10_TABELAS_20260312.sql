-- Fase 2: Classificacao e hardening das tabelas sem empresa_id
-- Data: 2026-03-12
-- Contexto atual informado: 60 total / 50 com empresa_id / 50 com RLS / 10 sem empresa_id
-- Objetivo: decidir com evidencia quais 10 tabelas sao control plane (globais) e quais devem virar tenant data plane.

BEGIN;

-- 1) Inventario detalhado das tabelas sem empresa_id
WITH table_flags AS (
  SELECT
    t.table_name,
    c.oid AS table_oid,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    COALESCE(p.policy_count, 0) AS policy_count
  FROM information_schema.tables t
  JOIN pg_class c
    ON c.relname = t.table_name
   AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LEFT JOIN (
    SELECT
      tablename,
      count(*)::int AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  ) p
    ON p.tablename = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns ic
      WHERE ic.table_schema = 'public'
        AND ic.table_name = t.table_name
        AND ic.column_name = 'empresa_id'
    )
)
SELECT
  tf.table_name,
  tf.rls_enabled,
  tf.rls_forced,
  tf.policy_count,
  COALESCE(pc.rows_estimate, 0) AS rows_estimate,
  COALESCE(deps.ref_by_tenant_tables, 0) AS referenced_by_tenant_tables,
  CASE
    WHEN tf.table_name IN ('empresas', 'subscription_plans', 'billing_catalog', 'feature_catalog') THEN 'CONTROL_PLANE_GLOBAL_CANDIDATE'
    WHEN COALESCE(deps.ref_by_tenant_tables, 0) > 0 THEN 'REVIEW_STRONG: referenced_by_tenant'
    ELSE 'REVIEW_MANUAL'
  END AS recommendation
FROM table_flags tf
LEFT JOIN (
  SELECT
    relname AS table_name,
    reltuples::bigint AS rows_estimate
  FROM pg_class
  WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
) pc
  ON pc.table_name = tf.table_name
LEFT JOIN (
  SELECT
    tgt.relname AS tgt_table,
    count(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM information_schema.columns c2
        WHERE c2.table_schema = 'public'
          AND c2.table_name = src.relname
          AND c2.column_name = 'empresa_id'
      )
    )::int AS ref_by_tenant_tables
  FROM pg_constraint con
  JOIN pg_class src ON src.oid = con.conrelid
  JOIN pg_class tgt ON tgt.oid = con.confrelid
  JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
  JOIN pg_namespace tgt_ns ON tgt_ns.oid = tgt.relnamespace
  WHERE con.contype = 'f'
    AND src_ns.nspname = 'public'
    AND tgt_ns.nspname = 'public'
  GROUP BY tgt.relname
) deps
  ON deps.tgt_table = tf.table_name
ORDER BY tf.table_name;

-- 1.1) Proposta automatica de decisao para as tabelas sem empresa_id
-- Regra: tabelas explicitamente globais ficam KEEP_GLOBAL; demais vao para revisao humana.
WITH without_empresa AS (
  SELECT
    t.table_name,
    COALESCE(pc.reltuples::bigint, 0) AS rows_estimate,
    COALESCE(deps.ref_by_tenant_tables, 0) AS referenced_by_tenant_tables
  FROM information_schema.tables t
  LEFT JOIN pg_class pc
    ON pc.relname = t.table_name
   AND pc.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LEFT JOIN (
    SELECT
      tgt.relname AS tgt_table,
      count(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM information_schema.columns c2
          WHERE c2.table_schema = 'public'
            AND c2.table_name = src.relname
            AND c2.column_name = 'empresa_id'
        )
      )::int AS ref_by_tenant_tables
    FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    JOIN pg_class tgt ON tgt.oid = con.confrelid
    JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
    JOIN pg_namespace tgt_ns ON tgt_ns.oid = tgt.relnamespace
    WHERE con.contype = 'f'
      AND src_ns.nspname = 'public'
      AND tgt_ns.nspname = 'public'
    GROUP BY tgt.relname
  ) deps
    ON deps.tgt_table = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns ic
      WHERE ic.table_schema = 'public'
        AND ic.table_name = t.table_name
        AND ic.column_name = 'empresa_id'
    )
)
SELECT
  w.table_name,
  w.rows_estimate,
  w.referenced_by_tenant_tables,
  CASE
    WHEN w.table_name IN (
      'empresas',
      'subscription_plans',
      'billing_catalog',
      'feature_catalog',
      'rate_limits',
      'security_logs'
    ) THEN 'KEEP_GLOBAL'
    ELSE 'REVIEW_MANUAL'
  END AS suggested_decision,
  CASE
    WHEN w.table_name IN ('empresas') THEN 'cadastro mestre de tenants'
    WHEN w.table_name IN ('subscription_plans', 'billing_catalog', 'feature_catalog') THEN 'catalogo/plano global da plataforma'
    WHEN w.table_name IN ('rate_limits', 'security_logs') THEN 'telemetria/seguranca de plataforma'
    WHEN w.referenced_by_tenant_tables > 0 THEN 'referenciada por tabelas tenant; exige revisao de modelagem'
    ELSE 'avaliar se dado e operacional de tenant; se sim, migrar para empresa_id'
  END AS rationale
FROM without_empresa w
ORDER BY w.table_name;

-- 2) Mapa de dependencias para planejar migracao segura
SELECT
  con.conname,
  src.relname AS src_table,
  tgt.relname AS tgt_table
FROM pg_constraint con
JOIN pg_class src ON src.oid = con.conrelid
JOIN pg_class tgt ON tgt.oid = con.confrelid
JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
JOIN pg_namespace tgt_ns ON tgt_ns.oid = tgt.relnamespace
WHERE con.contype = 'f'
  AND src_ns.nspname = 'public'
  AND tgt_ns.nspname = 'public'
  AND (
    NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = src.relname AND c.column_name = 'empresa_id'
    )
    OR NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = tgt.relname AND c.column_name = 'empresa_id'
    )
  )
ORDER BY src.relname, tgt.relname, con.conname;

-- 3) Tabela temporaria de decisao (preencher manualmente com resultado da analise)
CREATE TEMP TABLE tenant_classification_decision (
  table_name text PRIMARY KEY,
  decision text NOT NULL CHECK (decision IN ('KEEP_GLOBAL', 'MIGRATE_TO_TENANT')),
  justification text NOT NULL
);

-- EXEMPLO de preenchimento (ajustar para o seu ambiente real):
-- INSERT INTO tenant_classification_decision (table_name, decision, justification) VALUES
-- ('empresas', 'KEEP_GLOBAL', 'Tabela de cadastro mestre de tenants'),
-- ('alguma_tabela', 'MIGRATE_TO_TENANT', 'Dados de negocio por empresa');

-- 4) Gerador de comandos para tabelas que serao migradas para tenant
-- Este bloco NAO executa alteracoes; apenas gera SQL para revisao.
SELECT format(
  'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS empresa_id uuid;',
  d.table_name
) AS generated_sql
FROM tenant_classification_decision d
WHERE d.decision = 'MIGRATE_TO_TENANT'
UNION ALL
SELECT format(
  'CREATE INDEX IF NOT EXISTS idx_%I_empresa_id ON public.%I (empresa_id);',
  d.table_name,
  d.table_name
)
FROM tenant_classification_decision d
WHERE d.decision = 'MIGRATE_TO_TENANT'
UNION ALL
SELECT format(
  'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;',
  d.table_name
)
FROM tenant_classification_decision d
WHERE d.decision = 'MIGRATE_TO_TENANT'
UNION ALL
SELECT format(
  'DROP POLICY IF EXISTS %I_tenant_isolation ON public.%I;',
  d.table_name,
  d.table_name
)
FROM tenant_classification_decision d
WHERE d.decision = 'MIGRATE_TO_TENANT'
UNION ALL
SELECT format(
  'CREATE POLICY %I_tenant_isolation ON public.%I FOR ALL USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id());',
  d.table_name,
  d.table_name
)
FROM tenant_classification_decision d
WHERE d.decision = 'MIGRATE_TO_TENANT';

-- 5) Query de validacao final apos aplicar migracoes
WITH base AS (
  SELECT
    t.table_name,
    EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = t.table_name
        AND c.column_name = 'empresa_id'
    ) AS has_empresa_id,
    COALESCE(c.relrowsecurity, false) AS rls_enabled
  FROM information_schema.tables t
  LEFT JOIN pg_class c
    ON c.relname = t.table_name
   AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
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

ROLLBACK;
