-- FASE 8 - LIMPEZA DEFINITIVA DE LEGADO (PÓS-REFACTOR)
-- Remove objetos legados que não são mais usados pelo sistema refatorado.

BEGIN;

-- Desliga temporariamente o bloqueio para permitir limpeza inicial de legado
DROP EVENT TRIGGER IF EXISTS trg_prevent_legacy_auditoria;

-- Remover views de compatibilidade legadas
DROP VIEW IF EXISTS public.auditoria_logs;
DROP VIEW IF EXISTS public.auditoria;

-- Remover triggers antigos que apontam para registrar_auditoria
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name, t.tgname AS trigger_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND p.proname = 'registrar_auditoria'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', r.trigger_name, r.schema_name, r.table_name);
  END LOOP;
END
$$;

-- Remover função legado de auditoria (se existir)
DROP FUNCTION IF EXISTS public.registrar_auditoria() CASCADE;

-- Remover tabelas legadas de auditoria
DROP TABLE IF EXISTS public.auditoria_logs;
DROP TABLE IF EXISTS public.auditoria;

-- Reativar bloqueio anti-regressão para impedir volta de objetos legados
CREATE OR REPLACE FUNCTION public.prevent_legacy_auditoria_table()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF lower(cmd.object_identity) LIKE '%public.auditoria%' THEN
      RAISE EXCEPTION 'Tabela/objeto legado auditoria é proibido no backend v2';
    END IF;
  END LOOP;
END;
$$;

CREATE EVENT TRIGGER trg_prevent_legacy_auditoria
ON ddl_command_end
EXECUTE FUNCTION public.prevent_legacy_auditoria_table();

COMMIT;

-- Smoke check pós-limpeza
SELECT to_regclass('public.auditoria') AS legacy_auditoria;
SELECT to_regclass('public.auditoria_logs') AS legacy_auditoria_logs;
SELECT proname FROM pg_proc WHERE proname = 'registrar_auditoria';
