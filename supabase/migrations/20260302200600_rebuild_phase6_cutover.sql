-- FASE 6 - CUTOVER FINAL E LIMPEZA DE LEGADO

BEGIN;

-- Após validação total dos módulos no schema v2, remover estruturas legadas.
DROP VIEW IF EXISTS public.auditoria_logs;
DROP VIEW IF EXISTS public.auditoria;

-- Bloqueio de regressão: impedir recriação inadvertida de tabela legada de auditoria.
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

DROP EVENT TRIGGER IF EXISTS trg_prevent_legacy_auditoria;
CREATE EVENT TRIGGER trg_prevent_legacy_auditoria
ON ddl_command_end
EXECUTE FUNCTION public.prevent_legacy_auditoria_table();

COMMIT;
