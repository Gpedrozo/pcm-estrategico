-- TENANT VALIDACAO OPERACIONAL
-- Data: 2026-03-12
-- Objetivo: validar cobertura de empresa_id, integridade referencial e isolamento RLS.

-- 1) Tabelas public sem coluna empresa_id (exceto tabelas globais conhecidas)
WITH public_tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
), allowed_global AS (
  SELECT unnest(ARRAY[
    'schema_migrations',
    'empresas',
    'enterprise_companies',
    'rbac_roles',
    'rbac_permissions',
    'rbac_role_permissions'
  ]) AS table_name
)
SELECT t.table_name
FROM public_tables t
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = t.table_name
 AND c.column_name = 'empresa_id'
LEFT JOIN allowed_global g
  ON g.table_name = t.table_name
WHERE c.column_name IS NULL
  AND g.table_name IS NULL
ORDER BY t.table_name;

-- 2) Tabelas com empresa_id que aceitam NULL (risco de vazamento multi-tenant)
SELECT c.table_name
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name = 'empresa_id'
  AND c.is_nullable = 'YES'
ORDER BY c.table_name;

-- 3) Tabelas com empresa_id sem FK para empresas/enterprise_companies
SELECT c.table_name
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name = 'empresa_id'
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.key_column_usage k
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = k.constraint_name
     AND tc.table_schema = k.table_schema
    JOIN information_schema.constraint_column_usage u
      ON u.constraint_name = tc.constraint_name
     AND u.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND k.table_schema = c.table_schema
      AND k.table_name = c.table_name
      AND k.column_name = 'empresa_id'
      AND u.table_schema = 'public'
      AND u.table_name IN ('empresas', 'enterprise_companies')
      AND u.column_name = 'id'
  )
ORDER BY c.table_name;

-- 4) Linhas orfas por empresa_id (sem correspondencia de empresa)
DO $$
DECLARE
  r RECORD;
  orphan_count bigint;
BEGIN
  RAISE NOTICE '--- ORFAOS empresa_id ---';

  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'empresa_id'
      AND c.table_name NOT IN ('empresas', 'enterprise_companies')
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I t LEFT JOIN public.empresas e ON e.id = t.empresa_id WHERE t.empresa_id IS NOT NULL AND e.id IS NULL',
      r.table_name
    ) INTO orphan_count;

    IF orphan_count > 0 THEN
      RAISE NOTICE 'Tabela % possui % orfaos em relacao a public.empresas', r.table_name, orphan_count;
    END IF;
  END LOOP;
END $$;

-- 5) Tabelas public sem RLS habilitado
SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname NOT IN ('schema_migrations')
  AND c.relrowsecurity = false
ORDER BY c.relname;

-- 6) Politicas muito permissivas (qual/with_check TRUE)
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    coalesce(trim(qual), '') IN ('true', '(true)')
    OR coalesce(trim(with_check), '') IN ('true', '(true)')
  )
ORDER BY tablename, policyname;

-- 6.1) Checagem rapida das policies permissivas mapeadas no incidente atual
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (tablename = 'ai_root_cause_analysis' AND policyname IN (
      'Authenticated users can create ai analysis',
      'Authenticated users can delete ai analysis',
      'Authenticated users can view ai analysis'
    ))
    OR (tablename = 'empresa_config' AND policyname = 'empresa_config_domain_lookup_public')
  )
ORDER BY tablename, policyname;

-- 6.2) Checagem de policies tenant-safe esperadas (deve retornar as linhas esperadas)
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (tablename = 'ai_root_cause_analysis' AND policyname IN ('tenant_isolation', 'master_ti_global_access'))
    OR (tablename = 'empresa_config' AND policyname = 'empresa_config_tenant_or_master')
  )
ORDER BY tablename, policyname;

-- 7) Integridade padrao (se funcao existir)
-- Esperado: zero linhas para ambiente saudavel.
-- Em ambientes sem a funcao, a etapa retorna vazio e segue o script.
DROP TABLE IF EXISTS tmp_weekly_tenant_integrity;

DO $$
BEGIN
  IF to_regprocedure('public.weekly_tenant_integrity_check()') IS NOT NULL THEN
    EXECUTE 'CREATE TEMP TABLE tmp_weekly_tenant_integrity AS SELECT * FROM public.weekly_tenant_integrity_check()';
  ELSE
    EXECUTE 'CREATE TEMP TABLE tmp_weekly_tenant_integrity (table_name text, issue_type text, issue_count bigint)';
    RAISE NOTICE 'Funcao public.weekly_tenant_integrity_check() nao encontrada. Etapa 7 retornara vazio.';
  END IF;
END $$;

SELECT *
FROM tmp_weekly_tenant_integrity
ORDER BY table_name, issue_type;

-- 8) Sanidade minima para exclusao de empresa: dependencias em profiles
-- Substitua o UUID abaixo pela empresa alvo.
-- SELECT id, email, empresa_id FROM public.profiles WHERE empresa_id = '00000000-0000-0000-0000-000000000000'::uuid;
