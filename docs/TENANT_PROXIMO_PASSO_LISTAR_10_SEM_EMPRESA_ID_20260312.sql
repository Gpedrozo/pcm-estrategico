-- Proximo passo objetivo: listar as 10 tabelas sem empresa_id
-- Data: 2026-03-12

-- 1) Lista exata das tabelas sem empresa_id
SELECT
  t.table_name,
  COALESCE(c.reltuples::bigint, 0) AS rows_estimate,
  COALESCE(c.relrowsecurity, false) AS rls_enabled
FROM information_schema.tables t
LEFT JOIN pg_class c
  ON c.relname = t.table_name
 AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns ic
    WHERE ic.table_schema = 'public'
      AND ic.table_name = t.table_name
      AND ic.column_name = 'empresa_id'
  )
ORDER BY t.table_name;

-- 2) Proposta inicial de classificacao (ajustar manualmente conforme negocio)
WITH without_empresa AS (
  SELECT t.table_name
  FROM information_schema.tables t
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
  CASE
    WHEN w.table_name IN ('empresas', 'subscription_plans', 'billing_catalog', 'feature_catalog', 'rate_limits', 'security_logs') THEN 'KEEP_GLOBAL'
    ELSE 'REVIEW_MANUAL'
  END AS suggested_decision,
  CASE
    WHEN w.table_name = 'empresas' THEN 'cadastro mestre de tenants'
    WHEN w.table_name IN ('subscription_plans', 'billing_catalog', 'feature_catalog') THEN 'catalogos globais de plataforma'
    WHEN w.table_name IN ('rate_limits', 'security_logs') THEN 'telemetria/seguranca global'
    ELSE 'avaliar se pertence a operacao de tenant; se sim, migrar para empresa_id'
  END AS rationale
FROM without_empresa w
ORDER BY w.table_name;
