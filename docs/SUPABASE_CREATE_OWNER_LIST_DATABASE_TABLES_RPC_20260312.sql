-- Cria fallback RPC para listar tabelas no Owner/Sistema quando a edge function estiver desatualizada.
-- Data: 2026-03-12

BEGIN;

CREATE OR REPLACE FUNCTION public.owner_list_database_tables(p_empresa_id uuid DEFAULT NULL)
RETURNS TABLE (
  table_name text,
  total_rows bigint,
  has_empresa_id boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  v_total bigint;
  v_has_empresa_id boolean;
  v_can_access boolean := false;
BEGIN
  -- Gate de permissao: apenas operador global
  IF to_regprocedure('public.is_control_plane_operator()') IS NOT NULL THEN
    EXECUTE 'SELECT coalesce(public.is_control_plane_operator(), false)' INTO v_can_access;
  ELSIF to_regprocedure('public.is_master_ti()') IS NOT NULL THEN
    EXECUTE 'SELECT coalesce(public.is_master_ti(), false)' INTO v_can_access;
  ELSIF to_regprocedure('public.has_role(uuid, public.app_role)') IS NOT NULL THEN
    EXECUTE 'SELECT coalesce(public.has_role(auth.uid(), ''MASTER_TI''::public.app_role), false) OR coalesce(public.has_role(auth.uid(), ''SYSTEM_OWNER''::public.app_role), false)'
      INTO v_can_access;
  END IF;

  IF NOT v_can_access THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR t IN
    SELECT it.table_name
    FROM information_schema.tables it
    WHERE it.table_schema = 'public'
      AND it.table_type = 'BASE TABLE'
    ORDER BY it.table_name
  LOOP
    IF p_empresa_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = t.table_name
        AND c.column_name = 'empresa_id'
    ) THEN
      EXECUTE format('SELECT count(*)::bigint FROM public.%I WHERE empresa_id = %L::uuid', t.table_name, p_empresa_id::text) INTO v_total;
    ELSE
      EXECUTE format('SELECT count(*)::bigint FROM public.%I', t.table_name) INTO v_total;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = t.table_name
        AND c.column_name = 'empresa_id'
    ) INTO v_has_empresa_id;

    table_name := t.table_name;
    total_rows := coalesce(v_total, 0);
    has_empresa_id := coalesce(v_has_empresa_id, false);
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.owner_list_database_tables(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_list_database_tables(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_list_database_tables(uuid) TO service_role;

COMMIT;
