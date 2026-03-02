-- FASE 0/6 - LIMPEZA CONTROLADA DO BACKEND (PROJETO)
-- Execute no SQL Editor do Supabase para remover objetos do projeto no schema public/analytics.
-- Não remove schemas auth, storage, realtime, extensions.

BEGIN;

DROP SCHEMA IF EXISTS analytics CASCADE;

DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT schemaname, matviewname AS obj
    FROM pg_matviews
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I CASCADE', v.schemaname, v.obj);
  END LOOP;

  FOR v IN
    SELECT schemaname, viewname AS obj
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname NOT IN ('geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
  LOOP
    EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', v.schemaname, v.obj);
  END LOOP;

  FOR v IN
    SELECT n.nspname AS schema_name, p.proname AS fn_name, oidvectortypes(p.proargtypes) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', v.schema_name, v.fn_name, v.args);
  END LOOP;

  FOR v IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', v.schemaname, v.tablename);
  END LOOP;

  FOR v IN
    SELECT sequence_schema, sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS %I.%I CASCADE', v.sequence_schema, v.sequence_name);
  END LOOP;
END $$;

COMMIT;
